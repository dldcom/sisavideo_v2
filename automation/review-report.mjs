import { mkdir, writeFile } from 'node:fs/promises';
import { admin, data } from './db.mjs';

const db=admin();
const videos=data(await db.from('videos').select(
  'id,youtube_video_id,title,summary,recommended_grade_bands,evaluation_note,review_status,published,channel_id'
).eq('review_status','needs_review').order('created_at'));
const ids=videos.map(video=>video.id);
const channels=ids.length?data(await db.from('channels').select('id,channel_name,source_type')
  .in('id',[...new Set(videos.map(video=>video.channel_id))])):[];
const links=ids.length?data(await db.from('video_topics').select('video_id,topic_id').in('video_id',ids)):[];
const questions=ids.length?data(await db.from('questions').select(
  'id,video_id,question_text,answer,evidence_text,evidence_start_seconds,evidence_end_seconds,validation_status,teacher_review_status,published,sort_order'
).in('video_id',ids).order('sort_order')):[];
const topicIds=[...new Set(links.map(link=>link.topic_id))];
const topics=topicIds.length?data(await db.from('education_topics').select('id,name,slug').in('id',topicIds)):[];
const channelById=new Map(channels.map(channel=>[channel.id,channel]));
const topicById=new Map(topics.map(topic=>[topic.id,topic]));
const plain=value=>String(value??'').replace(/\s+/g,' ').trim();
const timestamp=seconds=>{
  const total=Math.floor(Number(seconds));
  return `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`;
};

const lines=[
  '# 교사 검수용 영상·문제 목록',
  '',
  `생성: ${new Date().toISOString()} · 검수 대기 영상 ${videos.length}개 · 문제 ${questions.length}개`,
  '',
  '각 근거 링크에서 실제 영상의 음성과 화면을 확인하세요. 자막 자동 검증은 발화 정확성·초등 적합성 검수를 대신하지 않습니다.',
  '이 파일에는 전체 자막이나 영상 파일이 없습니다. Supabase의 공개 상태는 이 보고서 생성으로 바뀌지 않습니다.',
  ''
];
for(const video of videos){
  const url=`https://www.youtube.com/watch?v=${video.youtube_video_id}`;
  const channel=channelById.get(video.channel_id);
  const videoTopics=links.filter(link=>link.video_id===video.id).map(link=>topicById.get(link.topic_id)?.name).filter(Boolean);
  const videoQuestions=questions.filter(question=>question.video_id===video.id);
  lines.push(`## ${plain(video.title)}`,'',
    `- [영상 전체 보기](${url}) · YouTube ID: \`${video.youtube_video_id}\``,
    `- 채널: ${plain(channel?.channel_name)} · 출처 유형: ${plain(channel?.source_type)}`,
    `- 교육주제: ${videoTopics.join(', ')||'미분류'} · 권장 학년대: ${(video.recommended_grade_bands||[]).join(', ')}`,
    `- DB 상태: \`${video.review_status}\` · 공개: \`${video.published}\``,
    `- 요약: ${plain(video.summary)}`,
    `- 검토 사항: ${plain(video.evaluation_note)}`,'');
  for(const [index,question] of videoQuestions.entries()){
    const start=Math.floor(Number(question.evidence_start_seconds));
    lines.push(`### 문제 ${index+1}`,'',
      `- 문항: ${plain(question.question_text).replaceAll('@@BLANK@@','______')}`,
      `- 정답: **${plain(question.answer)}**`,
      `- [근거 구간 보기](${url}&t=${start}s) · ${timestamp(question.evidence_start_seconds)}–${timestamp(question.evidence_end_seconds)}`,
      `- 자막 근거: “${plain(question.evidence_text)}”`,
      `- 자동 검증: \`${question.validation_status}\` · 교사 검수: \`${question.teacher_review_status}\` · 공개: \`${question.published}\` · 문제 ID: \`${question.id}\``,
      '- 확인: [ ] 실제 음성과 자막이 일치함  [ ] 이 근거만으로 정답을 알 수 있음  [ ] 학년에 맞음','');
  }
}
lines.push('## 검수 후 처리','',
  'Supabase Dashboard → Table Editor의 `questions`에서 문제 ID로 해당 행을 찾습니다. 확인한 문제는 `teacher_review_status=approved`, 제외할 문제는 `teacher_review_status=rejected`로 설정합니다. 문항을 수정하면 자막 근거를 다시 검증해야 합니다.',
  '`videos`에서 YouTube ID로 행을 찾습니다. 영상 화면·음성과 공개할 문제를 확인한 뒤에만 `review_status=approved`, `reviewed_at=현재 시각`, `published=true`로 설정합니다. 승인된 문제만 공개됩니다.',
  '공개 데이터를 갱신하려면 `npm run export:public`과 `npm run build`를 다시 실행하고 Cloudflare Pages에 새 빌드를 배포합니다.','');
await mkdir(new URL('./out/',import.meta.url),{recursive:true});
const output=new URL('./out/review-report.md',import.meta.url);
await writeFile(output,lines.join('\n'),'utf8');
process.stdout.write(`검수 보고서 생성: ${videos.length}개 영상, ${questions.length}개 문제 → automation/out/review-report.md\n`);
