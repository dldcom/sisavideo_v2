import { Link } from 'react-router-dom';
import type { VideoListItem } from '../types';
import { formatDuration, sourceLabel, gradeLabel, usageLabel } from '../format';
export function VideoCard({ video }: { video: VideoListItem }) { return <article className="video-card">
  <Link to={`/videos/${video.id}`} className="thumb">{video.thumbnail_url && <img src={video.thumbnail_url} alt="" loading="lazy"/>}<span>{formatDuration(video.duration_seconds)}</span></Link>
  <div className="video-card-body"><p className="eyebrow">{video.channels.channel_name} · {sourceLabel(video.channels.source_type)}</p><h3><Link to={`/videos/${video.id}`}>{video.title}</Link></h3>
    <p className="muted">{video.summary || '영상 설명을 준비하고 있습니다.'}</p><p className="tags">{video.recommended_grade_bands.map(gradeLabel).join(' · ')}{video.usage_types.length > 0 && ` · ${video.usage_types.map(usageLabel).join(', ')}`}</p>
    <div className="actions"><Link className="button primary" to={`/videos/${video.id}`}>영상 자세히</Link><Link className="button" to={`/videos/${video.id}/worksheet`}>학습지</Link></div>
  </div></article>; }
