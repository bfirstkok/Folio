// Cloud snapshots use conditional writes. Conflicting books are preserved as copies.
let cloudMeta;try{cloudMeta=JSON.parse(localStorage.getItem('folio-cloud-v1'))||{}}catch{cloudMeta={}}
let cloudReady=false,cloudBusy=false,cloudAuthRequired=false,cloudDirty=!!cloudMeta.dirty||(!cloudMeta.etag&&!!localStorage.getItem('folio-v1')),cloudTimer,changeCounter=0;
let cloudEtag=cloudMeta.etag||null,cloudUser=cloudMeta.user||null;
function cloudStatus(text){$('#saveStatus').textContent=text;$('#cloudBadge').textContent=text}
function meta(){try{localStorage.setItem('folio-cloud-v1',JSON.stringify({etag:cloudEtag,user:cloudUser,dirty:cloudDirty}))}catch{}}
function queueCloud(){cloudDirty=true;changeCounter++;meta();cloudStatus(cloudAuthRequired?'◉ เก็บในเครื่อง · เข้าสู่ระบบเพื่อซิงก์':navigator.onLine?'☁ รอซิงก์…':'◉ ออฟไลน์ · เก็บในเครื่องแล้ว');clearTimeout(cloudTimer);if(!cloudAuthRequired)cloudTimer=setTimeout(()=>syncCloud(),800)}
function mergeBooks(remote,local){const result=structuredClone(remote),ids=new Set(result.books.map(b=>b.id));let copies=0;for(const b of local.books){const other=result.books.find(x=>x.id===b.id);if(!other){result.books.push(structuredClone(b));continue}if(JSON.stringify(b)===JSON.stringify(other))continue;const copy=structuredClone(b);copy.id=uid();copy.title+=' (สำเนาจากเครื่องนี้)';copy.pages.forEach(p=>p.id=uid());result.books.push(copy);copies++}return {state:result,copies}}
function adoptCloud(s){const b=s.books.find(b=>b.id===state.bookId),p=b?.pages.find(p=>p.id===state.pageId);if(b&&p){s.bookId=b.id;s.pageId=p.id}state=s;selected=null;undoStack=[];redoStack=[];try{localStorage.setItem('folio-v1',JSON.stringify(state))}catch{}renderAll();resetView()}
async function cloudFetch(options={}){const response=await fetch('/api/workspace',{...options,cache:'no-store',signal:AbortSignal.timeout(20000)});if(response.status===401){const e=new Error('auth');e.auth=true;throw e}return response}
async function readCloud(){const r=await cloudFetch();if(!r.ok)throw Error('cloud_read');const d=await r.json();if(d.state&&!validState(d.state))throw Error('invalid_cloud_state');return d}
async function syncCloud(initial=false){
 if(cloudAuthRequired||cloudBusy||(!cloudReady&&!initial)||(cloudReady&&(drag||$('#modal').open||importingImages)))return;
 if(!navigator.onLine){cloudStatus('◉ ออฟไลน์ · เก็บในเครื่องแล้ว');if(initial){$('#cloudLoading')?.remove();cloudReady=true}return}
 cloudBusy=true;
 try{
  if(initial||!cloudDirty){
   const before=changeCounter,d=await readCloud();
   if(cloudUser&&cloudUser!==d.user){try{localStorage.setItem('folio-other-account-backup',JSON.stringify(state))}catch{}cloudDirty=false;cloudEtag=null;if(d.state)adoptCloud(d.state);else{const books=demo();adoptCloud({books,bookId:books[0].id,pageId:books[0].pages[0].id})}}
   cloudUser=d.user;
   if(changeCounter!==before||drag||$('#modal').open||(typeof activeInput!=='undefined'&&activeInput)||(typeof navigationGesture!=='undefined'&&navigationGesture)){cloudReady=true;return}
   if(d.state){if(cloudDirty){const merged=mergeBooks(d.state,state);adoptCloud(merged.state);if(merged.copies)toast('เก็บงานที่ต่างกันเป็นสมุดสำเนาแล้ว')}else if(d.etag!==cloudEtag||initial)adoptCloud(d.state)}
   else cloudDirty=true;
   cloudEtag=d.etag;cloudReady=true;meta();
  }
  if(cloudDirty){
   cloudStatus('☁ กำลังซิงก์…');const before=changeCounter,payload=JSON.stringify(state);
   const response=await cloudFetch({method:'PUT',headers:{'Content-Type':'application/json',...(cloudEtag?{'If-Match':cloudEtag}:{'If-None-Match':'*'})},body:payload});
   if(response.status===409){const d=await readCloud();if(d.state){const merged=mergeBooks(d.state,state);adoptCloud(merged.state);if(merged.copies)toast('มีงานจากอีกเครื่อง · เก็บทั้งสองชุดเป็นสมุดสำเนาแล้ว')}cloudEtag=d.etag;cloudDirty=true;meta();cloudStatus('☁ กำลังรวมงานจากอีกเครื่อง…');return}
   if(response.status===413){cloudStatus('พื้นที่งานใหญ่เกินไป · กรุณาส่งออกสำรอง');return}
   if(!response.ok)throw Error('cloud_write');const d=await response.json();cloudEtag=d.etag;cloudUser=d.user;cloudDirty=changeCounter!==before;meta();
  }
  cloudStatus(cloudDirty?'☁ รอซิงก์…':'☁ ซิงก์แล้ว · เปิดต่อได้ทุกเครื่อง');
 }catch(e){cloudStatus(e.auth?'◉ เข้าสู่ระบบเพื่อเปิดสมุดคลาวด์':'◉ เก็บในเครื่องแล้ว · รอเชื่อมต่อคลาวด์');if(e.auth){cloudAuthRequired=true;$('#signInLink').hidden=false;$('#authNotice').hidden=false}}
 finally{cloudBusy=false;if(initial){$('#cloudLoading')?.remove();cloudReady=true}if(cloudDirty&&!cloudAuthRequired){clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>syncCloud(),5000)}}
}
$('#saveStatus').title='คลิกเพื่อตรวจสอบและซิงก์งาน';$('#saveStatus').style.cursor='pointer';$('#saveStatus').onclick=()=>syncCloud();
window.addEventListener('online',()=>syncCloud(true));window.addEventListener('offline',()=>cloudStatus('◉ ออฟไลน์ · เก็บในเครื่องแล้ว'));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncCloud(true);else if(cloudDirty)syncCloud()});
setInterval(()=>{if(!document.hidden)syncCloud()},10000);
syncCloud(true);
