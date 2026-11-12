let cloudMeta;try{cloudMeta=JSON.parse(localStorage.getItem('folio-cloud-v1'))||{}}catch{cloudMeta={}}
let cloudReady=false,cloudBusy=false,cloudAuthRequired=false,cloudDirty=!!cloudMeta.dirty||(!cloudMeta.etag&&!!localStorage.getItem('folio-v1')),cloudTimer,changeCounter=0;
let cloudEtag=cloudMeta.etag||null,cloudUser=cloudMeta.user||null,cloudBase=null;
let workspaceBridge;try{workspaceBridge=typeof Worker!=='undefined'?new WorkspaceBridge():null}catch{workspaceBridge=null}
let persistenceTimer,persistenceWarned=false;
function persistWorkspace(){clearTimeout(persistenceTimer);persistenceTimer=setTimeout(async()=>{if(typeof activeInput!=='undefined'&&activeInput?.type==='pen'){persistWorkspace();return}const metadata={etag:cloudEtag,user:cloudUser,dirty:cloudDirty};try{if(workspaceBridge&&!workspaceBridge.failed)await workspaceBridge.persist(snapshotWorkspace(state,drag?.item),metadata);else{if(interacting()){persistWorkspace();return}localStorage.setItem('folio-v1',JSON.stringify(state))}}catch{if(!persistenceWarned){persistenceWarned=true;toast('บันทึกในเครื่องไม่ได้ งานจะยังซิงก์ผ่านคลาวด์เมื่อออนไลน์')}}},45)}
function cloudStatus(text){$('#saveStatus').textContent=text;$('#cloudBadge').textContent=text}
function meta(){try{localStorage.setItem('folio-cloud-v1',JSON.stringify({etag:cloudEtag,user:cloudUser,dirty:cloudDirty}))}catch{}}
function interacting(){return !!drag||(typeof inlineTextEditor!=='undefined'&&!!inlineTextEditor)||$('#modal').open||(typeof importingImages!=='undefined'&&importingImages)||(typeof activeInput!=='undefined'&&activeInput)||(typeof navigationGesture!=='undefined'&&navigationGesture)||(typeof lastWritingAt!=='undefined'&&performance.now()-lastWritingAt<1400)}
function scheduleCloud(force=false,delay=180){clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>syncCloud(force),delay)}
function queueCloud(){cloudDirty=true;changeCounter++;meta();cloudStatus(cloudAuthRequired?'◉ เก็บในเครื่อง · เข้าสู่ระบบเพื่อซิงก์':navigator.onLine?'☁ กำลังซิงก์…':'◉ ออฟไลน์ · เก็บในเครื่องแล้ว');if(!cloudAuthRequired)scheduleCloud()}
function adoptCloud(s,initial=false){const current=s.books.find(b=>b.id===state.bookId),p=current?.pages.find(p=>p.id===state.pageId);if(current&&p){s.bookId=current.id;s.pageId=p.id}if(typeof finishHistory==='function')finishHistory();state=s;if(!page().objects.some(o=>o.id===selected))selected=null;renderAll();if(initial)resetView();persistWorkspace();window.dispatchEvent?.(new CustomEvent('folio:remote-update'))}
async function cloudFetch(options={}){let response;if(workspaceBridge&&!workspaceBridge.failed)response=await workspaceBridge.transport(options,state);else{const fallback={...options,cache:'no-store',signal:AbortSignal.timeout(20000)};if(options.workspace){fallback.body=JSON.stringify(options.workspace);delete fallback.workspace}response=await fetch('/api/workspace',fallback)}if(response.status===401){const e=new Error('auth');e.auth=true;throw e}return response}
async function readCloud(){const r=await cloudFetch();if(!r.ok)throw Error('cloud_read');const d=await r.json();if(d.state&&!validState(d.state))throw Error('invalid_cloud_state');return d}
async function mergeRemote(d){const before=changeCounter,merged=workspaceBridge&&!workspaceBridge.failed?await workspaceBridge.merge(cloudBase,state,d.state):mergeWorkspaces(cloudBase,state,d.state);if(changeCounter!==before||interacting())return false;adoptCloud(merged.state);if(merged.conflicts)toast('แก้ชิ้นเดียวกันจากสองเครื่อง · เก็บสำเนาทั้งสองเวอร์ชันแล้ว');cloudBase=snapshotWorkspace(d.state);cloudEtag=d.etag;cloudDirty=true;meta();return true}
async function syncCloud(forceRead=false){
 if(cloudAuthRequired||cloudBusy)return;const initial=!cloudReady;if(!initial&&interacting()){scheduleCloud(forceRead,140);return}
 if(!navigator.onLine){cloudStatus('◉ ออฟไลน์ · เก็บในเครื่องแล้ว');if(initial){$('#cloudLoading')?.remove();cloudReady=true}return}
 cloudBusy=true;let retrySoon=false;
 try{
  if(initial||forceRead||!cloudDirty){
   const before=changeCounter,d=await readCloud();
   if(changeCounter!==before||interacting()){retrySoon=true;return}
   if(cloudUser&&cloudUser!==d.user){try{localStorage.setItem('folio-other-account-backup',JSON.stringify(state))}catch{}cloudDirty=false;cloudBase=null;cloudEtag=null;if(!d.state){const books=demo();adoptCloud({books,bookId:books[0].id,pageId:books[0].pages[0].id},true)}}
   cloudUser=d.user;
   if(d.state){if(cloudDirty&&d.etag!==cloudEtag){if(!await mergeRemote(d)){retrySoon=true;return}}else if(!cloudDirty&&(initial||d.etag!==cloudEtag))adoptCloud(d.state,initial);cloudBase=typeof snapshotWorkspace==='function'?snapshotWorkspace(d.state):structuredClone(d.state)}else{cloudDirty=true;cloudBase=null}
   cloudEtag=d.etag;cloudReady=true;meta();window.dispatchEvent?.(new CustomEvent('folio:cloud-ready'));
  }
  if(cloudDirty){
   cloudStatus('☁ ซิงก์เบื้องหลัง · เขียนต่อได้');const before=changeCounter,snapshot=snapshotWorkspace(state);
   const r=await cloudFetch({method:'PUT',headers:{'Content-Type':'application/json',...(cloudEtag?{'If-Match':cloudEtag}:{'If-None-Match':'*'})},workspace:snapshot});
   if(r.status===409){const d=await readCloud();if(interacting()){retrySoon=true;return}if(d.state)await mergeRemote(d);else{cloudEtag=null;cloudBase=null}retrySoon=true;return}
   if(r.status===413){cloudStatus('พื้นที่งานใหญ่เกินไป · กรุณาส่งออกสำรอง');return}if(!r.ok)throw Error('cloud_write');const d=await r.json();cloudEtag=d.etag;cloudUser=d.user;cloudBase=snapshot;cloudDirty=changeCounter!==before;meta();persistWorkspace();if(!cloudDirty)window.dispatchEvent?.(new CustomEvent('folio:cloud-saved'));
  }
  cloudStatus(cloudDirty?'☁ กำลังซิงก์…':'☁ ซิงก์แล้ว · เปิดต่อได้ทุกเครื่อง');
 }catch(e){cloudStatus(e.auth?'◉ เข้าสู่ระบบเพื่อเปิดสมุดคลาวด์':'◉ เก็บในเครื่องแล้ว · รอเชื่อมต่อคลาวด์');if(e.auth){cloudAuthRequired=true;$('#signInLink').hidden=false;$('#authNotice').hidden=false;window.dispatchEvent?.(new CustomEvent('folio:auth-required'))}}
 finally{cloudBusy=false;if(initial){$('#cloudLoading')?.remove();cloudReady=true}if(!cloudAuthRequired&&(cloudDirty||retrySoon))scheduleCloud(retrySoon,retrySoon?140:700)}
}
$('#saveStatus').title='คลิกเพื่อตรวจสอบและซิงก์งาน';$('#saveStatus').style.cursor='pointer';$('#saveStatus').onclick=()=>syncCloud(true);
window.addEventListener('online',()=>syncCloud(true));window.addEventListener('offline',()=>cloudStatus('◉ ออฟไลน์ · เก็บในเครื่องแล้ว'));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncCloud(true);else if(cloudDirty)syncCloud()});
setInterval(()=>{if(!document.hidden&&(typeof liveConnected==='undefined'||!liveConnected))syncCloud()},1500);
async function startWorkspaceSync(){if(workspaceBridge){try{const cached=await workspaceBridge.load();if(cached?.state&&validState(cached.state)){state=cached.state;if(cached.meta){cloudEtag=cached.meta.etag||null;cloudUser=cached.meta.user||null;cloudDirty=!!cached.meta.dirty}renderAll();resetView();meta()}}catch{}}syncCloud(true)}
startWorkspaceSync();
