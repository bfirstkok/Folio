// Installed last: a pointer can only move or end its own stroke.
let pencilPreferences;try{pencilPreferences=JSON.parse(localStorage.getItem('folio-pencil-v2'))}catch{}
const iPadDevice=/iPad/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const pencilPolicy=new PencilPolicy({penOnly:pencilPreferences?.penOnly??iPadDevice,navLocked:pencilPreferences?.navLocked??true,fingerDraw:pencilPreferences?.fingerDraw??false});
const writingBar=document.createElement('div');writingBar.id='writingBar';writingBar.innerHTML='<div class="writing-switches"><button type="button" id="pencilMode" aria-pressed="false">✎ โหมด Apple Pencil</button><button type="button" id="fingerMode">นิ้ว: เลื่อน</button><button type="button" id="navigationLock" aria-pressed="true">🔒 ล็อกกระดาน</button></div><span id="pencilStatus" role="status"></span><button type="button" id="touchUnlock">กดค้างเพื่อแตะเมนู</button>';
$('.editor-top').after(writingBar);
const inputCanvas=$('#canvas'),routedHandlers={down:inputCanvas.onpointerdown,move:inputCanvas.onpointermove,up:inputCanvas.onpointerup,cancel:inputCanvas.onpointercancel};
let lastWritingAt=-Infinity;
let activeInput=null,navigationGesture=null,inkFrame=0,liveInk=null,unlockTimer=0,unlockTicker=0,lastTouchAt=-Infinity,lastPenControlAt=-Infinity;
function persistPencil(){try{localStorage.setItem('folio-pencil-v2',JSON.stringify({penOnly:pencilPolicy.penOnly,navLocked:pencilPolicy.navLocked,fingerDraw:pencilPolicy.fingerDraw}))}catch{}}
function updateWritingBar(){const pen=pencilPolicy.penOnly,open=pen&&pencilPolicy.touchControlsAllowed();document.body.classList.toggle('pencil-mode',pen);document.body.classList.toggle('finger-menu-open',open);$('#pencilMode').setAttribute('aria-pressed',String(pen));$('#pencilMode').textContent=pen?'✎ Apple Pencil: เปิด':'✎ โหมด Apple Pencil';$('#fingerMode').hidden=pen;$('#fingerMode').textContent=pencilPolicy.fingerDraw?'นิ้ว: วาด':'นิ้ว: เลื่อน';$('#navigationLock').hidden=!pen;$('#navigationLock').setAttribute('aria-pressed',String(pencilPolicy.navLocked));$('#navigationLock').textContent=pencilPolicy.navLocked?'🔒 กระดานล็อก':'↔ สองนิ้วเลื่อน / ซูม';$('#touchUnlock').hidden=!pen;$('#touchUnlock').textContent=open?'แตะเมนูได้ '+Math.max(1,Math.ceil((pencilPolicy.controlsUntil-performance.now())/1000))+' วินาที':'กดค้างเพื่อแตะเมนู';$('#pencilStatus').textContent=pen?(open?'ปรับเครื่องมือได้ · กระดานยังกันสัมผัสมือ':pencilPolicy.navLocked?'วางมือเขียนได้ · ใช้ปากกาแตะเครื่องมือ':'ใช้สองนิ้วเลื่อนเมื่อหยุดเขียน'):'เมาส์และปากกาใช้ได้ · เลือกวิธีใช้นิ้วได้';if(pen)$('#toolHint').textContent=pencilPolicy.navLocked?'Apple Pencil เท่านั้น · กระดานล็อก · ใช้ปากกาเลือกเครื่องมือ':'ยกปากกาก่อนใช้สองนิ้วเลื่อนหรือซูม · ล็อกกลับก่อนวางมือเขียน'}
function flushInk(){if(inkFrame){cancelAnimationFrame(inkFrame);inkFrame=0}if(liveInk?.element?.isConnected)liveInk.element.setAttribute('d',strokePath(liveInk.item.points,liveInk.item.x,liveInk.item.y))}
function appendInk(e){const item=liveInk.item;let samples;try{samples=e.getCoalescedEvents?.()}catch{}if(!samples?.length)samples=[e];for(const sample of samples){const p=point(sample),last=item.points[item.points.length-1],x=p.x-item.x,y=p.y-item.y;if(!last||Math.hypot(x-last[0],y-last[1])*zoom>=.3)item.points.push([x,y])}if(!inkFrame)inkFrame=requestAnimationFrame(()=>{inkFrame=0;flushInk()})}
function finishOwned(e,cancelled=false){if(!activeInput||activeInput.id!==e.pointerId)return false;if(liveInk&&!cancelled)appendInk(e);flushInk();liveInk=null;const owned=activeInput;if(owned.type==='pen')lastWritingAt=performance.now();activeInput=null;if(cancelled)routedHandlers.cancel(e);else routedHandlers.up(e);if(owned.type==='pen')pencilPolicy.endPen(e.pointerId);return true}
function changePencilMode(pen){if(activeInput)return;pencilPolicy.penOnly=pen;pencilPolicy.contacts.clear();navigationGesture=null;pencilPolicy.controlsUntil=0;pencilPreferences={penOnly:pen};if(pen){pencilPolicy.navLocked=true;setTool('pen');selected=null;renderSelection()}persistPencil();updateWritingBar();toast(pen?'โหมด Apple Pencil · มือจะไม่เลื่อนกระดานหรือกดเมนู':'ปิดโหมดปากกาแล้ว · เปิดใช้นิ้วได้')}
$('#pencilMode').onclick=()=>changePencilMode(!pencilPolicy.penOnly);$('#fingerMode').onclick=()=>{pencilPolicy.fingerDraw=!pencilPolicy.fingerDraw;persistPencil();updateWritingBar()};$('#navigationLock').onclick=()=>{pencilPolicy.navLocked=!pencilPolicy.navLocked;pencilPolicy.contacts.clear();navigationGesture=null;persistPencil();updateWritingBar();toast(pencilPolicy.navLocked?'ล็อกกระดานแล้ว · วางมือได้':'ปลดล็อกแล้ว · หยุดเขียนก่อนใช้สองนิ้วเลื่อนและซูม')};
function unlockFingerMenu(){if(!pencilPolicy.unlockControls())return;updateWritingBar();clearInterval(unlockTicker);unlockTicker=setInterval(()=>{updateWritingBar();if(!pencilPolicy.touchControlsAllowed())clearInterval(unlockTicker)},200)}
const touchUnlock=$('#touchUnlock');touchUnlock.onpointerdown=e=>{if(e.pointerType!=='touch')return;e.preventDefault();e.stopPropagation();if(pencilPolicy.penId!==null)return;clearTimeout(unlockTimer);touchUnlock.setPointerCapture(e.pointerId);touchUnlock.classList.add('holding');unlockTimer=setTimeout(()=>{touchUnlock.classList.remove('holding');unlockFingerMenu()},700)};function cancelUnlock(){clearTimeout(unlockTimer);touchUnlock.classList.remove('holding')}touchUnlock.onpointerup=touchUnlock.onpointercancel=touchUnlock.onlostpointercapture=cancelUnlock;touchUnlock.onclick=e=>{if(e.pointerType==='touch')return;if(!e.pointerType&&performance.now()-lastTouchAt<1000&&lastPenControlAt<lastTouchAt)return;unlockFingerMenu()};
function isUnlockTarget(target){return !!target?.closest?.('#touchUnlock')}
function stopInput(e){if(e.cancelable)e.preventDefault();e.stopImmediatePropagation()}
// Capture before buttons, links, selects, and compatibility click handlers.
document.addEventListener('pointerdown',e=>{if(e.pointerType==='pen'){pencilPolicy.lastPenAt=performance.now();lastPenControlAt=performance.now();return}if(e.pointerType!=='touch')return;lastTouchAt=performance.now();if(pencilPolicy.penOnly&&!pencilPolicy.touchControlsAllowed()&&!inputCanvas.contains(e.target)&&!isUnlockTarget(e.target))stopInput(e)},{capture:true,passive:false});
function guardClick(e){if(!pencilPolicy.penOnly||e.detail===0)return;if(e.pointerType==='pen')return;const touch=e.pointerType==='touch'||e.sourceCapabilities?.firesTouchEvents||(!e.pointerType&&lastTouchAt>lastPenControlAt&&performance.now()-lastTouchAt<1500);if(!touch)return;if(isUnlockTarget(e.target)){stopInput(e);return}if(!pencilPolicy.touchControlsAllowed())stopInput(e)}
document.addEventListener('click',guardClick,true);document.addEventListener('dblclick',guardClick,true);document.addEventListener('contextmenu',e=>{if(pencilPolicy.penOnly&&inputCanvas.contains(e.target))stopInput(e)},true);
for(const type of ['touchstart','touchmove','touchend'])document.addEventListener(type,e=>{if(!pencilPolicy.penOnly)return;const touches=[...(e.changedTouches||[])];if(touches.some(t=>t.touchType==='stylus'))return;if(isUnlockTarget(e.target))return;if(!pencilPolicy.touchControlsAllowed()&&!inputCanvas.contains(e.target))stopInput(e)},{capture:true,passive:false});
function touchContacts(){return [...pencilPolicy.contacts.values()].filter(p=>p.mode==='gesture')}
function gestureCenter(contacts){return{x:(contacts[0].x+contacts[1].x)/2,y:(contacts[0].y+contacts[1].y)/2,d:Math.hypot(contacts[1].x-contacts[0].x,contacts[1].y-contacts[0].y)}}
inputCanvas.onpointerdown=e=>{
 if(e.pointerType==='pen'){
  lastWritingAt=performance.now();
  if(activeInput?.id===e.pointerId)return;
  if(activeInput)finishOwned({...e,pointerId:activeInput.id},true);
  if(!pencilPreferences){pencilPolicy.penOnly=true;pencilPolicy.navLocked=true;pencilPreferences={penOnly:true};if(['select','hand'].includes(tool))setTool('pen');persistPencil()}
  navigationGesture=null;pencilPolicy.beginPen(e.pointerId);updateWritingBar();
  if(pencilPolicy.penOnly&&pencilPolicy.navLocked&&(space||tool==='hand')){pencilPolicy.endPen(e.pointerId);return}
  activeInput={id:e.pointerId,type:'pen'};routedHandlers.down(e);
  if(drag?.kind==='draw'&&drag.item.type==='path'){const item=drag.item,element=$('#objects').lastElementChild?.querySelector('path');liveInk={item,element}}
  return;
 }
 if(e.pointerType==='touch'){
  e.preventDefault();const mode=pencilPolicy.beginTouch(e);if(mode==='ignore')return;inputCanvas.setPointerCapture(e.pointerId);
  if(mode==='draw'){if(activeInput)return;activeInput={id:e.pointerId,type:'touch'};routedHandlers.down(e);return}
  const contacts=touchContacts();
  if(pencilPolicy.penOnly){if(contacts.length===2){const c=gestureCenter(contacts);navigationGesture={...c,pan:{...pan},zoom,kind:'pinch',started:performance.now()}}}
  else if(contacts.length===1)navigationGesture={x:e.clientX,y:e.clientY,pan:{...pan},zoom,kind:'pan'};
  else if(contacts.length===2){const c=gestureCenter(contacts);navigationGesture={...c,pan:{...pan},zoom,kind:'pinch',started:performance.now()}}
  return;
 }
 if(e.pointerType==='mouse'||!e.pointerType){if(activeInput)return;if(pencilPolicy.penOnly&&pencilPolicy.navLocked&&(space||tool==='hand'||e.button===1))return;activeInput={id:e.pointerId,type:'mouse'};routedHandlers.down(e)}
};
inputCanvas.onpointermove=e=>{
 if(activeInput?.id===e.pointerId){if(activeInput.type==='pen')lastWritingAt=performance.now();if(liveInk&&activeInput.type==='pen')appendInk(e);else routedHandlers.move(e);return}
 if(e.pointerType!=='touch')return;const contact=pencilPolicy.contacts.get(e.pointerId);if(!contact||contact.mode!=='gesture'||pencilPolicy.nearPen())return;contact.x=e.clientX;contact.y=e.clientY;const contacts=touchContacts(),g=navigationGesture;if(!g)return;e.preventDefault();
 if(g.kind==='pinch'&&contacts.length===2){if(pencilPolicy.penOnly&&(pencilPolicy.navLocked||performance.now()-g.started<100))return;const c=gestureCenter(contacts),r=inputCanvas.getBoundingClientRect();zoom=Math.max(.15,Math.min(4,g.zoom*c.d/Math.max(1,g.d)));pan={x:c.x-r.left-(g.x-r.left-g.pan.x)*zoom/g.zoom,y:c.y-r.top-(g.y-r.top-g.pan.y)*zoom/g.zoom};transform()}
 else if(g.kind==='pan'&&!pencilPolicy.penOnly){pan={x:g.pan.x+e.clientX-g.x,y:g.pan.y+e.clientY-g.y};transform()}
};
function finishPointer(e,cancelled){if(e.pointerType==='touch'){pencilPolicy.endTouch(e.pointerId);if(touchContacts().length<2&&navigationGesture?.kind==='pinch')navigationGesture=null;if(!touchContacts().length)navigationGesture=null}finishOwned(e,cancelled)}
inputCanvas.onpointerup=e=>finishPointer(e,false);inputCanvas.onpointercancel=e=>finishPointer(e,true);inputCanvas.addEventListener('lostpointercapture',e=>{if(activeInput?.id===e.pointerId)finishPointer(e,true)});
inputCanvas.addEventListener('wheel',e=>{if(pencilPolicy.penOnly&&pencilPolicy.navLocked)stopInput(e)},{capture:true,passive:false});
function clearInput(){flushInk();liveInk=null;if(activeInput){routedHandlers.up({pointerId:activeInput.id});activeInput=null}pencilPolicy.clear();navigationGesture=null;cancelUnlock();updateWritingBar()}
window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInput()});
if(iPadDevice&&!pencilPreferences){pencilPreferences={penOnly:true};persistPencil()}if(pencilPolicy.penOnly)setTool('pen');updateWritingBar();
