import { Link, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { TopicPage } from './pages/TopicPage';
import { VideoPage } from './pages/VideoPage';
import { WorksheetPage } from './pages/WorksheetPage';

export function App() { return <><header className="site-header no-print"><Link className="brand" to="/">창체·범교과 <strong>영상 학습지</strong></Link><span>교사를 위한 수업 영상 도구</span></header><Routes><Route path="/" element={<HomePage/>}/><Route path="/topics/:slug" element={<TopicPage/>}/><Route path="/videos/:id" element={<VideoPage/>}/><Route path="/videos/:id/worksheet" element={<WorksheetPage/>}/><Route path="*" element={<main className="shell"><h1>페이지를 찾을 수 없습니다</h1><Link to="/">처음으로</Link></main>}/></Routes></>; }
