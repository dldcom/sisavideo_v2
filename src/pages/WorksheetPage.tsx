import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getQuestions, getVideo } from '../api/catalog';
import { BlankText } from '../components/BlankText';
import { timestamp } from '../format';
import type { Question, Video } from '../types';
export function WorksheetPage() {
  const {id=''}=useParams(); const [video,setVideo]=useState<Video|null>(null); const [questions,setQuestions]=useState<Question[]>([]); const [teacher,setTeacher]=useState(false); const [error,setError]=useState('');
  useEffect(()=>{Promise.all([getVideo(id),getQuestions(id)]).then(([v,q])=>{setVideo(v);setQuestions(q);}).catch((e:Error)=>setError(e.message));},[id]);
  if(error) return <main className="shell error" role="alert">{error}</main>;
  if(!video) return <main className="shell">학습지를 불러오는 중…</main>;
  return <main className="shell worksheet-page"><div className="worksheet-toolbar no-print"><Link className="back" to={`/videos/${id}`}>← 영상으로</Link><div className="actions"><button className="button" onClick={()=>setTeacher(!teacher)}>{teacher?'학생용 보기':'교사용 정답 보기'}</button><button className="button primary" onClick={()=>window.print()}>인쇄 / PDF 저장</button></div></div><article className="paper"><div className="paper-header"><p>창체·범교과 영상 학습지 {teacher&&'· 교사용 정답'}</p><h1>{video.title}</h1><div className="paper-meta"><label>날짜 <input aria-label="날짜"/></label><label>이름 <input aria-label="이름"/></label></div></div><p className="paper-intro">영상을 보고 빈칸에 알맞은 말을 써 보세요.</p><ol className="worksheet-list">{questions.map(q=><li key={q.id}><p><BlankText text={q.question_text} answer={q.answer} showAnswer={teacher}/></p>{teacher&&<div className="evidence"><b>자막 근거</b> “{q.evidence_text}” <a href={`https://www.youtube.com/watch?v=${video.youtube_video_id}&t=${Math.floor(q.evidence_start_seconds)}s`} target="_blank" rel="noreferrer">{timestamp(q.evidence_start_seconds)} ↗</a></div>}</li>)}</ol>{questions.length===0&&<p>공개된 문제가 없습니다.</p>}<footer>오늘 배운 내용을 한 문장으로 정리해 보세요.<div className="writing-line"/></footer></article></main>;
}
