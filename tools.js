'use strict';
let tool='wall',drag=null,pinch=null,lastT=230,lastLW=1;
const ptrs=new Map();
const TWO=['wall','line','rect','circle','dim'];
const HINTS={select:'Tap an object to select it. Drag empty space to move the view.',pan:'Drag to move the drawing. Pinch to zoom.',wall:'Drag on the grid to draw a wall.',line:'Drag to draw a line.',rect:'Drag from corner to corner.',circle:'Drag from the centre outward.',dim:'Drag between two points to add a dimension.',text:'Tap where the text should go.',erase:'Tap an object to delete it.'};
function setTool(t){tool=t;sel=null;tmp=null;drag=null;hint=HINTS[t];
  document.querySelectorAll('[data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t===t));refreshProps();}
function make(t,a,b){
  const o={id:0,type:t,p:[[a.x,a.y],[b.x,b.y]],c:''};
  if(t==='wall')o.t=lastT;else o.lw=lastLW;
  if(t==='circle'){o.p=[[a.x,a.y]];o.r=Math.hypot(b.x-a.x,b.y-a.y);}
  if(t==='dim')o.o=600;
  return o;
}
function zoomAt(mx,my,f){
  const k=Math.min(2,Math.max(0.005,view.k*f)),wx=(mx-view.x)/view.k,wy=(my-view.y)/view.k;
  view.k=k;view.x=mx-wx*k;view.y=my-wy*k;render();
}
function startPinch(){const[p,q]=[...ptrs.values()];pinch={d:Math.hypot(p.x-q.x,p.y-q.y),mx:(p.x+q.x)/2,my:(p.y+q.y)/2,k:view.k,vx:view.x,vy:view.y};}
function doPinch(){
  const[p,q]=[...ptrs.values()],d=Math.hypot(p.x-q.x,p.y-q.y),mx=(p.x+q.x)/2,my=(p.y+q.y)/2;
  const k=Math.min(2,Math.max(0.005,pinch.k*d/pinch.d)),wx=(pinch.mx-pinch.vx)/pinch.k,wy=(pinch.my-pinch.vy)/pinch.k;
  view.k=k;view.x=mx-wx*k;view.y=my-wy*k;render();
}
const panStart=e=>({t:'pan',sx:e.offsetX,sy:e.offsetY,vx:view.x,vy:view.y});

cv.addEventListener('pointerdown',e=>{
  cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
  if(ptrs.size===2){drag=null;tmp=null;startPinch();render();return;}
  if(ptrs.size>2)return;
  const w=toW(e.offsetX,e.offsetY);
  if(TWO.includes(tool)){const p=snapPt(w[0],w[1],null);drag={t:'draw',a:p,b:p};}
  else if(tool==='pan')drag=panStart(e);
  else if(tool==='erase'){const o=pick(w);if(o){push();S.objs.splice(S.objs.indexOf(o),1);save();}}
  else if(tool==='text')drag={t:'text',p:snapPt(w[0],w[1],null),x:e.offsetX,y:e.offsetY,moved:false};
  else if(tool==='select'){
    let h=-1;
    if(sel)handles(sel).forEach((q,i)=>{if(h<0&&Math.hypot(sx(q[0])-e.offsetX,sy(q[1])-e.offsetY)<24)h=i;});
    if(h>=0)drag={t:'handle',i:h,pushed:false};
    else{
      const o=pick(w);sel=o;
      drag=o?{t:'move',o,start:w,orig:JSON.parse(JSON.stringify(o.p)),pushed:false}:panStart(e);
      refreshProps();
    }
  }
  render();
});
cv.addEventListener('pointermove',e=>{
  if(!ptrs.has(e.pointerId))return;
  ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
  if(ptrs.size===2&&pinch){doPinch();return;}
  if(!drag)return;
  const w=toW(e.offsetX,e.offsetY);
  if(drag.t==='draw'){
    drag.b=snapPt(w[0],w[1],['wall','line','dim'].includes(tool)?drag.a:null);
    tmp=make(tool,drag.a,drag.b);
  }else if(drag.t==='pan'){view.x=drag.vx+e.offsetX-drag.sx;view.y=drag.vy+e.offsetY-drag.sy;}
  else if(drag.t==='text'){if(Math.hypot(e.offsetX-drag.x,e.offsetY-drag.y)>10)drag.moved=true;}
  else if(drag.t==='move'){
    const dx=w[0]-drag.start[0],dy=w[1]-drag.start[1];
    if(!drag.pushed&&Math.hypot(dx,dy)*view.k<5){return;}
    if(!drag.pushed){push();drag.pushed=true;}
    const p=snapPt(drag.orig[0][0]+dx,drag.orig[0][1]+dy,null,drag.o),mx=p.x-drag.orig[0][0],my=p.y-drag.orig[0][1];
    drag.o.p=drag.orig.map(q=>[q[0]+mx,q[1]+my]);
  }else if(drag.t==='handle'){
    if(!drag.pushed){push();drag.pushed=true;}
    const o=sel,i=drag.i;
    if(o.type==='circle'){if(i===0){const p=snapPt(w[0],w[1],null,o);o.p[0]=[p.x,p.y];}else o.r=Math.max(10,dist(o.p[0],w));}
    else if(o.type==='dim'&&i===2){const a=o.p[0],b=o.p[1];o.o=((w[0]-a[0])*(-(b[1]-a[1]))+(w[1]-a[1])*(b[0]-a[0]))/(dist(a,b)||1);}
    else{const from=(o.type==='wall'||o.type==='line')?{x:o.p[1-i][0],y:o.p[1-i][1]}:null,p=snapPt(w[0],w[1],from,o);o.p[i]=[p.x,p.y];}
  }
  render();
});
function endPtr(e){
  ptrs.delete(e.pointerId);pinch=null;
  const d=drag;drag=null;
  if(d&&d.t==='draw'&&tmp){
    const big=tmp.type==='circle'?tmp.r>20:dist(tmp.p[0],tmp.p[1])>50;
    if(big){push();tmp.id=S.id++;S.objs.push(tmp);}
    tmp=null;
  }
  if(d&&d.t==='text'&&!d.moved){
    ask('Enter text','',s=>{if(!s)return;push();S.objs.push({id:S.id++,type:'text',p:[[d.p.x,d.p.y]],s,h:250,c:''});save();render();});
  }
  if(d&&(d.t==='draw'||d.t==='move'||d.t==='handle'))save();
  if(d&&d.t==='handle')refreshProps();
  render();
}
cv.addEventListener('pointerup',endPtr);
cv.addEventListener('pointercancel',endPtr);
cv.addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.offsetX,e.offsetY,e.deltaY<0?1.1:0.9);},{passive:false});
