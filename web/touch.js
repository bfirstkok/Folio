// Stylus draws; fingers navigate by default. Two fingers always pan and pinch.
const pointers=new Map();let gesture=null,fingerDraw=false,penActive=false;
const fingerButton=document.createElement('button');fingerButton.className='touch-draw';fingerButton.textContent='นิ้ว: เลื่อน';fingerButton.title='สลับระหว่างใช้นิ้วเลื่อนกระดานกับวาด';fingerButton.onclick=()=>{fingerDraw=!fingerDraw;fingerButton.textContent=fingerDraw?'นิ้ว: วาด':'นิ้ว: เลื่อน';fingerButton.setAttribute('aria-pressed',fingerDraw);toast(fingerDraw?'ใช้นิ้ววาดได้ · สองนิ้วเลื่อนและซูม':'ใช้นิ้วเลื่อน · ใช้ปากกาสไตลัสวาด')};$('.editor-settings').prepend(fingerButton);
const down=$('#canvas').onpointerdown,move=$('#canvas').onpointermove,up=$('#canvas').onpointerup,cancel=$('#canvas').onpointercancel;
function touchCenter(){const a=[...pointers.values()];return{x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2,d:Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y)}}
$('#canvas').onpointerdown=e=>{
 if(e.pointerType==='pen')penActive=true;
 if(e.pointerType!=='touch'){down(e);return}
 e.preventDefault();if(penActive)return;
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});$('#canvas').setPointerCapture(e.pointerId);
 if(pointers.size>=2){if(drag?.kind==='draw'){page().objects=page().objects.filter(o=>o!==drag.item);render()}drag=null;const c=touchCenter();gesture={...c,zoom,pan:{...pan}};return}
 if(!fingerDraw&&['pen','highlight','eraser','hand'].includes(tool)){drag={kind:'pan',cx:e.clientX,cy:e.clientY,original:{...pan}};return}
 down(e)
};
$('#canvas').onpointermove=e=>{
 if(e.pointerType==='touch'){
  if(penActive)return;if(!pointers.has(e.pointerId))return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(gesture&&pointers.size>=2){e.preventDefault();const c=touchCenter(),r=$('#canvas').getBoundingClientRect();zoom=Math.max(.15,Math.min(4,gesture.zoom*c.d/Math.max(1,gesture.d)));pan={x:c.x-r.left-(gesture.x-r.left-gesture.pan.x)*zoom/gesture.zoom,y:c.y-r.top-(gesture.y-r.top-gesture.pan.y)*zoom/gesture.zoom};transform();return}
 }move(e)
};
function touchEnd(e){if(e.pointerType==='pen')penActive=false;if(e.pointerType==='touch'){pointers.delete(e.pointerId);if(gesture){if(pointers.size<2)gesture=null;drag=null;return}}up(e)}
$('#canvas').onpointerup=touchEnd;$('#canvas').onpointercancel=touchEnd;
window.addEventListener('blur',()=>{pointers.clear();gesture=null;penActive=false});
