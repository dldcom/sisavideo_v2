import type { Question, Topic, Video, VideoListItem } from '../types';

export const VIDEO_PAGE_SIZE = 18;
export interface VideoBundle { video: Video; questions: Question[] }
interface TopicCard extends VideoListItem { topic_ids: string[] }
const base = `${import.meta.env.BASE_URL}data/`;
const topicFiles = new Map<string, Promise<TopicCard[]>>();
const videoFiles = new Map<string, Promise<VideoBundle | null>>();

async function readJson<T>(path: string, missingIsNull = false): Promise<T | null> {
  const response = await fetch(`${base}${path}`);
  if (response.status === 404 && missingIsNull) return null;
  if (!response.ok) throw new Error('공개 데이터를 불러오지 못했습니다. 배포된 데이터 파일을 확인해 주세요.');
  return response.json() as Promise<T>;
}

let topicsPromise: Promise<Topic[]> | null = null;
export function getTopics(): Promise<Topic[]> {
  topicsPromise ??= readJson<Topic[]>('topics.json').then(rows => rows ?? [])
    .catch(error => { topicsPromise = null; throw error; });
  return topicsPromise;
}

export async function getVideos(rootSlug: string, childId = '', gradeBand = '', page = 0): Promise<{ items: VideoListItem[]; hasMore: boolean }> {
  if (!/^[a-z0-9-]+$/.test(rootSlug)) return { items: [], hasMore: false };
  if (!topicFiles.has(rootSlug)) {
    const request = readJson<TopicCard[]>(`topics/${rootSlug}.json`).then(rows => rows ?? [])
      .catch(error => { topicFiles.delete(rootSlug); throw error; });
    topicFiles.set(rootSlug, request);
  }
  const rows = await topicFiles.get(rootSlug)!;
  const filtered = rows.filter(row => (!childId || row.topic_ids.includes(childId)) &&
    (!gradeBand || row.recommended_grade_bands.includes(gradeBand)));
  const start = Math.max(0, page) * VIDEO_PAGE_SIZE;
  return { items: filtered.slice(start, start + VIDEO_PAGE_SIZE), hasMore: filtered.length > start + VIDEO_PAGE_SIZE };
}

export async function getVideoBundle(id: string): Promise<VideoBundle | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  if (!videoFiles.has(id)) {
    const request = readJson<VideoBundle>(`videos/${id}.json`, true)
      .catch(error => { videoFiles.delete(id); throw error; });
    videoFiles.set(id, request);
  }
  return videoFiles.get(id)!;
}
