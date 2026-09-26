import { readFile } from 'node:fs/promises';
import { YtDlpTranscriptProvider } from './transcripts/ytdlp.mjs';
const videoId=process.argv[2]; if(!/^[A-Za-z0-9_-]{11}$/.test(videoId||'')) throw new Error('사용법: node automation/prepare.mjs VIDEO_ID');
const candidates=JSON.parse(await readFile(new URL('./out/candidates.json',import.meta.url),'utf8'));
const candidate=candidates.find(x=>x.youtube_video_id===videoId); if(!candidate)throw new Error('후보 목록에 영상이 없습니다');
const transcript=await new YtDlpTranscriptProvider().getTranscript(videoId);
if(!transcript) {process.stdout.write(JSON.stringify({candidate,caption_status:'unavailable',message:'한국어 자막 없음. 문제 생성 중단.'},null,2));process.exit(0);}
// 자막 원문은 표준 출력에만 보인다. yt-dlp 임시 파일은 provider가 이미 삭제했다.
process.stdout.write(JSON.stringify({candidate,transcript},null,2));
