import { copyFile, mkdir, readdir, rename, rm, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { admin, data } from './db.mjs';
import { buildPublicSnapshot } from './public-snapshot.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(project, 'public');
const output = path.join(publicDir, 'data');
const stage = path.join(publicDir, `.data-stage-${randomUUID()}`);
const backup = path.join(publicDir, `.data-backup-${randomUUID()}`);
function insidePublic(target) {
  if (path.dirname(path.resolve(target)) !== publicDir) throw new Error(`Unexpected output path: ${target}`);
}
for (const target of [output, stage, backup]) insidePublic(target);

async function allRows(queryFactory) {
  const rows = [];
  for (let offset = 0; ; offset += 100) {
    const batch = data(await queryFactory().range(offset, offset + 99));
    rows.push(...batch);
    if (batch.length < 100) return rows;
  }
}
async function writeJson(relative, value) {
  const file = path.resolve(stage, relative);
  if (!file.startsWith(stage + path.sep)) throw new Error('Invalid snapshot path');
  const encoded = JSON.stringify(value);
  if (Buffer.byteLength(encoded) > 20 * 1024 * 1024) throw new Error(`${relative}: Cloudflare Pages 파일 크기 제한에 가까움`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, encoded + '\n', 'utf8');
}
async function snapshotFiles(root) {
  const files = [];
  for (const folder of ['', 'topics', 'videos']) {
    const dir = path.join(root, folder);
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const relative = path.join(folder, entry.name);
      const valid = folder === '' ? entry.name === 'topics.json'
        : folder === 'topics' ? /^[a-z0-9-]+\.json$/.test(entry.name)
        : /^[0-9a-f-]{36}\.json$/i.test(entry.name);
      if (valid) files.push(relative);
    }
  }
  return files;
}
async function syncStageInPlace() {
  const next = await snapshotFiles(stage);
  const previous = await snapshotFiles(output);
  const nextSet = new Set(next);
  for (const relative of next) {
    const target = path.resolve(output, relative);
    if (!target.startsWith(output + path.sep)) throw new Error('Invalid snapshot path');
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.resolve(stage, relative), target);
  }
  for (const relative of previous) {
    if (!nextSet.has(relative)) await unlink(path.resolve(output, relative));
  }
}

const db = admin();
const topics = await allRows(() => db.from('education_topics')
  .select('id,parent_id,name,slug,description,sort_order,active').eq('active', true)
  .order('sort_order').order('name'));
const videos = await allRows(() => db.from('videos').select(`
  id,youtube_video_id,title,video_url,thumbnail_url,upload_date,duration_seconds,summary,
  key_concepts,recommended_grade_bands,usage_types,published,review_status,reviewed_at,
  channels(id,channel_name,source_type),video_topics(topic_id),
  questions(id,video_id,question_text,answer,evidence_text,evidence_start_seconds,evidence_end_seconds,sort_order,validation_status,teacher_review_status,published)
`).eq('published', true).eq('review_status', 'approved').not('reviewed_at', 'is', null)
  .order('id'));
const snapshot = buildPublicSnapshot(topics, videos);
await mkdir(stage, { recursive: true });
let backedUp = false;
let published = false;
let inPlace = false;
try {
  await writeJson('topics.json', snapshot.topics);
  for (const [slug, list] of Object.entries(snapshot.lists)) {
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`Invalid topic slug: ${slug}`);
    await writeJson(`topics/${slug}.json`, list);
  }
  for (const [id, bundle] of snapshot.bundles) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error(`Invalid video id: ${id}`);
    await writeJson(`videos/${id}.json`, bundle);
  }
  try { await rename(output, backup); backedUp = true; }
  catch (error) {
    if (error.code !== 'ENOENT') {
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error;
      const current = await stat(output);
      if (!current.isDirectory()) throw error;
      await syncStageInPlace();
      inPlace = true;
    }
  }
  if (!inPlace) await rename(stage, output);
  published = true;
  console.log(`공개 스냅샷 생성: 주제 ${snapshot.topics.length}개, 영상 ${snapshot.bundles.size}개`);
} catch (error) {
  if (backedUp && !published) {
    try { await rename(backup, output); } catch { /* preserve backup for manual recovery */ }
  }
  await rm(stage, { recursive: true, force: true });
  throw error;
}
if (backedUp) await rm(backup, { recursive: true, force: true });
if (inPlace) await rm(stage, { recursive: true, force: true });
