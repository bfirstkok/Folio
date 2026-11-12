importScripts('/sync-codec.js','/merge.js');
const codec=new WorkspaceCodec('worker-'+crypto.randomUUID()),uid=()=>crypto.randomUUID();
codec.deep=true;
let databasePromise,persistPending=null,persisting=false;
function database(){if(typeof indexedDB==='undefined')return Promise.resolve(null);if(!databasePromise)databasePromise=new Promise((resolve,reject)=>{const r=indexedDB.open('folio-workspace-cache',1);r.onupgradeneeded=()=>r.result.createObjectStore('workspaces');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return databasePromise}
async function readCache(){const db=await database();if(!db)return null;return await new Promise((resolve,reject)=>{const r=db.transaction('workspaces').objectStore('workspaces').get('latest');r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}
async function persistCache(value){persistPending=value;if(persisting)return{queued:true};persisting=true;try{const db=await database();if(!db)return{supported:false};while(persistPending){const item=persistPending;persistPending=null;await new Promise((resolve,reject)=>{const t=db.transaction('workspaces','readwrite');t.objectStore('workspaces').put(item,'latest');t.oncomplete=resolve;t.onerror=()=>reject(t.error)})}return{saved:true}}finally{persisting=false}}
self.onmessage=async e=>{const {id,type,states=[],options,upload,wire,meta}=e.data;try{for(const bundle of states){codec.receive(bundle);codec.unpack(bundle.wire)}
 if(type==='fetch'){const requestOptions={method:options.method,headers:options.headers,cache:'no-store',signal:AbortSignal.timeout(20000)};if(upload)requestOptions.body=JSON.stringify(codec.unpack(upload));const response=await fetch('/api/workspace',requestOptions);let data;try{data=await response.json()}catch{data={error:'invalid_response'}}let bundle;if(data.state){bundle=codec.pack(data.state);delete data.state}self.postMessage({id,result:{status:response.status,data},bundle});return}
 if(type==='merge'){const merged=mergeWorkspaces(e.data.base?codec.unpack(e.data.base):null,codec.unpack(e.data.local),codec.unpack(e.data.remote));self.postMessage({id,result:{conflicts:merged.conflicts},bundle:codec.pack(merged.state)});return}
 if(type==='persist'){const result=await persistCache({state:codec.unpack(wire),meta,savedAt:Date.now()});self.postMessage({id,result});return}
 if(type==='load'){let cached;try{cached=await readCache()}catch{cached=null}self.postMessage({id,result:{meta:cached?.meta},bundle:cached?.state?codec.pack(cached.state):undefined});return}
 self.postMessage({id,error:'unknown_sync_operation'});
 }catch(error){self.postMessage({id,error:error.message||'sync_failed'})}};
