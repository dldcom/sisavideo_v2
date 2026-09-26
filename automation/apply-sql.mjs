import { readFile } from 'node:fs/promises';

const files = {
  migrate: new URL('../supabase/migrations/202609260001_initial.sql', import.meta.url),
  seed: new URL('../supabase/seed.sql', import.meta.url),
  teacherReview: new URL('../supabase/migrations/202609270003_question_teacher_review.sql', import.meta.url),
};
const names = {
  migrate: '202609260001_initial',
  seed: '202609260002_education_topics_seed',
  teacherReview: '202609270003_question_teacher_review',
};

const action = process.argv[2];
if (!Object.hasOwn(files, action)) {
  throw new Error('사용법: node --env-file=.env.local automation/apply-sql.mjs migrate|seed|teacherReview');
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectUrl = process.env.SUPABASE_URL;
if (!token || !projectUrl) throw new Error('SUPABASE_ACCESS_TOKEN / SUPABASE_URL 필요');
const host = new URL(projectUrl).hostname;
const match = /^([a-z0-9]+)\.supabase\.co$/.exec(host);
if (!match) throw new Error('SUPABASE_URL은 프로젝트의 *.supabase.co 주소여야 합니다');

const response = await fetch(`https://api.supabase.com/v1/projects/${match[1]}/database/migrations`, {
  method: 'POST',
  headers: {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({ name: names[action], query: await readFile(files[action], 'utf8') }),
});

if (!response.ok) {
  const body = await response.text();
  let message;
  try {
    const data = JSON.parse(body);
    message = data.message || data.error || data.error_description;
  } catch { /* 응답 본문이 JSON이 아닐 수 있다. */ }
  throw new Error(`Supabase migration API ${response.status}: ${String(message || body).slice(0, 800)}`);
}
process.stdout.write(`${names[action]} 적용 완료\n`);
