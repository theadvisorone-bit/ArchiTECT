'use strict';
const $=s=>document.querySelector(s);
const UNITS={mm:{l:'Millimetres (mm)',f:1,s:100},cm:{l:'Centimetres (cm)',f:10,s:100},m:{l:'Metres (m)',f:1000,s:500},in:{l:'Inches (in)',f:25.4,s:152.4},ft:{l:'Feet (ft)',f:304.8,s:304.8},ftin:{l:'Feet and inches',f:304.8,s:304.8}};
const THEMES={
 dark:{n:'Dark',bg:'#0b0b0c',ui:'#151618',line:'#2a2c30',ink:'#f2f2f2',mut:'#9aa0a6',grid:'#1c1e21',gm:'#33363c',acc:'#e0a526'},
 black:{n:'Black',bg:'#000000',ui:'#0a0a0a',line:'#222222',ink:'#ffffff',mut:'#a0a0a0',grid:'#141414',gm:'#262626',acc:'#e0a526'},
 white:{n:'White',bg:'#ffffff',ui:'#f1f2f4',line:'#cfd3da',ink:'#111111',mut:'#555555',grid:'#e6e8ec',gm:'#c9ced6',acc:'#b7791f'},
 blue:{n:'Blueprint',bg:'#0b3a6b',ui:'#082c52',line:'#1f5a94',ink:'#e8f1ff',mut:'#9ec0e6',grid:'#14508a',gm:'#2a6bb0',acc:'#ffd166'},
 sand:{n:'Sand',bg:'#f4ecd8',ui:'#e8dec1',line:'#cbbf9d',ink:'#2b2418',mut:'#6b5f45',grid:'#e3d9be',gm:'#cdbf98',acc:'#a15c00'}};
const COLORS=['','#e0a526','#e5484d','#f97316','#22c55e','#14b8a6','#3b82f6','#a855f7','#8b5a2b','#9ca3af','#ffffff','#000000'];
// Drawing data: all lengths in millimetres. Objects: wall, line, rect, circle, text, dim
let S={v:2,unit:'m',theme:'dark',objs:[],id:1};
let view={x:20,y:40,k:0.05},sel=null,undoS=[],redoS=[],T=THEMES.dark,tmp=null,orthoOn=true,snapOn=true,hint='';
const cv=$('#cv'),ctx=cv.getContext('2d');let dpr=1;

function adopt(d){ // accepts the old stage-1 format (walls) and the new one (objs)
  if(d.walls&&!d.objs){d.objs=d.walls.map((w,i)=>({id:i+1,type:'wall',p:[[w.x1,w.y1],[w.x2,w.y2]],t:230,c:''}));d.id=d.objs.length+1;}
  S=Object.assign({v:2,unit:'m',theme:'dark',objs:[],id:1},d);delete S.walls;
  if(!UNITS[S.unit])S.unit='m';if(!THEMES[S.theme])S.theme='dark';
  S.id=Math.max(S.id,...S.objs.map(o=>o.id+1),1);sel=null;
}
function load(){try{const d=JSON.parse(localStorage.getItem('archiplan'));if(d)adopt(d);}catch(e){}}
const save=()=>{try{localStorage.setItem('archiplan',JSON.stringify(S))}catch(e){}};
const shot=()=>JSON.stringify(S.objs);
function push(){undoS.push(shot());if(undoS.length>100)undoS.shift();redoS=[];}
function undo(){if(!undoS.length)return;redoS.push(shot());S.objs=JSON.parse(undoS.pop());sel=null;save();refreshProps();}
function redo(){if(!redoS.length)return;undoS.push(shot());S.objs=JSON.parse(redoS.pop());sel=null;save();refreshProps();}

// ---- geometry ----
const sx=x=>x*view.k+view.x,sy=y=>y*view.k+view.y;
const toW=(px,py)=>[(px-view.x)/view.k,(py-view.y)/view.k];
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function dSeg(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy;let t=l?((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l:0;t=Math.max(0,Math.min(1,t));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
function fmt(mm){
  if(S.unit==='ftin'){const i=Math.round(mm/25.4);return Math.floor(i/12)+"'-"+(i%12)+'"';}
  const v=mm/UNITS[S.unit].f;return (S.unit==='mm'?Math.round(v):Math.round(v*100)/100)+' '+S.unit;
}
const ink=o=>o.c||T.ink;
const rectPts=o=>{const[a,b]=o.p;return[[a[0],a[1]],[b[0],a[1]],[b[0],b[1]],[a[0],b[1]]];};
function dimPts(o){const[a,b]=o.p,L=dist(a,b)||1,nx=-(b[1]-a[1])/L*o.o,ny=(b[0]-a[0])/L*o.o;return[[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny]];}
const textBox=o=>[o.p[0][0],o.p[0][1]-o.h,o.p[0][0]+o.s.length*o.h*0.6,o.p[0][1]];
function hit(o,p,tol){
  switch(o.type){
    case 'wall':return dSeg(p,o.p[0],o.p[1])<=Math.max(tol,o.t/2);
    case 'line':return dSeg(p,o.p[0],o.p[1])<=tol;
    case 'dim':{const d=dimPts(o);return dSeg(p,d[0],d[1])<=tol||dSeg(p,o.p[0],d[0])<=tol||dSeg(p,o.p[1],d[1])<=tol;}
    case 'rect':{const r=rectPts(o);return r.some((q,i)=>dSeg(p,q,r[(i+1)%4])<=tol);}
    case 'circle':return Math.abs(dist(p,o.p[0])-o.r)<=tol;
    case 'text':{const b=textBox(o);return p[0]>=b[0]-tol&&p[0]<=b[2]+tol&&p[1]>=b[1]-tol&&p[1]<=b[3]+tol;}
  }
  return false;
}
const pick=w=>{for(let i=S.objs.length-1;i>=0;i--)if(hit(S.objs[i],w,14/view.k))return S.objs[i];return null;};
function handles(o){
  if(o.type==='circle')return[o.p[0],[o.p[0][0]+o.r,o.p[0][1]]];
  if(o.type==='dim'){const d=dimPts(o);return[o.p[0],o.p[1],[(d[0][0]+d[1][0])/2,(d[0][1]+d[1][1])/2]];}
  return o.p;
}
function snapPt(x,y,from,skip){
  let bd=16/view.k,b=null;
  for(const o of S.objs){if(o===skip)continue;for(const q of(o.type==='rect'?rectPts(o):o.p)){const d=Math.hypot(q[0]-x,q[1]-y);if(d<bd){bd=d;b=q;}}}
  if(b)return{x:b[0],y:b[1]};
  if(snapOn){const g=UNITS[S.unit].s;x=Math.round(x/g)*g;y=Math.round(y/g)*g;}
  if(orthoOn&&from){if(Math.abs(x-from.x)<Math.abs(y-from.y))x=from.x;else y=from.y;}
  return{x,y};
}

// ---- drawing ----
const path=(...pts)=>{ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));};
function lbl(a,b,str,col,off){
  const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<45)return;
  const nx=-(b[1]-a[1])/L,ny=(b[0]-a[0])/L;let ang=Math.atan2(b[1]-a[1],b[0]-a[0]);
  if(ang>Math.PI/2||ang<-Math.PI/2)ang+=Math.PI;
  ctx.save();ctx.translate((a[0]+b[0])/2+nx*off,(a[1]+b[1])/2+ny*off);ctx.rotate(ang);
  ctx.fillStyle=col;ctx.font='11px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(str,0,0);ctx.restore();
}
function drawObj(o,col){
  const P=q=>[sx(q[0]),sy(q[1])];
  ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineJoin='miter';ctx.lineCap=o.type==='wall'?'square':'round';
  ctx.lineWidth=o.type==='wall'?Math.max(o.t*view.k,3):Math.max((o.lw||1)*1.2,1);
  switch(o.type){
    case 'wall':{const a=P(o.p[0]),b=P(o.p[1]);path(a,b);ctx.stroke();lbl(a,b,fmt(dist(o.p[0],o.p[1])),T.mut,16);break;}
    case 'line':path(P(o.p[0]),P(o.p[1]));ctx.stroke();break;
    case 'rect':{const r=rectPts(o).map(P);path(...r,r[0]);ctx.stroke();break;}
    case 'circle':{const c=P(o.p[0]);ctx.beginPath();ctx.arc(c[0],c[1],Math.max(o.r*view.k,1),0,7);ctx.stroke();break;}
    case 'text':{ctx.font=Math.max(o.h*view.k,5)+'px system-ui';ctx.textAlign='left';ctx.textBaseline='alphabetic';const q=P(o.p[0]);ctx.fillText(o.s,q[0],q[1]);break;}
    case 'dim':{
      const d=dimPts(o),a=P(o.p[0]),b=P(o.p[1]),c=P(d[0]),e=P(d[1]);ctx.lineWidth=1;
      path(a,c);ctx.stroke();path(b,e);ctx.stroke();path(c,e);ctx.stroke();
      for(const q of[c,e]){path([q[0]-4,q[1]+4],[q[0]+4,q[1]-4]);ctx.stroke();}
      lbl(c,e,fmt(dist(o.p[0],o.p[1])),col,-9);break;}
  }
}
function render(){
  const W=cv.clientWidth,H=cv.clientHeight;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=T.bg;ctx.fillRect(0,0,W,H);
  let step=UNITS[S.unit].s;while(step*view.k<9)step*=2;
  const x0=-view.x/view.k,y0=-view.y/view.k,x1=(W-view.x)/view.k,y1=(H-view.y)/view.k;
  ctx.lineWidth=1;
  for(let x=Math.floor(x0/step)*step;x<=x1;x+=step){ctx.strokeStyle=Math.round(x/step)%5===0?T.gm:T.grid;path([sx(x),0],[sx(x),H]);ctx.stroke();}
  for(let y=Math.floor(y0/step)*step;y<=y1;y+=step){ctx.strokeStyle=Math.round(y/step)%5===0?T.gm:T.grid;path([0,sy(y)],[W,sy(y)]);ctx.stroke();}
  for(const o of S.objs)drawObj(o,ink(o));
  if(sel){
    ctx.globalAlpha=.55;drawObj(sel,T.acc);ctx.globalAlpha=1;
    for(const h of handles(sel)){ctx.beginPath();ctx.arc(sx(h[0]),sy(h[1]),8,0,7);ctx.fillStyle=T.acc;ctx.fill();ctx.strokeStyle=T.bg;ctx.lineWidth=2;ctx.stroke();}
  }
  let msg=hint;
  if(tmp){drawObj(tmp,T.acc);msg=tmp.type==='circle'?'Radius: '+fmt(tmp.r):'Length: '+fmt(dist(tmp.p[0],tmp.p[1]));}
  $('#st').textContent=msg+'   |   Objects: '+S.objs.length;
}
function resize(){dpr=window.devicePixelRatio||1;cv.width=cv.clientWidth*dpr;cv.height=cv.clientHeight*dpr;render();}
