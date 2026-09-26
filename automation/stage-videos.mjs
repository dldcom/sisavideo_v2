import { mkdir, writeFile } from 'node:fs/promises';
import { admin, data } from './db.mjs';
import { fetchVideosByIds } from './youtube.mjs';

const ids=[...new Set(process.argv.slice(2))];
if(!ids.length)throw new Error('사용법: node --env-file=.env.local automation/stage-videos.mjs VIDEO_ID ...');
if(!process.env.YOUTUBE_API_KEY)throw new Error('YOUTUBE_API_KEY 필요');
const items=await fetchVideosByIds(ids,process.env.YOUTUBE_API_KEY);
if(items.length!==ids.length)throw new Error('요청한 영상 중 공개되지 않았거나 YouTube API에서 찾을 수 없는 영상이 있습니다');

const db=admin();
const existingVideos=data(await db.from('videos').select('youtube_video_id').in('youtube_video_id',ids));
const existingIds=new Set(existingVideos.map(x=>x.youtube_video_id));
const channelIds=[...new Set(items.map(x=>x.channel_youtube_id))];
const channels=data(await db.from('channels').select('id,youtube_channel_id').in('youtube_channel_id',channelIds));
const channelMap=new Map(channels.map(x=>[x.youtube_channel_id,x.id]));
for(const item of items){
  if(channelMap.has(item.channel_youtube_id))continue;
  const channel=data(await db.from('channels').insert({
    youtube_channel_id:item.channel_youtube_id,channel_name:item.channel_name,
    source_type:'discovery',review_status:'candidate',auto_collect:false
  }).select('id').single());
  channelMap.set(item.channel_youtube_id,channel.id);
}

const candidates=items.filter(x=>!existingIds.has(x.youtube_video_id)).map(x=>({
  ...x,channel_id:channelMap.get(x.channel_youtube_id)
}));
await mkdir(new URL('./out/',import.meta.url),{recursive:true});
await writeFile(new URL('./out/candidates.json',import.meta.url),JSON.stringify(candidates,null,2));
process.stdout.write(`${candidates.length}개 신규 후보의 메타데이터를 YouTube API에서 가져왔습니다. 채널은 검토 전 candidate 상태입니다.\n`);
