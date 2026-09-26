alter table public.questions
  add column teacher_review_status text not null default 'needs_review'
    check (teacher_review_status in ('needs_review','approved','rejected'));

alter table public.questions
  add constraint questions_teacher_approval_required
  check (not published or teacher_review_status = 'approved');

create or replace function public.sync_question_publication() returns trigger language plpgsql as $$
begin
  update public.questions
     set published = new.published
       and new.review_status = 'approved'
       and new.reviewed_at is not null
       and teacher_review_status = 'approved'
       and validation_status in ('auto_passed','teacher_reviewed')
   where video_id = new.id;
  return new;
end; $$;

create function public.sync_single_question_publication() returns trigger language plpgsql as $$
declare video_is_public boolean;
begin
  select coalesce(v.published and v.review_status = 'approved' and v.reviewed_at is not null, false)
    into video_is_public
    from public.videos v where v.id = new.video_id;
  new.published := coalesce(video_is_public, false)
    and new.teacher_review_status = 'approved'
    and new.validation_status in ('auto_passed','teacher_reviewed');
  return new;
end; $$;

create trigger question_teacher_publication
  before insert or update on public.questions
  for each row execute function public.sync_single_question_publication();
