import { readFile } from 'node:fs/promises';
import { admin, data } from './db.mjs';
import { YtDlpTranscriptProvider } from './transcripts/ytdlp.mjs';
import { validateQuestion } from './validate.mjs';

const [file, ...flags] = process.argv.slice(2);
if (!file || flags.some(flag => flag !== '--dry-run')) {
  throw new Error('사용법: node --env-file=.env.local automation/add-questions.mjs additions.json [--dry-run]');
}
const dryRun = flags.includes('--dry-run');
const additions = JSON.parse(await readFile(file, 'utf8'));
if (!Array.isArray(additions) || !additions.length) throw new Error('추가 영상 목록이 비어 있습니다');

const db = admin();
const provider = new YtDlpTranscriptProvider();
for (const entry of additions) {
  const videoId = entry.youtube_video_id;
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || '') || !Array.isArray(entry.questions) || !entry.questions.length) {
    throw new Error('youtube_video_id와 questions 배열이 필요합니다');
  }
  const video = data(await db.from('videos').select('id,review_status,published')
    .eq('youtube_video_id', videoId).single());
  if (video.review_status !== 'needs_review' || video.published) {
    throw new Error(`${videoId}: 검수 대기·비공개 영상만 보강할 수 있습니다`);
  }
  const existing = data(await db.from('questions').select('question_text,answer,sort_order')
    .eq('video_id', video.id));
  const existingKeys = new Set(existing.map(q => JSON.stringify([q.question_text, q.answer])));
  const fresh = entry.questions.filter(q => !existingKeys.has(JSON.stringify([q.question_text, q.answer])));
  if (!fresh.length) {
    process.stdout.write(`${videoId}: 이미 저장된 문제만 있어 건너뜁니다\n`);
    continue;
  }
  const transcript = await provider.getTranscript(videoId);
  if (!transcript) throw new Error(`${videoId}: 한국어 자막 없음`);
  for (const [index, question] of fresh.entries()) {
    const errors = validateQuestion(question, transcript.segments);
    if (errors.length) throw new Error(`${videoId} 추가 문제 ${index + 1}: ${errors.join(', ')}`);
  }
  if (dryRun) {
    process.stdout.write(`${videoId}: 추가 문제 ${fresh.length}개 자막 근거 검증 통과 (저장 안 함)\n`);
    continue;
  }
  const firstOrder = Math.max(0, ...existing.map(q => q.sort_order ?? 0)) + 1;
  data(await db.from('questions').insert(fresh.map((q, index) => ({
    video_id: video.id,
    question_text: q.question_text,
    answer: q.answer,
    evidence_text: q.evidence_text,
    evidence_start_seconds: q.evidence_start_seconds,
    evidence_end_seconds: q.evidence_end_seconds,
    validation_status: 'auto_passed',
    teacher_review_status: 'needs_review',
    generation_type: 'auto',
    sort_order: firstOrder + index,
    published: false
  }))));
  process.stdout.write(`${videoId}: 추가 문제 ${fresh.length}개 검수 대기·비공개 저장\n`);
}
