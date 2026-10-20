'use strict';
// Drawing aids module. Stands on its own; the old files are not edited.
(()=>{
const IN=25.4,BLOCKS=[5,6,7,9],OFF=70;
lastT=9*IN;
let showLbl=false,px=0,py=0,down=false,prec=true,inj=false,n0=0;
const _lbl=lbl,_draw=drawObj,_render=render,_setTool=setTool,_rp=refreshProps;
const drawTool=()=>['wall','line','rect','circle','dim','text'].includes(tool);

// 1. wall length text only while the wall is being drawn
lbl=(a,b,s,c,off)=>{if(off===16&&!showLbl)return;_lbl(a,b,s,c,off);};
drawObj=(o,c)=>{showLbl=o===tmp;_draw(o,c);showLbl=false;};

// 2. crosshair lines (follow the finger) + precision mode (touch point sits above the finger)
for(const t of['pointerdown','pointermove','pointerup','pointercancel'])cv.addEventListener(t,e=>{
  if(inj||!e.isTrusted||!prec||!drawTool()||e.pointerType==='mouse')return;
  e.stopImmediatePropagation();
  inj=true;
  cv.dispatchEvent(new PointerEvent(t,{pointerId:e.pointerId,pointerType:e.pointerType,isPrimary:e.isPrimary,clientX:e.clientX,clientY:e.clientY-OFF,bubbles:true,cancelable:true,buttons:e.buttons,button:e.button}));
  inj=false;
},true);
for(const t of['pointerdown','pointermove'])cv.addEventListener(t,e=>{px=e.offsetX;py=e.offsetY;down=true;});
for(const t of['pointerup','pointercancel'])cv.addEventListener(t,()=>{down=false;render();});
render=()=>{
  _render();
  if(!down||ptrs.size>1||tool==='pan'||tool==='erase')return;
  const w=toW(px,py),s=snapPt(w[0],w[1],null),X=sx(s.x),Y=sy(s.y),W=cv.clientWidth,H=cv.clientHeight;
  ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.strokeStyle=T.acc;ctx.lineWidth=1;ctx.globalAlpha=.6;
  ctx.beginPath();ctx.moveTo(X,0);ctx.lineTo(X,H);ctx.moveTo(0,Y);ctx.lineTo(W,Y);ctx.stroke();
  ctx.globalAlpha=1;ctx.strokeRect(X-5,Y-5,10,10);ctx.restore();
};
const pb=el('button','bt on','Precision',()=>{prec=!prec;pb.classList.toggle('on',prec);});
$('#tb').appendChild(pb);

// helper bars above the status line
const bar=()=>{const d=document.createElement('div');d.className='row';d.hidden=true;d.style.cssText='background:var(--ui);padding:6px 8px;border-top:1px solid var(--line)';$('#st').before(d);return d;};
const wb=bar(),db=bar();

// 3. wall block size chips (5, 6, 7, 9 inches) before drawing
function wchips(){
  wb.innerHTML='';wb.appendChild(el('span',null,'Block size:'));
  BLOCKS.forEach(n=>wb.appendChild(el('button','bt'+(Math.abs(lastT-n*IN)<1?' on':''),n+' in',()=>{lastT=n*IN;wchips();})));
}
// ...and on a selected wall
refreshProps=()=>{
  _rp();
  const p=$('#pp');
  if(sel&&tool==='select'&&sel.type==='wall'&&!p.hidden){
    const r=row();r.appendChild(el('span',null,'Block:'));
    BLOCKS.forEach(n=>r.appendChild(el('button','bt'+(Math.abs(sel.t-n*IN)<1?' on':''),n+' in',()=>{lastT=n*IN;change(o=>o.t=n*IN);})));
    p.insertBefore(r,p.children[1]);resize();
  }
};
setTool=t=>{_setTool(t);wb.hidden=t!=='wall';db.hidden=true;if(t==='wall')wchips();resize();};

// 4. dimension: detect horizontal or vertical, choose the side
function side(o,dx,dy){
  const[a,b]=o.p,L=dist(a,b)||1,nx=-(b[1]-a[1])/L,ny=(b[0]-a[0])/L,m=Math.abs(o.o)||600;
  o.o=(nx*dx+ny*dy>=0?1:-1)*m;
}
function showDim(o){
  db.innerHTML='';
  const horiz=Math.abs(o.p[1][0]-o.p[0][0])>=Math.abs(o.p[1][1]-o.p[0][1]);
  db.appendChild(el('span',null,(horiz?'Horizontal':'Vertical')+' dimension on:'));
  (horiz?[['Up',0,-1],['Down',0,1]]:[['Left',-1,0],['Right',1,0]]).forEach(([n,dx,dy])=>
    db.appendChild(el('button','bt',n,()=>{push();side(o,dx,dy);save();render();})));
  db.appendChild(el('button','bt','Done',()=>{db.hidden=true;sel=null;render();}));
  db.hidden=false;sel=o;resize();
}
cv.addEventListener('pointerdown',()=>{n0=S.objs.length;if(!db.hidden&&tool==='dim'){db.hidden=true;sel=null;}});
cv.addEventListener('pointerup',()=>{if(tool==='dim'&&S.objs.length>n0)showDim(S.objs[S.objs.length-1]);});

setTool(tool);
})();
