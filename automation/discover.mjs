import { mkdir, writeFile } from 'node:fs/promises';
import { admin, data } from './db.mjs';
import { discoverChannel } from './youtube.mjs';

if(!process.env.YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY 필요');
const maxPerChannel=Number(process.argv[2]||20);
const since=process.argv[3]||`${new Date().getUTCFullYear()-3}-01-01`;
if(!Number.isInteger(maxPerChannel)||maxPerChannel<1||maxPerChannel>50||!/^\d{4}-\d{2}-\d{2}$/.test(since)||Number.isNaN(Date.parse(since)))
  throw new Error('사용법: node --env-file=.env.local automation/discover.mjs [채널당 1~50개] [YYYY-MM-DD]');
const db=admin(); const channels=data(await db.from('channels').select('id,youtube_channel_id,channel_name,last_collected_at').eq('active',true).eq('review_status','approved').eq('auto_collect',true));
const job=data(await db.from('job_runs').insert({job_type:'youtube_manual_collect',status:'running'}).select('id').single());
const candidates=[]; let failed=0,discovered=0,olderSkipped=0;
try {
  for(const channel of channels) {
    try {
      const items=await discoverChannel(channel,process.env.YOUTUBE_API_KEY,maxPerChannel); discovered+=items.length;
      olderSkipped+=items.filter(x=>!x.upload_date||x.upload_date<since).length;
      const ids=items.map(x=>x.youtube_video_id);
      const existing=ids.length?data(await db.from('videos').select('youtube_video_id').in('youtube_video_id',ids)):[];
      const seen=new Set(existing.map(x=>x.youtube_video_id));
      candidates.push(...items.filter(x=>x.upload_date&&x.upload_date>=since&&!seen.has(x.youtube_video_id)).map(x=>({...x,channel_id:channel.id,channel_name:channel.channel_name})));
      data(await db.from('channels').update({last_collected_at:new Date().toISOString()}).eq('id',channel.id));
    } catch(e) { failed++; process.stderr.write(`${channel.channel_name}: ${e.message}\n`); }
  }
  await mkdir(new URL('./out/',import.meta.url),{recursive:true});
  candidates.sort((a,b)=>b.upload_date.localeCompare(a.upload_date)||a.youtube_video_id.localeCompare(b.youtube_video_id));
  await writeFile(new URL('./out/candidates.json',import.meta.url),JSON.stringify(candidates,null,2));
  data(await db.from('job_runs').update({status:failed?'partial':'success',finished_at:new Date().toISOString(),discovered_count:discovered,processed_count:candidates.length,failed_count:failed,metadata:{candidate_file:'automation/out/candidates.json',since,older_skipped:olderSkipped}}).eq('id',job.id));
  process.stdout.write(`${since} 이후 신규 후보 ${candidates.length}개를 automation/out/candidates.json에 기록했습니다. 이전 영상 ${olderSkipped}개는 건너뛰었습니다. 자막 품질은 prepare 단계에서 확인해야 합니다.\n`);
} catch(e) { await db.from('job_runs').update({status:'failed',finished_at:new Date().toISOString(),error_message:String(e.message).slice(0,500)}).eq('id',job.id); throw e; }
