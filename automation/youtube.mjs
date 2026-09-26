const base='https://www.googleapis.com/youtube/v3';
async function youtube(path,params,key){const url=new URL(`${base}/${path}`); for(const [k,v] of Object.entries({...params,key})) url.searchParams.set(k,String(v)); const response=await fetch(url); if(!response.ok) throw new Error(`YouTube API ${response.status}: ${(await response.text()).slice(0,400)}`); return response.json();}
function seconds(iso){const m=iso.match(/^P(?:([\d.]+)D)?T?(?:([\d.]+)H)?(?:([\d.]+)M)?(?:([\d.]+)S)?$/); return m?Math.round((+(m[1]||0)*86400)+ (+(m[2]||0)*3600)+ (+(m[3]||0)*60)+ +(m[4]||0)):null;}
export async function fetchVideosByIds(ids,apiKey){
  if(!ids.length)return [];
  if(ids.length>50||ids.some(id=>!/^[A-Za-z0-9_-]{11}$/.test(id)))throw new Error('YouTube 영상 ID는 1~50개여야 합니다');
  const details=await youtube('videos',{part:'snippet,contentDetails,status',id:ids.join(',')},apiKey);
  return (details.items||[]).filter(x=>x.status?.privacyStatus==='public').map(x=>({
    youtube_video_id:x.id,channel_youtube_id:x.snippet.channelId,channel_name:x.snippet.channelTitle,title:x.snippet.title,
    video_url:`https://www.youtube.com/watch?v=${x.id}`,
    thumbnail_url:x.snippet.thumbnails?.high?.url||x.snippet.thumbnails?.default?.url||null,
    upload_date:x.snippet.publishedAt?.slice(0,10)||null,duration_seconds:seconds(x.contentDetails.duration),
    description:x.snippet.description||null
  }));
}
export async function discoverChannel(channel,apiKey,max=20){
  const profile=await youtube('channels',{part:'contentDetails',id:channel.youtube_channel_id},apiKey);
  const uploads=profile.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if(!uploads) throw new Error(`업로드 목록 없음: ${channel.channel_name}`);
  const list=await youtube('playlistItems',{part:'contentDetails',playlistId:uploads,maxResults:Math.min(max,50)},apiKey);
  const ids=(list.items||[]).map(x=>x.contentDetails?.videoId).filter(Boolean);
  if(!ids.length)return [];
  return (await fetchVideosByIds(ids,apiKey)).filter(x=>x.channel_youtube_id===channel.youtube_channel_id);
}
