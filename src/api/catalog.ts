import { supabase } from './supabase';
import type { Question, Topic, Video } from '../types';

const videoSelect = 'id,youtube_video_id,title,video_url,thumbnail_url,upload_date,duration_seconds,summary,key_concepts,recommended_grade_bands,usage_types,channels(id,channel_name,source_type),video_topics(topic_id,education_topics(name,slug,parent_id))';
function client() { if (!supabase) throw new Error('Supabase 환경변수를 설정해 주세요.'); return supabase; }
function checked<T>(data: T | null, error: { message: string } | null): T { if (error) throw new Error(error.message); if (data === null) throw new Error('데이터를 불러오지 못했습니다.'); return data; }

export async function getTopics(): Promise<Topic[]> {
  const { data, error } = await client().from('education_topics').select('id,parent_id,name,slug,description,sort_order').eq('active', true).order('sort_order').order('name');
  return checked(data, error) as Topic[];
}
export async function getVideos(topicIds?: string[]): Promise<Video[]> {
  let query = client().from('videos').select(videoSelect).eq('published', true).order('upload_date', { ascending: false });
  if (topicIds?.length) {
    const { data: links, error } = await client().from('video_topics').select('video_id').in('topic_id', topicIds);
    const ids = [...new Set((checked(links, error) as {video_id:string}[]).map(x => x.video_id))];
    if (!ids.length) return [];
    query = query.in('id', ids);
  }
  const { data, error } = await query;
  return checked(data, error) as unknown as Video[];
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
