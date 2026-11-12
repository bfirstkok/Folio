import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
fs.mkdirSync('dist/server',{recursive:true});
fs.mkdirSync('dist/.openai',{recursive:true});
const assets={};for(const [route,type] of [['/','text/html; charset=utf-8'],['/app.js','text/javascript; charset=utf-8'],['/editor-model.js','text/javascript; charset=utf-8'],['/editor.js','text/javascript; charset=utf-8'],['/rotation-model.js','text/javascript; charset=utf-8'],['/rotation.js','text/javascript; charset=utf-8'],['/sync.js','text/javascript; charset=utf-8'],['/sync-codec.js','text/javascript; charset=utf-8'],['/sync-worker.js','text/javascript; charset=utf-8'],['/merge.js','text/javascript; charset=utf-8'],['/live.js','text/javascript; charset=utf-8'],['/touch.js','text/javascript; charset=utf-8'],['/pencil-policy.js','text/javascript; charset=utf-8'],['/images.js','text/javascript; charset=utf-8'],['/selection.js','text/javascript; charset=utf-8'],['/style.css','text/css; charset=utf-8']])assets[route]={type,body:fs.readFileSync('web/'+(route==='/'?'index.html':route.slice(1)),'utf8')};
assets['/LICENSE.txt']={type:'text/plain; charset=utf-8',body:fs.readFileSync('LICENSE','utf8')};
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'folio-source-')),archive=path.join(temp,'source.tar.gz');
try{execFileSync(process.platform==='win32'?'tar.exe':'tar',['-czf',archive,'LICENSE','THIRD_PARTY_NOTICES.md','package.json','web','worker','scripts','tests','.openai/hosting.json'],{windowsHide:true});assets['/source.tar.gz']={type:'application/gzip',binary:true,body:fs.readFileSync(archive).toString('base64')}}finally{if(fs.existsSync(archive))fs.unlinkSync(archive);fs.rmdirSync(temp)}
const api=fs.readFileSync('worker/api.mjs','utf8').replaceAll('export ','')+'\n'+fs.readFileSync('worker/live.mjs','utf8').replaceAll('export ','');
fs.writeFileSync('dist/server/index.js',api+'\nconst assets='+JSON.stringify(assets)+';\nexport default {async fetch(request,env){try{const path=new URL(request.url).pathname;if(path==="/api/workspace")return await api(request,env);if(path==="/api/live")return await liveApi(request,env);const asset=assets[path];if(!asset)return new Response("Not found",{status:404});return new Response(asset.binary?Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)):asset.body,{headers:{"Content-Type":asset.type,"Cache-Control":"no-cache","X-Content-Type-Options":"nosniff",...(asset.binary?{"Content-Disposition":"attachment; filename=folio-source.tar.gz"}:{})}})}catch{return Response.json({error:"server_error"},{status:500,headers:{"Cache-Control":"no-store"}})}}};\n');
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built Folio Worker with embedded assets');
