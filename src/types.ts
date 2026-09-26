export type SourceType = 'official' | 'editorial' | 'expert_creator' | 'discovery';
export interface Topic { id: string; parent_id: string | null; name: string; slug: string; description: string | null; sort_order: number }
export interface Channel { id: string; channel_name: string; source_type: SourceType }
export interface VideoTopic { topic_id: string; education_topics: Pick<Topic, 'name' | 'slug' | 'parent_id'> | null }
export interface Video {
  id: string; youtube_video_id: string; title: string; video_url: string; thumbnail_url: string | null;
  upload_date: string | null; duration_seconds: number | null; summary: string | null;
  key_concepts: string[]; recommended_grade_bands: string[]; usage_types: string[];
  channels: Channel; video_topics: VideoTopic[];
}
export interface Question {
  id: string; video_id: string; question_text: string; answer: string; evidence_text: string;
  evidence_start_seconds: number; evidence_end_seconds: number; sort_order: number;
}
