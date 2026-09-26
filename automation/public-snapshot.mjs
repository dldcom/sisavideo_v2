// Only teacher-approved records become public files. Keep this function independent of I/O.
export function buildPublicSnapshot(topics, videos) {
  const activeTopics = topics.filter(topic => topic.active);
  const topicById = new Map(activeTopics.map(topic => [topic.id, topic]));
  const roots = activeTopics.filter(topic => !topic.parent_id);
  const lists = Object.fromEntries(roots.map(topic => [topic.slug, []]));
  const bundles = new Map();

  for (const row of videos) {
    if (!row.published || row.review_status !== 'approved' || !row.reviewed_at) continue;
    const questions = (row.questions ?? [])
      .filter(q => q.published && q.teacher_review_status === 'approved'
        && ['auto_passed', 'teacher_reviewed'].includes(q.validation_status)
        && q.question_text && q.answer && q.evidence_text
        && Number.isFinite(Number(q.evidence_start_seconds)) && Number.isFinite(Number(q.evidence_end_seconds))
        && Number(q.evidence_end_seconds) > Number(q.evidence_start_seconds))
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(q => ({ id: q.id, video_id: q.video_id, question_text: q.question_text,
        answer: q.answer, evidence_text: q.evidence_text,
        evidence_start_seconds: Number(q.evidence_start_seconds),
        evidence_end_seconds: Number(q.evidence_end_seconds), sort_order: q.sort_order }));
    if (!questions.length || !row.channels) continue;
    const topicIds = [...new Set((row.video_topics ?? []).map(vt => vt.topic_id).filter(id => topicById.has(id)))];
    const rootSlugs = new Set();
    const topicLinks = [];
    for (const id of topicIds) {
      const topic = topicById.get(id);
      const root = topic.parent_id ? topicById.get(topic.parent_id) : topic;
      if (!root || !Object.hasOwn(lists, root.slug)) continue;
      rootSlugs.add(root.slug);
      topicLinks.push({ topic_id: id, education_topics: { name: topic.name, slug: topic.slug, parent_id: topic.parent_id } });
    }
    if (!rootSlugs.size) continue;
    const channel = { id: row.channels.id, channel_name: row.channels.channel_name,
      source_type: row.channels.source_type };
    const video = { id: row.id, youtube_video_id: row.youtube_video_id, title: row.title,
      video_url: row.video_url, thumbnail_url: row.thumbnail_url, upload_date: row.upload_date,
      duration_seconds: row.duration_seconds, summary: row.summary, key_concepts: row.key_concepts ?? [],
      recommended_grade_bands: row.recommended_grade_bands ?? [], usage_types: row.usage_types ?? [],
      channels: channel, video_topics: topicLinks };
    bundles.set(row.id, { video, questions });
    const card = { id: row.id, title: row.title, thumbnail_url: row.thumbnail_url,
      duration_seconds: row.duration_seconds, summary: row.summary,
      recommended_grade_bands: video.recommended_grade_bands, usage_types: video.usage_types,
      channels: { channel_name: channel.channel_name, source_type: channel.source_type },
      topic_ids: topicIds, upload_date: row.upload_date };
    for (const slug of rootSlugs) lists[slug].push(card);
  }
  for (const slug of Object.keys(lists)) {
    lists[slug].sort((a, b) => (b.upload_date ?? '').localeCompare(a.upload_date ?? '') || b.id.localeCompare(a.id));
    lists[slug] = lists[slug].map(({ upload_date, ...card }) => card);
  }
  return { topics: activeTopics.map(({ id, parent_id, name, slug, description, sort_order }) =>
    ({ id, parent_id, name, slug, description, sort_order })), lists, bundles };
}
