import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getVideoBundle } from '../api/catalog';
import { BlankText } from '../components/BlankText';
import { formatDuration, gradeLabel, sourceLabel, usageLabel } from '../format';
import type { Question, Video } from '../types';
export function VideoPage() {
  const {id=''}=useParams(); const [video,setVideo]=useState<Video|null>(null); const [questions,setQuestions]=useState<Question[]>([]); const [error,setError]=useState(''); const [loading,setLoading]=useState(true);
  useEffect(()=>{ let active=true; setLoading(true); getVideoBundle(id).then(bundle=>{if(active){setVideo(bundle?.video??null);setQuestions(bundle?.questions??[]);}}).catch((e:Error)=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}; },[id]);
  if(loading) return <main className="shell">영상을 불러오는 중…</main>;
  if(error||!video) return <main className="shell"><p role="alert" className="error">{error||'공개된 영상을 찾을 수 없습니다.'}</p><Link to="/">처음으로</Link></main>;
  return <main className="shell"><Link className="back" to="/">← 교육 주제</Link><div className="detail-layout"><section><div className="player"><iframe src={`https://www.youtube-nocookie.com/embed/${video.youtube_video_id}`} title={video.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></div><p className="eyebrow">{video.channels.channel_name} · {sourceLabel(video.channels.source_type)} · {formatDuration(video.duration_seconds)}</p><h1>{video.title}</h1><p className="lead">{video.summary}</p><div className="facts"><p><b>권장 학년</b> {video.recommended_grade_bands.map(gradeLabel).join(', ')||'검토 중'}</p><p><b>핵심 개념</b> {video.key_concepts.join(', ')||'—'}</p><p><b>수업 활용</b> {video.usage_types.map(usageLabel).join(', ')||'—'}</p></div><div className="actions no-print"><a className="button" href={video.video_url} target="_blank" rel="noreferrer">YouTube에서 보기 ↗</a><Link className="button primary" to={`/videos/${video.id}/worksheet`}>학습지 만들기</Link></div></section>
  <aside className="question-preview"><p className="eyebrow">WORKSHEET PREVIEW</p><h2>영상 속 질문</h2><ol>{questions.map(q=><li key={q.id}><BlankText text={q.question_text} answer={q.answer}/></li>)}</ol>{questions.length===0&&<p>공개된 문제가 없습니다.</p>}</aside></div></main>;
}
