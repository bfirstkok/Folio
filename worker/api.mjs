const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function validState(s){return s&&Array.isArray(s.books)&&s.books.length>0&&s.books.length<=100&&s.books.every(b=>typeof b.id==='string'&&typeof b.title==='string'&&Array.isArray(b.pages)&&b.pages.length>0&&b.pages.length<=200&&b.pages.every(p=>typeof p.id==='string'&&Array.isArray(p.objects)&&p.objects.length<30000&&p.objects.every(o=>o&&typeof o.id==='string'&&typeof o.type==='string'&&Number.isFinite(o.x)&&Number.isFinite(o.y)&&(!o.src||/^data:image\/(png|jpeg|webp|gif);base64,/.test(o.src)))))&&s.books.some(b=>b.id===s.bookId&&b.pages.some(p=>p.id===s.pageId))}
export async function api(request,env){
 const user=request.headers.get('oai-authenticated-user-id');
 if(!user)return json({error:'sign_in_required'},401);
 if(!env.BUCKET)return json({error:'storage_unavailable'},503);
 const key='notebooks/'+encodeURIComponent(user)+'/workspace.json';
 if(request.method==='GET'){
  const obj=await env.BUCKET.get(key);
  if(!obj)return json({state:null,etag:null,user});
  return json({state:await obj.json(),etag:obj.httpEtag,user});
 }
 if(request.method!=='PUT')return json({error:'method_not_allowed'},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'invalid_origin'},403);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'invalid_content_type'},415);
 const expected=request.headers.get('If-Match'),create=request.headers.get('If-None-Match')==='*';
 if(!expected&&!create)return json({error:'precondition_required'},428);
 const limit=25*1024*1024;
 if(Number(request.headers.get('Content-Length'))>limit)return json({error:'too_large'},413);
 const reader=request.body?.getReader();if(!reader)return json({error:'invalid_state'},400);
 const chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();return json({error:'too_large'},413)}chunks.push(value)}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 let s;try{s=JSON.parse(new TextDecoder().decode(bytes))}catch{return json({error:'invalid_json'},400)}
 if(!validState(s))return json({error:'invalid_state'},400);
 const conditions=new Headers(create?{'If-None-Match':'*'}:{'If-Match':expected});
 const obj=await env.BUCKET.put(key,JSON.stringify(s),{onlyIf:conditions,httpMetadata:{contentType:'application/json'}});
 if(!obj)return json({error:'conflict'},409);
 return json({etag:obj.httpEtag,user});
}
