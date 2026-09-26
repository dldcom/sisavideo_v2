import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTopics, getVideos } from '../api/catalog';
import { VideoCard } from '../components/VideoCard';
import type { Topic, VideoListItem } from '../types';

export function TopicPage() {
  const { slug } = useParams();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [child, setChild] = useState('');
  const [grade, setGrade] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const topic = topics.find(x => x.slug === slug);
  const children = useMemo(() => topics.filter(x => x.parent_id === topic?.id), [topics, topic?.id]);

  useEffect(() => {
    getTopics().then(setTopics).catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);
  useEffect(() => { setChild(''); setGrade(''); setPage(0); }, [slug]);
  useEffect(() => {
    if (!topic) return;
    let active = true;
    setLoading(true);
    setError('');
    getVideos(child ? [child] : [topic.id, ...children.map(x => x.id)], grade, page)
      .then(result => { if (active) { setVideos(result.items); setHasMore(result.hasMore); } })
      .catch((e: Error) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [topic?.id, children, child, grade, page]);

  return <main className="shell">
    <Link className="back" to="/">← 모든 주제</Link>
    <div className="page-title"><p className="eyebrow">EDUCATION TOPIC</p><h1>{topic?.name || '주제'}</h1><p>교사가 검수하고 공개한 영상을 확인하세요.</p></div>
    <div className="filters">
      <label>세부주제 <select value={child} onChange={e => { setChild(e.target.value); setPage(0); }}><option value="">전체</option>{children.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label>권장 학년 <select value={grade} onChange={e => { setGrade(e.target.value); setPage(0); }}><option value="">전체</option><option value="1-2">1~2학년</option><option value="3-4">3~4학년</option><option value="5-6">5~6학년</option></select></label>
    </div>
    {error && <p role="alert" className="error">{error}</p>}
    {loading ? <p>영상 목록을 불러오는 중…</p> : <>
      <p className="result-count">{page + 1}페이지 · {videos.length}개 영상</p>
      <div className="video-grid">{videos.map(v => <VideoCard video={v} key={v.id} />)}</div>
      {videos.length === 0 && <p className="empty">이 조건에 공개된 영상이 아직 없습니다.</p>}
      <nav className="pagination" aria-label="영상 목록 페이지">
        <button className="button" type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>이전</button>
        <span>{page + 1}페이지</span>
        <button className="button" type="button" disabled={!hasMore} onClick={() => setPage(page + 1)}>다음</button>
      </nav>
    </>}
  </main>;
}
