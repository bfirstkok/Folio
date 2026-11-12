// Input ownership and touch suppression are independent of DOM rendering.
class PencilPolicy {
 constructor({penOnly=false,navLocked=true,fingerDraw=false,clock=()=>performance.now()}={}){Object.assign(this,{penOnly,navLocked,fingerDraw,clock});this.penId=null;this.lastPenAt=-Infinity;this.controlsUntil=0;this.contacts=new Map()}
 beginPen(id){this.penId=id;this.lastPenAt=this.clock();this.contacts.clear();this.controlsUntil=0}
 endPen(id){if(this.penId!==id)return false;this.penId=null;this.lastPenAt=this.clock();return true}
 nearPen(){return this.penId!==null||this.clock()-this.lastPenAt<1200}
 touchMode(e){if(this.nearPen())return 'ignore';if(this.penOnly){if(this.navLocked||Math.max(e.width||1,e.height||1)>35)return 'ignore';return 'gesture'}return this.fingerDraw?'draw':'gesture'}
 beginTouch(e){const contact={x:e.clientX,y:e.clientY,mode:this.touchMode(e)};this.contacts.set(e.pointerId,contact);return contact.mode}
 endTouch(id){const contact=this.contacts.get(id);this.contacts.delete(id);return contact}
 unlockControls(){if(this.penId!==null)return false;this.controlsUntil=this.clock()+8000;return true}
 touchControlsAllowed(){return !this.penOnly||(this.penId===null&&this.clock()<this.controlsUntil)}
 clear(){this.penId=null;this.contacts.clear();this.controlsUntil=0;this.lastPenAt=this.clock()}
}
