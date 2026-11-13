// Everyday tools stay visible; the complete Ribbon is one click away.
let easyMode=true;
try{easyMode=localStorage.getItem('folio-easy-mode')!=='false'}catch{}
const easyToolbar=document.createElement('div');
easyToolbar.id='easyToolbar';
easyToolbar.setAttribute('role','toolbar');
easyToolbar.setAttribute('aria-label','เครื่องมือที่ใช้บ่อย');
easyToolbar.innerHTML='<div class="easy-tools"><button type="button" data-easy-tool="select">↖ เลือก / ย้าย</button><button type="button" data-easy-tool="hand">✋ เลื่อน</button><button type="button" data-easy-tool="pen">✎ เขียน</button><span class="easy-divider"></span><button type="button" id="easyText"><b>T</b> ข้อความ</button><button type="button" id="easySticky">▣ โน้ต</button><button type="button" id="easyShapes" aria-expanded="false">◇ รูปทรง ▾</button><button type="button" id="easyImage">▧ รูป / GIF</button></div><div class="easy-history"><button type="button" id="easyUndo" aria-label="ย้อนกลับ" title="ย้อนกลับ Ctrl/⌘+Z">↶</button><button type="button" id="easyRedo" aria-label="ทำซ้ำ" title="ทำซ้ำ Ctrl/⌘+Shift+Z">↷</button></div><button type="button" id="easyModeToggle" aria-expanded="false">เครื่องมือทั้งหมด ▾</button>';
ribbon.before(easyToolbar);
const shapeMenu=document.createElement('div');
shapeMenu.id='easyShapeMenu';shapeMenu.hidden=true;shapeMenu.setAttribute('aria-label','เลือกรูปทรง');
for(const shape of diagramStencils){const b=document.createElement('button');b.type='button';b.textContent=shape.label;b.onclick=()=>{closeEasyShapes();insertDiagramShape(shape.key)};shapeMenu.append(b)}
easyToolbar.append(shapeMenu);
function closeEasyShapes(){shapeMenu.hidden=true;$('#easyShapes').setAttribute('aria-expanded','false')}
function setEasyMode(value){easyMode=value;document.body.classList.toggle('easy-mode',value);$('#easyModeToggle').textContent=value?'เครื่องมือทั้งหมด ▾':'โหมดใช้ง่าย ▴';$('#easyModeToggle').setAttribute('aria-expanded',String(!value));try{localStorage.setItem('folio-easy-mode',String(value))}catch{}closeEasyShapes()}
$('#easyModeToggle').onclick=()=>setEasyMode(!easyMode);
$('#easyShapes').onclick=()=>{shapeMenu.hidden=!shapeMenu.hidden;$('#easyShapes').setAttribute('aria-expanded',String(!shapeMenu.hidden))};
$('#easyText').onclick=()=>addEditableText();$('#easySticky').onclick=()=>addEditableText('sticky');$('#easyImage').onclick=()=>$('#imageInput').click();
$('#easyUndo').onclick=()=>history(false);$('#easyRedo').onclick=()=>history(true);
for(const button of easyToolbar.querySelectorAll('[data-easy-tool]'))button.onclick=()=>{closeEasyShapes();commitInlineText();if(button.dataset.easyTool==='pen')selectGroup([]);setTool(button.dataset.easyTool);renderSelection()};
document.addEventListener('pointerdown',e=>{if(!easyToolbar.contains(e.target))closeEasyShapes()},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeEasyShapes()});

const objectToolbar=document.createElement('div');objectToolbar.id='objectToolbar';objectToolbar.hidden=true;
objectToolbar.setAttribute('role','toolbar');objectToolbar.setAttribute('aria-label','แก้ไขชิ้นงานที่เลือก');
objectToolbar.innerHTML='<span id="easySelectionLabel"></span><button type="button" id="easyEditText">แก้ข้อความ</button><select id="easyFontSize" aria-label="ขนาดตัวอักษรที่เลือก"><option>14</option><option>18</option><option>22</option><option>28</option><option>36</option><option>48</option><option>64</option></select><button type="button" id="easyBold" aria-label="ตัวหนาที่เลือก"><b>B</b></button><input type="color" id="easyFill" aria-label="สีพื้นชิ้นงานที่เลือก"><span class="easy-divider"></span><button type="button" id="easyFormat">รูปแบบ</button><button type="button" id="easyDuplicate">⧉ สำเนา</button><button type="button" id="easyLock" aria-pressed="false">🔒 ล็อก</button><button type="button" id="easyDelete">ลบ</button>';
$('#canvasWrap').append(objectToolbar);
const emptyHint=document.createElement('div');emptyHint.id='easyEmptyHint';emptyHint.innerHTML='<strong>เริ่มได้เลยบนพื้นที่นี้</strong><span>เพิ่มข้อความ รูปภาพ หรือรูปทรงจากแถบด้านบน<br>ดับเบิลคลิกชิ้นงานเพื่อแก้ข้อความ · ลากเพื่อย้าย</span>';$('#canvasWrap').append(emptyHint);
const lockedNotice=document.createElement('div');lockedNotice.id='lockedNotice';lockedNotice.hidden=true;lockedNotice.textContent='🔒 ล็อกชิ้นงานแล้ว · กด “ปลดล็อก” เพื่อแก้ไข';$('#canvasWrap').append(lockedNotice);
const easyInk=document.createElement('div');easyInk.id='easyInk';easyInk.hidden=true;easyInk.setAttribute('role','toolbar');easyInk.setAttribute('aria-label','ตั้งค่าปากกา');easyInk.innerHTML='<span>เครื่องมือเขียน</span><button type="button" data-ink="pen">ปากกา</button><button type="button" data-ink="highlight">ไฮไลต์</button><button type="button" data-ink="eraser">ยางลบ</button><input type="color" id="easyInkColor" aria-label="สีหมึก"><select id="easyInkWidth" aria-label="ขนาดหมึก"><option value="2.5">บาง</option><option value="5">กลาง</option><option value="10">หนา</option></select>';$('#canvasWrap').append(easyInk);
for(const b of easyInk.querySelectorAll('[data-ink]'))b.onclick=()=>{selectGroup([]);setTool(b.dataset.ink);renderSelection()};
$('#easyInkColor').onchange=e=>{color=e.target.value;$('#customColor').value=color};$('#easyInkWidth').onchange=e=>{width=Number(e.target.value);$('#strokeWidth').value=String(width);e.target.blur()};
function toggleObjectLock(){commitInlineText();const objects=selectedObjects();if(!objects.length)return;if(drag){if(typeof clearInput==='function')clearInput();endDrag()}const locked=!objects.every(isObjectLocked),updates=setEditorObjectsLocked(objects,locked,arrowPoints),index=indexSceneObjects(page().objects);checkpoint();for(const next of updates){const current=index.get(next.id);if(!current)continue;if(locked&&next.type==='arrow'){delete current.from;delete current.to}Object.assign(current,next)}render(updates.map(o=>index.get(o.id)));save();toast(locked?'ล็อกแล้ว · ชิ้นงานจะไม่ขยับหรือถูกแก้ไข':'ปลดล็อกแล้ว · แก้ไขได้ตามปกติ')}
$('#easyLock').onclick=toggleObjectLock;
$('#easyEditText').onclick=()=>{const o=selectedObjects()[0];if(o)startInlineText(o)};
$('#easyFontSize').onchange=e=>{changeTextProperty('fontSize',Number(e.target.value));e.target.blur()};
$('#easyBold').onclick=()=>{const o=selectedObjects().find(o=>!isObjectLocked(o)&&textDiagramTypes.has(o.type));changeTextProperty('fontWeight',o?.fontWeight===700?400:700)};
$('#easyFill').onchange=e=>applyDiagramFormat('fill',e.target.value);
$('#easyFormat').onclick=()=>toggleFormatPane(formatPane.hidden);
$('#easyDuplicate').onclick=()=>$('#editDuplicate').click();$('#easyDelete').onclick=deleteGroupSelection;

// Avoid rebuilding controls or scanning all scene objects on each pointer frame.
let easySelectionSignature='';
function updateEasyControls(){
 const objects=selectedObjects(),editable=objects.filter(o=>!isObjectLocked(o)),first=objects[0],text=editable.find(o=>textDiagramTypes.has(o.type)),fill=editable.find(o=>formatApplicable(o,'fill')),allLocked=objects.length>0&&!editable.length;
 const signature=[state.bookId,state.pageId,objects.length,editable.length,first?.id,text?.id,text?.fontSize,text?.fontWeight,fill?.fill,!!inlineTextEditor,tool,color,width,$('#editUndo').disabled,$('#editRedo').disabled,page().objects.length].join('|');
 if(signature===easySelectionSignature)return;easySelectionSignature=signature;
 objectToolbar.hidden=!objects.length||!!inlineTextEditor||tool!=='select';lockedNotice.hidden=!allLocked||tool!=='select';
 easyInk.hidden=!['pen','highlight','eraser'].includes(tool)||!!inlineTextEditor;$('#easyInkColor').value=color;$('#easyInkWidth').value=String(width);for(const b of easyInk.querySelectorAll('[data-ink]'))b.setAttribute('aria-pressed',String(b.dataset.ink===tool));
 emptyHint.hidden=page().objects.length>0||!!inlineTextEditor||!['select','hand'].includes(tool);
 $('#easySelectionLabel').textContent=allLocked?'ล็อกแล้ว':objects.length>1?objects.length+' ชิ้น':'';
 $('#easyLock').textContent=allLocked?'🔓 ปลดล็อก':'🔒 ล็อก';$('#easyLock').setAttribute('aria-pressed',String(allLocked));
 $('#easyDelete').disabled=!editable.length;$('#editDelete').disabled=!editable.length;$('#easyFormat').disabled=!editable.length;
 const canEdit=objects.length===1&&textDiagramTypes.has(first?.type)&&!isObjectLocked(first);
 $('#easyEditText').hidden=!canEdit;$('#easyFontSize').hidden=!text;$('#easyBold').hidden=!text;$('#easyFill').hidden=!fill;
 if(text){const value=String(text.fontSize||17),field=$('#easyFontSize');if(![...field.options].some(o=>o.value===value))field.add(new Option(value,value));field.value=value;$('#easyBold').setAttribute('aria-pressed',String(text.fontWeight===700))}if(fill)$('#easyFill').value=fill.fill||'#edf2e4';
 $('#easyUndo').disabled=$('#editUndo').disabled;$('#easyRedo').disabled=$('#editRedo').disabled;
 for(const button of easyToolbar.querySelectorAll('[data-easy-tool]'))button.setAttribute('aria-pressed',String(button.dataset.easyTool===tool));
}
const selectionBeforeEasy=renderSelection;renderSelection=function(){selectionBeforeEasy();const objects=selectedObjects(),locked=objects.filter(isObjectLocked);if(locked.length){for(const o of locked.slice(0,150)){const b=selectionBounds(o),g=svg('g',{'pointer-events':'none'},$('#selection'));svg('rect',{x:b.x-6,y:b.y-6,width:b.w+12,height:b.h+12,rx:3/zoom,fill:'none',stroke:'#8268b2','stroke-width':2/zoom},g);svg('text',{x:b.x+b.w,y:b.y-12/zoom,'font-size':16/zoom,'text-anchor':'end'},g).textContent='🔒'}}if(objects.length===1&&isObjectLocked(objects[0]))$('#imageTools').hidden=true;updateEasyControls()};
const toolBeforeEasy=setTool;setTool=function(value){toolBeforeEasy(value);updateEasyControls()};
const editActionsBeforeEasy=updateEditActions;updateEditActions=function(){editActionsBeforeEasy();updateEasyControls()};
setEasyMode(easyMode);if(easyMode)showSidebarStencils(false);updateEasyControls();
// The notebook list remains reachable when the iPad layout hides the sidebar.
const mobileBooks=document.createElement('button');mobileBooks.id='mobileBooks';mobileBooks.type='button';mobileBooks.textContent='☰ สมุด';mobileBooks.setAttribute('aria-expanded','false');mobileBooks.setAttribute('aria-controls','bookNavigation');$('header').prepend(mobileBooks);
const closeBooks=document.createElement('button');closeBooks.id='closeMobileBooks';closeBooks.type='button';closeBooks.textContent='ปิดรายการสมุด ×';$('.sidebar').prepend(closeBooks);
const booksBackdrop=document.createElement('div');booksBackdrop.id='booksBackdrop';booksBackdrop.hidden=true;document.body.append(booksBackdrop);
function toggleMobileBooks(open,restoreFocus=true){document.body.classList.toggle('mobile-books-open',open);booksBackdrop.hidden=!open;mobileBooks.setAttribute('aria-expanded',String(open));if(open){showSidebarStencils(false);closeBooks.focus()}else if(restoreFocus)mobileBooks.focus()}
mobileBooks.onclick=()=>toggleMobileBooks(!document.body.classList.contains('mobile-books-open'));closeBooks.onclick=booksBackdrop.onclick=()=>toggleMobileBooks(false);
$('.sidebar').addEventListener('click',e=>{if(e.target.closest('#books button,#newBook'))toggleMobileBooks(false,false)},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('mobile-books-open'))toggleMobileBooks(false)});
