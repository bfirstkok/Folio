let cloudMeta;try{cloudMeta=JSON.parse(localStorage.getItem('folio-cloud-v1'))||{}}catch{cloudMeta={}}
let cloudReady=false,cloudBusy=false,cloudAuthRequired=false,cloudDirty=!!cloudMeta.dirty||(!cloudMeta.etag&&!!localStorage.getItem('folio-v1')),cloudTimer,changeCounter=0;
let cloudEtag=cloudMeta.etag||null,cloudUser=cloudMeta.user||null,cloudBase=null;
function cloudStatus(text){$('#saveStatus').textContent=text;$('#cloudBadge').textContent=text}
function meta(){try{localStorage.setItem('folio-cloud-v1',JSON.stringify({etag:cloudEtag,user:cloudUser,dirty:cloudDirty}))}catch{}}
function interacting(){return !!drag||$('#modal').open||(typeof importingImages!=='undefined'&&importingImages)||(typeof activeInput!=='undefined'&&activeInput)||(typeof navigationGesture!=='undefined'&&navigationGesture)}
function scheduleCloud(force=false,delay=180){clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>syncCloud(force),delay)}
function queueCloud(){cloudDirty=true;changeCounter++;meta();cloudStatus(cloudAuthRequired?'◉ เก็บในเครื่อง · เข้าสู่ระบบเพื่อซิงก์':navigator.onLine?'☁ กำลังซิงก์…':'◉ ออฟไลน์ · เก็บในเครื่องแล้ว');if(!cloudAuthRequired)scheduleCloud()}
function adoptCloud(s,initial=false){const current=s.books.find(b=>b.id===state.bookId),p=current?.pages.find(p=>p.id===state.pageId);if(current&&p){s.bookId=current.id;s.pageId=p.id}const previousPage=page(),nextPage=s.books.find(b=>b.id===s.bookId).pages.find(p=>p.id===s.pageId);if(JSON.stringify(previousPage.objects)!==JSON.stringify(nextPage.objects)){undoStack=[];redoStack=[]}state=s;if(!page().objects.some(o=>o.id===selected))selected=null;try{localStorage.setItem('folio-v1',JSON.stringify(state))}catch{}renderAll();if(initial)resetView();window.dispatchEvent?.(new CustomEvent('folio:remote-update'))}
async function cloudFetch(options={}){const response=await fetch('/api/workspace',{...options,cache:'no-store',signal:AbortSignal.timeout(20000)});if(response.status===401){const e=new Error('auth');e.auth=true;throw e}return response}
async function readCloud(){const r=await cloudFetch();if(!r.ok)throw Error('cloud_read');const d=await r.json();if(d.state&&!validState(d.state))throw Error('invalid_cloud_state');return d}
function mergeRemote(d){const merged=mergeWorkspaces(cloudBase,state,d.state);adoptCloud(merged.state);if(merged.conflicts)toast('แก้ชิ้นเดียวกันจากสองเครื่อง · เก็บสำเนาทั้งสองเวอร์ชันแล้ว');cloudBase=structuredClone(d.state);cloudEtag=d.etag;cloudDirty=true;meta()}
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
   if(d.state){if(cloudDirty&&d.etag!==cloudEtag)mergeRemote(d);else if(!cloudDirty&&(initial||d.etag!==cloudEtag))adoptCloud(d.state,initial);cloudBase=structuredClone(d.state)}else{cloudDirty=true;cloudBase=null}
   cloudEtag=d.etag;cloudReady=true;meta();window.dispatchEvent?.(new CustomEvent('folio:cloud-ready'));
  }
  if(cloudDirty){
   cloudStatus('☁ กำลังซิงก์…');const before=changeCounter,snapshot=structuredClone(state),payload=JSON.stringify(snapshot);
   const r=await cloudFetch({method:'PUT',headers:{'Content-Type':'application/json',...(cloudEtag?{'If-Match':cloudEtag}:{'If-None-Match':'*'})},body:payload});
   if(r.status===409){const d=await readCloud();if(interacting()){retrySoon=true;return}if(d.state)mergeRemote(d);else{cloudEtag=null;cloudBase=null}retrySoon=true;return}
   if(r.status===413){cloudStatus('พื้นที่งานใหญ่เกินไป · กรุณาส่งออกสำรอง');return}if(!r.ok)throw Error('cloud_write');const d=await r.json();cloudEtag=d.etag;cloudUser=d.user;cloudBase=snapshot;cloudDirty=changeCounter!==before;meta();if(!cloudDirty)window.dispatchEvent?.(new CustomEvent('folio:cloud-saved'));
  }
  cloudStatus(cloudDirty?'☁ กำลังซิงก์…':'☁ ซิงก์แล้ว · เปิดต่อได้ทุกเครื่อง');
 }catch(e){cloudStatus(e.auth?'◉ เข้าสู่ระบบเพื่อเปิดสมุดคลาวด์':'◉ เก็บในเครื่องแล้ว · รอเชื่อมต่อคลาวด์');if(e.auth){cloudAuthRequired=true;$('#signInLink').hidden=false;$('#authNotice').hidden=false;window.dispatchEvent?.(new CustomEvent('folio:auth-required'))}}
 finally{cloudBusy=false;if(initial){$('#cloudLoading')?.remove();cloudReady=true}if(!cloudAuthRequired&&(cloudDirty||retrySoon))scheduleCloud(retrySoon,retrySoon?140:700)}
}
$('#saveStatus').title='คลิกเพื่อตรวจสอบและซิงก์งาน';$('#saveStatus').style.cursor='pointer';$('#saveStatus').onclick=()=>syncCloud(true);
window.addEventListener('online',()=>syncCloud(true));window.addEventListener('offline',()=>cloudStatus('◉ ออฟไลน์ · เก็บในเครื่องแล้ว'));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncCloud(true);else if(cloudDirty)syncCloud()});
setInterval(()=>{if(!document.hidden&&(typeof liveConnected==='undefined'||!liveConnected))syncCloud()},1500);
syncCloud(true);
