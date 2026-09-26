import { readFile } from 'node:fs/promises';
import { admin, data } from './db.mjs';
import { YtDlpTranscriptProvider } from './transcripts/ytdlp.mjs';
import { validateAnalysis, validateQuestion } from './validate.mjs';

const videoId=process.argv[2],analysisPath=process.argv[3];
if(!/^[A-Za-z0-9_-]{11}$/.test(videoId||'')||!analysisPath)throw new Error('사용법: node automation/commit.mjs VIDEO_ID analysis.json');
const candidates=JSON.parse(await readFile(new URL('./out/candidates.json',import.meta.url),'utf8'));
const candidate=candidates.find(x=>x.youtube_video_id===videoId); if(!candidate)throw new Error('후보 목록에 영상이 없습니다');
const analysis=JSON.parse(await readFile(analysisPath,'utf8'));
const db=admin(); const topics=data(await db.from('education_topics').select('id,slug').eq('active',true));
const topicMap=new Map(topics.map(x=>[x.slug,x.id]));
const errors=validateAnalysis(analysis,new Set(topicMap.keys()));
const transcript=await new YtDlpTranscriptProvider().getTranscript(videoId);
if(!transcript)errors.push('한국어 자막을 다시 확보하지 못했습니다');
const valid=[];
for(const [i,q] of (Array.isArray(analysis.questions)?analysis.questions:[]).entries()) {
  const failures=transcript?validateQuestion(q,transcript.segments):['자막 없음'];
  if(failures.length) process.stderr.write(`문제 ${i+1} 제외: ${failures.join(', ')}\n`);
  else valid.push({...q,sort_order:i+1});
}
if(!valid.length)errors.push('검증 통과 문제가 없습니다');
if(errors.length)throw new Error(errors.join('; '));
const prior=data(await db.from('videos').select('id').eq('youtube_video_id',videoId).maybeSingle());
if(prior)throw new Error('이미 등록된 youtube_video_id입니다. 기존 영상을 덮어쓰지 않습니다.');
const job=data(await db.from('job_runs').insert({job_type:'codex_review_candidate',status:'running',discovered_count:1}).select('id').single());
let video;
try {
  const row={youtube_video_id:videoId,channel_id:candidate.channel_id,title:candidate.title,video_url:candidate.video_url,
    thumbnail_url:candidate.thumbnail_url,upload_date:candidate.upload_date,duration_seconds:candidate.duration_seconds,
    description:candidate.description,summary:analysis.summary,key_concepts:analysis.key_concepts,
    recommended_grade_bands:analysis.recommended_grade_bands,usage_types:analysis.usage_types,
    freshness_type:analysis.freshness_type,caption_status:'processed',review_status:'needs_review',
    elementary_fit:analysis.elementary_fit,educational_value:analysis.educational_value,
    engagement:analysis.engagement,factual_reliability:analysis.factual_reliability,
    evaluation_note:analysis.reason||null,published:false};
  video=data(await db.from('videos').insert(row).select('id').single());
  data(await db.from('video_topics').insert(analysis.topics.map(x=>({video_id:video.id,topic_id:topicMap.get(x.slug),match_score:x.confidence??null,match_reason:x.reason,reviewed:false}))));
  data(await db.from('questions').insert(valid.map(q=>({video_id:video.id,question_text:q.question_text,answer:q.answer,
    evidence_text:q.evidence_text,evidence_start_seconds:q.evidence_start_seconds,evidence_end_seconds:q.evidence_end_seconds,
    validation_status:'auto_passed',generation_type:'auto',sort_order:q.sort_order,published:false}))));
  data(await db.from('job_runs').update({status:'success',finished_at:new Date().toISOString(),processed_count:1,metadata:{youtube_video_id:videoId,questions_saved:valid.length}}).eq('id',job.id));
  process.stdout.write(`영상 ${videoId}: 검증 통과 ${valid.length}문제, needs_review 비공개 저장\n`);
} catch(e) {
  if(video)await db.from('videos').delete().eq('id',video.id); // 부분 저장 정리
  await db.from('job_runs').update({status:'failed',finished_at:new Date().toISOString(),failed_count:1,error_message:String(e.message).slice(0,500)}).eq('id',job.id);
  throw e;
}
