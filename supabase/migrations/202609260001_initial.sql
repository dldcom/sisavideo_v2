create extension if not exists pgcrypto;

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  youtube_channel_id text not null unique,
  channel_name text not null,
  channel_url text,
  organization_name text,
  source_type text not null check (source_type in ('official','editorial','expert_creator','discovery')),
  official_website text,
  verification_url text,
  verification_note text,
  review_status text not null default 'candidate' check (review_status in ('candidate','approved','paused','rejected')),
  auto_collect boolean not null default false,
  elementary_content_ratio numeric check (elementary_content_ratio between 0 and 1),
  caption_available_ratio numeric check (caption_available_ratio between 0 and 1),
  last_reviewed_at timestamptz,
  last_collected_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.education_topics (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.education_topics(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);
create table public.channel_topics (
  channel_id uuid not null references public.channels(id) on delete cascade,
  topic_id uuid not null references public.education_topics(id) on delete cascade,
  priority integer not null default 0,
  primary key (channel_id, topic_id)
);
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  youtube_video_id text not null unique check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  channel_id uuid not null references public.channels(id),
  title text not null,
  video_url text not null,
  thumbnail_url text,
  upload_date date,
  duration_seconds integer check (duration_seconds > 0),
  description text,
  summary text,
  key_concepts text[] not null default '{}',
  recommended_grade_bands text[] not null default '{}'
    check (recommended_grade_bands <@ array['1-2','3-4','5-6']::text[]),
  usage_types text[] not null default '{}'
    check (usage_types <@ array['concept','hook','real_case','news_case','discussion','extension']::text[]),
  freshness_type text not null default 'evergreen'
    check (freshness_type in ('evergreen','policy_sensitive','law_sensitive','technology_sensitive')),
  caption_status text not null default 'unknown'
    check (caption_status in ('unknown','available','unavailable','processed','failed')),
  review_status text not null default 'candidate'
    check (review_status in ('candidate','ai_analyzed','needs_review','approved','rejected')),
  elementary_fit smallint check (elementary_fit between 1 and 5),
  educational_value smallint check (educational_value between 1 and 5),
  engagement smallint check (engagement between 1 and 5),
  factual_reliability smallint check (factual_reliability between 1 and 5),
  evaluation_note text,
  analysis_json jsonb,
  published boolean not null default false,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not published or (review_status = 'approved' and reviewed_at is not null))
);
create table public.video_topics (
  video_id uuid not null references public.videos(id) on delete cascade,
  topic_id uuid not null references public.education_topics(id) on delete cascade,
  match_score numeric check (match_score between 0 and 1),
  match_reason text,
  reviewed boolean not null default false,
  primary key (video_id, topic_id)
);
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  question_text text not null check (position('@@BLANK@@' in question_text) > 0),
  answer text not null check (length(trim(answer)) > 0),
  evidence_text text not null check (length(trim(evidence_text)) > 0),
  evidence_start_seconds numeric not null check (evidence_start_seconds >= 0),
  evidence_end_seconds numeric not null check (evidence_end_seconds > evidence_start_seconds),
  validation_status text not null default 'unverified'
    check (validation_status in ('unverified','auto_passed','auto_failed','teacher_reviewed')),
  generation_type text not null default 'auto' check (generation_type in ('auto','manual')),
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not published or validation_status in ('auto_passed','teacher_reviewed'))
);
create table public.job_runs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  status text not null check (status in ('running','success','partial','failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  discovered_count integer not null default 0,
  processed_count integer not null default 0,
  failed_count integer not null default 0,
  error_message text,
  metadata jsonb
);

create index on public.videos(channel_id);
create index on public.videos(published, upload_date desc);
create index on public.videos(review_status);
create index on public.video_topics(topic_id);
create index on public.questions(video_id, published, sort_order);

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger channels_updated before update on public.channels for each row execute function public.touch_updated_at();
create trigger videos_updated before update on public.videos for each row execute function public.touch_updated_at();
create trigger questions_updated before update on public.questions for each row execute function public.touch_updated_at();

-- 교사가 Dashboard에서 영상 검수 후 approved/published/reviewed_at을 설정한 시점에만 공개한다.
create function public.sync_question_publication() returns trigger language plpgsql as $$
begin
  if new.published and new.review_status = 'approved' and new.reviewed_at is not null then
    update public.questions set published = true
      where video_id = new.id and validation_status in ('auto_passed','teacher_reviewed');
  elsif not new.published then
    update public.questions set published = false where video_id = new.id;
  end if;
  return new;
end; $$;
create trigger video_publication after insert or update of published, review_status, reviewed_at on public.videos
  for each row execute function public.sync_question_publication();

alter table public.channels enable row level security;
alter table public.education_topics enable row level security;
alter table public.channel_topics enable row level security;
alter table public.videos enable row level security;
alter table public.video_topics enable row level security;
alter table public.questions enable row level security;
alter table public.job_runs enable row level security;

-- Supabase 프로젝트의 기본 권한 설정에 의존하지 않고 공개 API를 읽기 전용으로 제한한다.
revoke all on public.channels, public.education_topics, public.channel_topics,
  public.videos, public.video_topics, public.questions, public.job_runs
  from anon, authenticated;
grant select on public.channels, public.education_topics, public.videos,
  public.video_topics, public.questions to anon, authenticated;

create policy "read public channels" on public.channels for select to anon, authenticated
  using (exists (select 1 from public.videos v where v.channel_id = channels.id and v.published));
create policy "read active topics" on public.education_topics for select to anon, authenticated using (active);
create policy "read public videos" on public.videos for select to anon, authenticated using (published);
create policy "read public video topics" on public.video_topics for select to anon, authenticated
  using (exists (select 1 from public.videos v where v.id = video_topics.video_id and v.published));
create policy "read public questions" on public.questions for select to anon, authenticated
  using (published and exists (select 1 from public.videos v where v.id = questions.video_id and v.published));
