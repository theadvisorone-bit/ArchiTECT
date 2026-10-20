'use strict';
// Export module: PDF (vector), PNG, JPEG, SVG, DXF. Stands on its own.
(()=>{
const PAPER={A4:[210,297],A3:[297,420],A1:[594,841]};
const ACI={'':7,'#e0a526':2,'#e5484d':1,'#f97316':30,'#22c55e':3,'#14b8a6':4,'#3b82f6':5,'#a855f7':6,'#8b5a2b':34,'#9ca3af':8,'#ffffff':7,'#000000':7};
let cfg={f:'pdf',paper:'A3',sc:'fit',q:200};

// everything as simple shapes in drawing millimetres (y down); sc = paper mm per drawing mm
function prims(sc){
  const P=[],pw=o=>(o.lw||1)*0.25,tk=1.6/sc;
  for(const o of S.objs){
    const c=o.c||'#000000',[a,b]=o.p;
    if(o.type==='wall'){
      const L=dist(a,b)||1,ux=(b[0]-a[0])/L,uy=(b[1]-a[1])/L,h=o.t/2,nx=-uy*h,ny=ux*h,ex=ux*h,ey=uy*h;
      P.push({t:'p',fill:1,c,w:0,pts:[[a[0]-ex+nx,a[1]-ey+ny],[b[0]+ex+nx,b[1]+ey+ny],[b[0]+ex-nx,b[1]+ey-ny],[a[0]-ex-nx,a[1]-ey-ny]],col:c});
    }else if(o.type==='line')P.push({t:'l',a,b,c,w:pw(o)});
    else if(o.type==='rect')P.push({t:'p',fill:0,c,w:pw(o),pts:rectPts(o)});
    else if(o.type==='circle')P.push({t:'c',o:o.p[0],r:o.r,col:c,w:pw(o)});
    else if(o.type==='text')P.push({t:'x',p:a,s:o.s,h:o.h,c,a:0});
    else if(o.type==='dim'){
      const d=dimPts(o),w=0.18;
      P.push({t:'l',a,b:d[0],c,w},{t:'l',a:b,b:d[1],c,w},{t:'l',a:d[0],b:d[1],c,w});
      for(const q of d)P.push({t:'l',a:[q[0]-tk,q[1]+tk],b:[q[0]+tk,q[1]-tk],c,w});
      let ang=Math.atan2(d[1][1]-d[0][1],d[1][0]-d[0][0]);if(ang>Math.PI/2||ang<-Math.PI/2)ang+=Math.PI;
      const s=fmt(dist(a,b)),h=2.5/sc,tw=s.length*h*.52,m=[(d[0][0]+d[1][0])/2,(d[0][1]+d[1][1])/2],ca=Math.cos(ang),sa=Math.sin(ang);
      P.push({t:'x',p:[m[0]-ca*tw/2+sa*h*.5,m[1]-sa*tw/2-ca*h*.5],s,h,c,a:ang});
    }
  }
  return P;
}
function bbox(P){
  let x0=1e18,y0=1e18,x1=-1e18,y1=-1e18;const add=(x,y)=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);};
  for(const p of P){
    if(p.t==='l'){add(...p.a);add(...p.b);}else if(p.t==='p')p.pts.forEach(q=>add(...q));
    else if(p.t==='c'){add(p.o[0]-p.r,p.o[1]-p.r);add(p.o[0]+p.r,p.o[1]+p.r);}
    else{add(p.p[0],p.p[1]-p.h);add(p.p[0]+p.s.length*p.h*.55,p.p[1]);}
  }
  return{x:x0,y:y0,w:Math.max(x1-x0,1),h:Math.max(y1-y0,1)};
}
function toPaper(P,sc,ox,oy){
  const m=q=>[q[0]*sc+ox,q[1]*sc+oy];
  return P.map(p=>p.t==='l'?{...p,a:m(p.a),b:m(p.b)}:p.t==='p'?{...p,pts:p.pts.map(m)}:p.t==='c'?{...p,o:m(p.o),r:p.r*sc}:{...p,p:m(p.p),h:p.h*sc});
}
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function svg(P,W,H){
  let s=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#fff"/>`;
  for(const p of P){
    const c=p.c||p.col,st=`stroke="${c}" stroke-width="${p.w||0}" stroke-linecap="round"`;
    if(p.t==='l')s+=`<line x1="${p.a[0]}" y1="${p.a[1]}" x2="${p.b[0]}" y2="${p.b[1]}" ${st}/>`;
    else if(p.t==='p')s+=`<polygon points="${p.pts.map(q=>q.join(',')).join(' ')}" fill="${p.fill?c:'none'}" ${st}/>`;
    else if(p.t==='c')s+=`<circle cx="${p.o[0]}" cy="${p.o[1]}" r="${p.r}" fill="none" ${st}/>`;
    else s+=`<text transform="translate(${p.p[0]} ${p.p[1]}) rotate(${p.a*180/Math.PI})" font-size="${p.h}" font-family="Helvetica,Arial,sans-serif" fill="${p.c}">${esc(p.s)}</text>`;
  }
  return s+'</svg>';
}
function pdf(P,W,H){
  const pt=v=>(v*72/25.4).toFixed(2),Y=y=>pt(H-y),f2=v=>v.toFixed(3);
  const col=h=>{const n=parseInt((h||'#000000').slice(1),16);return[n>>16,(n>>8)&255,n&255].map(v=>f2(v/255)).join(' ');};
  const tx=s=>s.replace(/[^\x20-\x7e]/g,'?').replace(/[\\()]/g,'\\$&');
  let s='';
  for(const p of P){
    const c=p.c||p.col;
    if(p.t==='l')s+=`${col(c)} RG ${pt(p.w)} w 1 J ${pt(p.a[0])} ${Y(p.a[1])} m ${pt(p.b[0])} ${Y(p.b[1])} l S\n`;
    else if(p.t==='p')s+=`${col(c)} rg ${col(c)} RG ${pt(p.w||0.1)} w `+p.pts.map((q,i)=>`${pt(q[0])} ${Y(q[1])} ${i?'l':'m'}`).join(' ')+(p.fill?' h B\n':' h S\n');
    else if(p.t==='c'){
      const x=p.o[0],y=p.o[1],r=p.r,k=r*.5523,B=(a,b)=>pt(a)+' '+Y(b);
      s+=`${col(c)} RG ${pt(p.w)} w ${B(x+r,y)} m ${B(x+r,y+k)} ${B(x+k,y+r)} ${B(x,y+r)} c ${B(x-k,y+r)} ${B(x-r,y+k)} ${B(x-r,y)} c ${B(x-r,y-k)} ${B(x-k,y-r)} ${B(x,y-r)} c ${B(x+k,y-r)} ${B(x+r,y-k)} ${B(x+r,y)} c S\n`;
    }else{const ca=Math.cos(-p.a),sa=Math.sin(-p.a);s+=`${col(c)} rg BT /F1 ${pt(p.h)} Tf ${f2(ca)} ${f2(sa)} ${f2(-sa)} ${f2(ca)} ${pt(p.p[0])} ${Y(p.p[1])} Tm (${tx(p.s)}) Tj ET\n`;}
  }
  const O=['<</Type/Catalog/Pages 2 0 R>>','<</Type/Pages/Kids[3 0 R]/Count 1>>',`<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${pt(W)} ${pt(H)}]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>`,`<</Length ${s.length}>>\nstream\n${s}endstream`,'<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>'];
  let out='%PDF-1.4\n';const off=[];
  O.forEach((o,i)=>{off.push(out.length);out+=`${i+1} 0 obj\n${o}\nendobj\n`;});
  const x=out.length;
  out+=`xref\n0 ${O.length+1}\n0000000000 65535 f \n`+off.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<</Size ${O.length+1}/Root 1 0 R>>\nstartxref\n${x}\n%%EOF`;
  return out;
}
function dxf(){
  const P=prims(0.02);let s='0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';
  const g=(c,v)=>c+'\n'+v+'\n',aci=c=>ACI[(c||'').toLowerCase()]||7,y=v=>-v;
  for(const p of P){
    const k=aci(p.c||p.col);
    if(p.t==='l')s+=g(0,'LINE')+g(8,'0')+g(62,k)+g(10,p.a[0])+g(20,y(p.a[1]))+g(30,0)+g(11,p.b[0])+g(21,y(p.b[1]))+g(31,0);
    else if(p.t==='p'){s+=g(0,'POLYLINE')+g(8,'0')+g(62,k)+g(66,1)+g(70,1);for(const q of p.pts)s+=g(0,'VERTEX')+g(8,'0')+g(10,q[0])+g(20,y(q[1]))+g(30,0);s+=g(0,'SEQEND')+g(8,'0');}
    else if(p.t==='c')s+=g(0,'CIRCLE')+g(8,'0')+g(62,k)+g(10,p.o[0])+g(20,y(p.o[1]))+g(30,0)+g(40,p.r);
    else s+=g(0,'TEXT')+g(8,'0')+g(62,k)+g(10,p.p[0])+g(20,y(p.p[1]))+g(30,0)+g(40,p.h)+g(1,p.s)+g(50,-p.a*180/Math.PI);
  }
  return s+'0\nENDSEC\n0\nEOF\n';
}
function raster(P,W,H,dpi,type,cb){
  let k=dpi/25.4;const mx=Math.max(W,H)*k;if(mx>6000)k*=6000/mx;
  const c=document.createElement('canvas');c.width=Math.round(W*k);c.height=Math.round(H*k);
  const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.lineCap='round';
  for(const p of P){
    g.strokeStyle=g.fillStyle=p.c||p.col;g.lineWidth=Math.max((p.w||0)*k,1);
    if(p.t==='l'){g.beginPath();g.moveTo(p.a[0]*k,p.a[1]*k);g.lineTo(p.b[0]*k,p.b[1]*k);g.stroke();}
    else if(p.t==='p'){g.beginPath();p.pts.forEach((q,i)=>i?g.lineTo(q[0]*k,q[1]*k):g.moveTo(q[0]*k,q[1]*k));g.closePath();p.fill?g.fill():g.stroke();}
    else if(p.t==='c'){g.beginPath();g.arc(p.o[0]*k,p.o[1]*k,p.r*k,0,7);g.stroke();}
    else{g.save();g.translate(p.p[0]*k,p.p[1]*k);g.rotate(p.a);g.font=p.h*k+'px Helvetica,Arial,sans-serif';g.fillText(p.s,0,0);g.restore();}
  }
  c.toBlob(cb,type,0.92);
}
async function saveBlob(name,blob){
  try{
    const C=window.Capacitor;
    if(C&&C.isNativePlatform&&C.isNativePlatform()){
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.onerror=rej;r.readAsDataURL(blob);});
      const w=await C.Plugins.Filesystem.writeFile({path:name,data:b64,directory:'CACHE'});
      await C.Plugins.Share.share({title:name,url:w.uri});return;
    }
  }catch(e){}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();
}
async function run(m){
  if(!S.objs.length){m.textContent='Nothing to export yet. Draw something first.';return;}
  const name='ArchiPlan-'+new Date().toISOString().slice(0,10)+'.'+cfg.f;
  try{
    if(cfg.f==='dxf'){await saveBlob(name,new Blob([dxf()],{type:'application/dxf'}));m.textContent='DXF ready (units: millimetres).';return;}
    let[pw,ph]=PAPER[cfg.paper];const b=bbox(prims(1));
    if(b.w>b.h)[pw,ph]=[ph,pw];
    const mg=10,sc=cfg.sc==='fit'?Math.min((pw-2*mg)/b.w,(ph-2*mg)/b.h):1/cfg.sc;
    if(b.w*sc>pw-2*mg||b.h*sc>ph-2*mg){m.textContent='The drawing is bigger than '+cfg.paper+' at 1:'+cfg.sc+'. Choose Fit page, a larger paper, or a smaller scale.';return;}
    const P=toPaper(prims(sc),sc,(pw-b.w*sc)/2-b.x*sc,(ph-b.h*sc)/2-b.y*sc);
    if(cfg.f==='pdf')await saveBlob(name,new Blob([pdf(P,pw,ph)],{type:'application/pdf'}));
    else if(cfg.f==='svg')await saveBlob(name,new Blob([svg(P,pw,ph)],{type:'image/svg+xml'}));
    else await new Promise(res=>raster(P,pw,ph,cfg.q,cfg.f==='png'?'image/png':'image/jpeg',async bl=>{await saveBlob(name,bl);res();}));
    m.textContent=cfg.paper+' '+(pw>ph?'landscape':'portrait')+', scale 1:'+(1/sc).toFixed(1)+'. File ready.';
  }catch(e){m.textContent='Export failed: '+(e.message||e);}
}
function openSheet(){
  const ov=document.createElement('div');ov.className='ov';const bx=document.createElement('div');bx.className='box';ov.appendChild(bx);document.body.appendChild(ov);
  const paint=()=>{
    bx.innerHTML='';
    const grp=(t,arr,key,lab)=>{bx.appendChild(el('h4',null,t));const r=row();arr.forEach(v=>r.appendChild(el('button','bt'+(cfg[key]===v?' on':''),lab?lab(v):v,()=>{cfg[key]=v;paint();})));bx.appendChild(r);};
    grp('FORMAT',['pdf','png','jpg','svg','dxf'],'f',v=>({pdf:'PDF (vector)',png:'PNG',jpg:'JPEG',svg:'SVG',dxf:'DXF'})[v]);
    grp('PAPER (not used for DXF)',['A4','A3','A1'],'paper');
    grp('SCALE',['fit',20,50,100,200],'sc',v=>v==='fit'?'Fit page':'1:'+v);
    grp('IMAGE QUALITY (PNG, JPEG)',[100,200,300],'q',v=>v+' dpi');
    const m=el('div',null,'');m.style.cssText='color:var(--mut);font-size:13px';bx.appendChild(m);
    const r=row();r.appendChild(el('button','bt on','Export',()=>run(m)));r.appendChild(el('button','bt','Close',()=>ov.remove()));bx.appendChild(r);
  };
  ov.onclick=e=>{if(e.target===ov)ov.remove();};
  paint();
}
$('#tb').appendChild(el('button','bt','Export',openSheet));
window.ArchiExport={prims,pdf,dxf,svg,bbox,toPaper};
})();
