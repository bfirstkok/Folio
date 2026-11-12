import fs from 'node:fs';
fs.mkdirSync('dist/server',{recursive:true});
fs.mkdirSync('dist/.openai',{recursive:true});
const assets={};for(const [path,type] of [['/','text/html; charset=utf-8'],['/app.js','text/javascript; charset=utf-8'],['/sync.js','text/javascript; charset=utf-8'],['/touch.js','text/javascript; charset=utf-8'],['/style.css','text/css; charset=utf-8']])assets[path]={type,body:fs.readFileSync('web/'+(path==='/'?'index.html':path.slice(1)),'utf8')};
const api=fs.readFileSync('worker/api.mjs','utf8').replaceAll('export ','');
fs.writeFileSync('dist/server/index.js',api+'\nconst assets='+JSON.stringify(assets)+';\nexport default {async fetch(request,env){try{const path=new URL(request.url).pathname;if(path==="/api/workspace")return await api(request,env);const asset=assets[path];if(!asset)return new Response("Not found",{status:404});return new Response(asset.body,{headers:{"Content-Type":asset.type,"Cache-Control":"no-cache","X-Content-Type-Options":"nosniff"}})}catch{return Response.json({error:"server_error"},{status:500,headers:{"Cache-Control":"no-store"}})}}};\n');
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built Folio Worker with embedded assets');
