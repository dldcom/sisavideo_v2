import { spawn } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
function run(args, cwd) { return new Promise((resolve,reject)=>{
  const child=spawn(process.env.YT_DLP_PATH || 'yt-dlp',args,{cwd,windowsHide:true,stdio:['ignore','ignore','pipe']}); let stderr='';
  child.stderr.on('data',data=>{stderr+=data.toString();});
  child.on('error',reject); child.on('close',code=>code===0?resolve():reject(new Error(stderr.slice(-1200)||`yt-dlp exited ${code}`)));
}); }
function parseJson3(raw) {
  const data=JSON.parse(raw); const segments=[];
  for(const event of data.events||[]) {
    const text=(event.segs||[]).map(x=>x.utf8||'').join('').replace(/\s+/g,' ').trim();
    if(!text||!Number.isFinite(event.tStartMs)) continue;
    const start=event.tStartMs/1000; const duration=Math.max(0,(event.dDurationMs||0)/1000);
    if(segments.at(-1)?.text===text) continue;
    segments.push({start,duration,text});
  }
  return segments;
}
export class YtDlpTranscriptProvider {
  async getTranscript(videoId) {
    if(!videoIdPattern.test(videoId)) throw new Error('잘못된 YouTube 영상 ID');
    const dir=await mkdtemp(join(tmpdir(),'sisavideo-v2-sub-'));
    try {
      const url=`https://www.youtube.com/watch?v=${videoId}`;
      // 자막만 다운로드한다. 임시 폴더는 성공·실패 모두 finally에서 제거한다.
      try { await run(['--skip-download','--write-subs','--sub-langs','ko,ko.*','--sub-format','json3','--no-playlist','-o','subtitle.%(ext)s',url],dir); } catch(e) { if(e.code==='ENOENT')throw e; /* 자동 자막을 이어서 확인 */ }
      let files=(await readdir(dir)).filter(x=>/\.ko(?:-[\w-]+)?\.json3$/.test(x)); let source='manual';
      if(!files.length) {
        try { await run(['--skip-download','--write-auto-subs','--sub-langs','ko,ko.*','--sub-format','json3','--no-playlist','-o','subtitle.%(ext)s',url],dir); } catch(e) { if(e.code==='ENOENT')throw e; return null; }
        files=(await readdir(dir)).filter(x=>/\.ko(?:-[\w-]+)?\.json3$/.test(x)); source='auto';
      }
      if(!files.length) return null;
      const file=files.sort((a,b)=>a.length-b.length)[0];
      const segments=parseJson3(await readFile(join(dir,file),'utf8'));
      return segments.length?{videoId,language:'ko',source,segments}:null;
    } finally { await rm(dir,{recursive:true,force:true}); }
  }
}
export { parseJson3 };
