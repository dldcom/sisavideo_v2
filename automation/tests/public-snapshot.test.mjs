import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildPublicSnapshot } from '../public-snapshot.mjs';

test('공개 JSON에는 승인된 영상과 근거 있는 공개 문제만 포함된다', () => {
  const topics = [{ id: 'root', parent_id: null, name: '안전', slug: 'safety', active: true,
    description: null, sort_order: 1 }, { id: 'child', parent_id: 'root', name: '보행', slug: 'walking',
    active: true, description: null, sort_order: 2 }];
  const question = { id: 'q1', video_id: 'v1', published: true, validation_status: 'auto_passed', teacher_review_status: 'approved',
    question_text: '@@BLANK@@', answer: '좌우', evidence_text: '좌우를 살펴요',
    evidence_start_seconds: 10, evidence_end_seconds: 12, sort_order: 1 };
  const approved = { id: 'v1', published: true, review_status: 'approved', reviewed_at: '2026-09-27',
    questions: [question, { ...question, id: 'q2', published: false },
      { ...question, id: 'q3', teacher_review_status: 'needs_review' }], video_topics: [{ topic_id: 'child' }],
    channels: { id: 'c1', channel_name: '채널', source_type: 'editorial' }, title: '보행 안전',
    youtube_video_id: 'abc', video_url: 'https://youtube.com/watch?v=abc', key_concepts: [],
    recommended_grade_bands: ['1-2'], usage_types: [], upload_date: '2026-09-01' };
  const snapshot = buildPublicSnapshot(topics, [approved, { ...approved, id: 'v2', published: false },
    { ...approved, id: 'v3', review_status: 'needs_review' }]);
  assert.equal(snapshot.bundles.size, 1);
  assert.equal(snapshot.bundles.get('v1').questions.length, 1);
  assert.deepEqual(snapshot.lists.safety.map(v => v.id), ['v1']);
  assert.equal(snapshot.lists.safety[0].topic_ids[0], 'child');
  assert.equal(JSON.stringify(snapshot).includes('reviewed_at'), false);
});
