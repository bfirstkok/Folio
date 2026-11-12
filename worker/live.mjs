const liveJson=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
function validPreview(s){return s&&/^[a-zA-Z0-9-]{8,80}$/.test(s.clientId)&&Number.isSafeInteger(s.seq)&&s.seq>=0&&typeof s.bookId==='string'&&s.bookId.length<200&&typeof s.pageId==='string'&&s.pageId.length<200&&Array.isArray(s.objects)&&s.objects.length<=64&&s.objects.every(o=>o&&typeof o.id==='string'&&o.id.length<200&&['path','rect','ellipse','diamond','arrow','text','sticky','image'].includes(o.type)&&Number.isFinite(o.x)&&Number.isFinite(o.y)&&!o.src&&(!o.text||typeof o.text==='string'&&o.text.length<=10000)&&(!o.points||Array.isArray(o.points)&&o.points.length<=12000&&o.points.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))))}
export async function liveApi(request,env,{intervalMs=400,lifetimeMs=25000,now=Date.now}={}){
 const user=request.headers.get('oai-authenticated-user-id');if(!user)return liveJson({error:'sign_in_required'},401);if(!env.BUCKET)return liveJson({error:'storage_unavailable'},503);
 const prefix='notebooks/'+encodeURIComponent(user)+'/',url=new URL(request.url),clientId=url.searchParams.get('client');
 if(request.method==='POST'){
  if(request.headers.get('Origin')!==url.origin)return liveJson({error:'invalid_origin'},403);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return liveJson({error:'invalid_content_type'},415);
  if(Number(request.headers.get('Content-Length'))>1000000)return liveJson({error:'too_large'},413);
  const reader=request.body?.getReader();if(!reader)return liveJson({error:'invalid_preview'},400);const chunks=[];let size=0;for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1000000){await reader.cancel();return liveJson({error:'too_large'},413)}chunks.push(value)}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
  let data;try{data=JSON.parse(new TextDecoder().decode(bytes))}catch{return liveJson({error:'invalid_json'},400)}if(!validPreview(data))return liveJson({error:'invalid_preview'},400);
  const key=prefix+'live/'+data.clientId+'.json';
  for(let attempt=0;attempt<3;attempt++){const old=await env.BUCKET.get(key);if(old){const previous=await old.json();if(previous.seq>=data.seq)return liveJson({ok:true})}const record={...data,updatedAt:now()};const result=await env.BUCKET.put(key,JSON.stringify(record),{onlyIf:new Headers(old?{'If-Match':old.httpEtag}:{'If-None-Match':'*'}),httpMetadata:{contentType:'application/json'}});if(result)return liveJson({ok:true})}
  return liveJson({error:'retry'},409);
 }
 if(request.method!=='GET')return liveJson({error:'method_not_allowed'},405);
 if(!clientId||!/^[a-zA-Z0-9-]{8,80}$/.test(clientId))return liveJson({error:'invalid_client'},400);
 const encoder=new TextEncoder();let alive=true;
 const stream=new ReadableStream({start(controller){const send=(event,data)=>{if(alive)controller.enqueue(encoder.encode('event: '+event+'\ndata: '+JSON.stringify(data)+'\n\n'))};controller.enqueue(encoder.encode('retry: 400\n: '+'.'.repeat(2048)+'\n\n'));const started=now(),seen=new Map();let lastEtag=undefined,lastPeers='',lastList=0;
  async function pump(){try{while(alive&&now()-started<lifetimeMs&&!request.signal.aborted){
   const head=await env.BUCKET.head(prefix+'workspace.json'),etag=head?.httpEtag||null;if(etag!==lastEtag){send('workspace',{etag});lastEtag=etag}
   // Each device has one short-lived preview. List is cached for one second per stream.
   if(now()-lastList>=1000||!lastList){const list=await env.BUCKET.list({prefix:prefix+'live/',limit:1000});lastList=now();const peers=[];for(const item of list.objects){if(item.key===prefix+'live/'+clientId+'.json')continue;if(item.uploaded&&now()-new Date(item.uploaded).getTime()>120000){await env.BUCKET.delete(item.key);continue}peers.push(item.key)}streamPeers=peers}
   const active=[];for(const key of streamPeers){const obj=await env.BUCKET.get(key);if(!obj)continue;const data=await obj.json();if(now()-data.updatedAt>12000)continue;active.push(data.clientId);if(seen.get(key)!==obj.httpEtag){send('preview',data);seen.set(key,obj.httpEtag)}}
   const peersKey=active.sort().join(',');if(peersKey!==lastPeers||now()-started<intervalMs){send('presence',{count:active.length+1});lastPeers=peersKey}
   send('heartbeat',{at:now()});await new Promise(resolve=>setTimeout(resolve,intervalMs));
  }}catch{if(alive){try{send('retry',{})}catch{}}}finally{if(alive){alive=false;try{controller.close()}catch{}}}}
  let streamPeers=[];void pump();
 },cancel(){alive=false}});
 return new Response(stream,{headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no','Content-Encoding':'identity'}});
}
