import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTopics } from '../api/catalog';
import type { Topic } from '../types';
export function HomePage() {
  const [topics,setTopics] = useState<Topic[]>([]); const [error,setError] = useState('');
  useEffect(() => { getTopics().then(setTopics).catch((e:Error)=>setError(e.message)); }, []);
  return <main className="shell"><section className="hero"><p className="eyebrow">CLASSROOM VIDEO LIBRARY</p><h1>오늘 수업에 맞는 영상을<br/>주제부터 찾아보세요.</h1><p>창체·범교과 영상을 탐색하고, 영상 자막에 근거한 빈칸 학습지를 인쇄할 수 있습니다.</p></section>
    <section><div className="section-head"><h2>교육 주제</h2><span>{topics.filter(t=>!t.parent_id).length}개 영역</span></div>{error && <p role="alert" className="error">{error}</p>}
      <div className="topic-grid">{topics.filter(t=>!t.parent_id).map((topic,i)=><Link className="topic-card" key={topic.id} to={`/topics/${topic.slug}`}><span>{String(i+1).padStart(2,'0')}</span><h3>{topic.name}</h3><p>{topics.filter(t=>t.parent_id===topic.id).map(t=>t.name).slice(0,4).join(' · ') || '관련 영상 살펴보기'}</p><b aria-hidden="true">↗</b></Link>)}</div>
    </section></main>;
}
