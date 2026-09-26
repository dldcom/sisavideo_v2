export const BLANK='@@BLANK@@';
const normalize = text => text.normalize('NFKC').replace(/\s+/g,' ').trim();
const compact = text => normalize(text).replace(/\s/g,'');
export function validateQuestion(question, segments) {
  const errors=[];
  for(const key of ['question_text','answer','evidence_text','evidence_start_seconds','evidence_end_seconds']) if(question[key]===undefined||question[key]===null||question[key]==='') errors.push(`${key} 누락`);
  if(errors.length) return errors;
  if(question.question_text.split(BLANK).length!==2) errors.push('빈칸은 정확히 하나여야 합니다');
  if(!Number.isFinite(question.evidence_start_seconds)||!Number.isFinite(question.evidence_end_seconds)||question.evidence_start_seconds<0||question.evidence_end_seconds<=question.evidence_start_seconds) errors.push('근거 시각이 잘못되었습니다');
  if(!compact(question.evidence_text).includes(compact(question.answer))) errors.push('정답이 근거 문장에 없습니다');
  const relevant=segments.filter(s=>s.start < question.evidence_end_seconds+0.1 && s.start+s.duration >= question.evidence_start_seconds-0.1);
  const transcript=compact(relevant.map(s=>s.text).join(' '));
  if(!transcript.includes(compact(question.evidence_text))) errors.push('근거 문장이 해당 시간대 자막에 없습니다');
  if(question.semantic_validation?.passes!==true||!normalize(question.semantic_validation?.reason||'')) errors.push('Codex 의미 검증 결과가 없습니다');
  return errors;
}
export function validateAnalysis(analysis, topics) {
  const errors=[];
  for(const key of ['elementary_fit','educational_value','engagement','factual_reliability']) if(!Number.isInteger(analysis[key])||analysis[key]<1||analysis[key]>5) errors.push(`${key}: 1~5 점수가 필요합니다`);
  if(!normalize(analysis.summary||'')) errors.push('summary 누락');
  if(!Array.isArray(analysis.key_concepts)||!analysis.key_concepts.length) errors.push('key_concepts 누락');
  if(!Array.isArray(analysis.recommended_grade_bands)||!analysis.recommended_grade_bands.length||analysis.recommended_grade_bands.some(x=>!['1-2','3-4','5-6'].includes(x))) errors.push('recommended_grade_bands 오류');
  if(!Array.isArray(analysis.usage_types)||!analysis.usage_types.length||analysis.usage_types.some(x=>!['concept','hook','real_case','news_case','discussion','extension'].includes(x))) errors.push('usage_types 오류');
  if(!['evergreen','policy_sensitive','law_sensitive','technology_sensitive'].includes(analysis.freshness_type)) errors.push('freshness_type 오류');
  if(!Array.isArray(analysis.topics)||!analysis.topics.length||analysis.topics.some(x=>!topics.has(x.slug)||typeof x.reason!=='string'||!x.reason.trim())) errors.push('topics 오류');
  if(!Array.isArray(analysis.questions)||!analysis.questions.length) errors.push('questions 누락');
  if(analysis.decision!=='needs_review') errors.push('decision은 needs_review여야 합니다');
  return errors;
}
