import { supabase } from './supabase';
import type { Question, Topic, Video, VideoListItem } from '../types';

export const VIDEO_PAGE_SIZE = 18;
const videoListSelect = 'id,title,thumbnail_url,duration_seconds,summary,recommended_grade_bands,usage_types,channels(channel_name,source_type),video_topics!inner(topic_id)';
const videoSelect = 'id,youtube_video_id,title,video_url,thumbnail_url,upload_date,duration_seconds,summary,key_concepts,recommended_grade_bands,usage_types,channels(id,channel_name,source_type),video_topics(topic_id,education_topics(name,slug,parent_id))';
function client() { if (!supabase) throw new Error('Supabase 환경변수를 설정해 주세요.'); return supabase; }
function checked<T>(data: T | null, error: { message: string } | null): T { if (error) throw new Error(error.message); if (data === null) throw new Error('데이터를 불러오지 못했습니다.'); return data; }

let topicsPromise: Promise<Topic[]> | null = null;
export function getTopics(): Promise<Topic[]> {
  topicsPromise ??= (async () => {
    const { data, error } = await client().from('education_topics').select('id,parent_id,name,slug,description,sort_order').eq('active', true).order('sort_order').order('name');
    return checked(data, error) as Topic[];
  })().catch(error => { topicsPromise = null; throw error; });
  return topicsPromise;
}
export async function getVideos(topicIds: string[], gradeBand = '', page = 0): Promise<{ items: VideoListItem[]; hasMore: boolean }> {
  if (!topicIds.length) return { items: [], hasMore: false };
  const start = page * VIDEO_PAGE_SIZE;
  let query = client().from('videos').select(videoListSelect).eq('published', true)
    .in('video_topics.topic_id', topicIds).order('upload_date', { ascending: false })
    .order('id', { ascending: false }).range(start, start + VIDEO_PAGE_SIZE);
  if (gradeBand) query = query.contains('recommended_grade_bands', [gradeBand]);
  const { data, error } = await query;
  const rows = checked(data, error) as unknown as VideoListItem[];
  return { items: rows.slice(0, VIDEO_PAGE_SIZE), hasMore: rows.length > VIDEO_PAGE_SIZE };
}
export async function getVideo(id: string): Promise<Video | null> {
  const { data, error } = await client().from('videos').select(videoSelect).eq('id', id).eq('published', true).maybeSingle();
  if (error) throw new Error(error.message);
  return data as unknown as Video | null;
}
export async function getQuestions(videoId: string): Promise<Question[]> {
  const { data, error } = await client().from('questions').select('id,video_id,question_text,answer,evidence_text,evidence_start_seconds,evidence_end_seconds,sort_order').eq('video_id', videoId).eq('published', true).order('sort_order');
  return checked(data, error) as Question[];
}
