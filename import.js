'use strict';
// Import module: DXF files and vector PDFs become normal editable objects. Stands on its own.
(()=>{
const num=v=>parseFloat(v);
function parseDXF(txt){
  const L=txt.split(/\r?\n/),P=[];
  for(let i=0;i+1<L.length;i+=2)P.push([parseInt(L[i],10),L[i+1].trim()]);
  let f=1;const iu=P.findIndex(p=>p[0]===9&&p[1]==='$INSUNITS');
  if(iu>=0)f={1:25.4,2:304.8,4:1,5:10,6:1000}[+P[iu+1][1]]||1;
  let i=P.findIndex(p=>p[0]===2&&p[1]==='ENTITIES');
  if(i<0)return{objs:[],skip:0};
  const E=[];let c=null;
  for(i++;i<P.length;i++){const[g,v]=P[i];if(g===0){if(v==='ENDSEC')break;c={t:v,d:[]};E.push(c);}else if(c)c.d.push([g,v]);}
  const g1=(e,k)=>{const r=e.d.find(x=>x[0]===k);return r?num(r[1]):0;},gs=(e,k)=>{const r=e.d.find(x=>x[0]===k);return r?r[1]:'';};
  const O=[],X=v=>v*f,Y=v=>-v*f;let skip=0,pl=null;
  const line=(a,b)=>{if(Math.hypot(a[0]-b[0],a[1]-b[1])>0.5)O.push({type:'line',p:[a,b],lw:1,c:''});};
  const poly=(pts,closed)=>{for(let k=0;k+1<pts.length;k++)line(pts[k],pts[k+1]);if(closed&&pts.length>2)line(pts[pts.length-1],pts[0]);};
  for(const e of E){
    if(e.t==='LINE')line([X(g1(e,10)),Y(g1(e,20))],[X(g1(e,11)),Y(g1(e,21))]);
    else if(e.t==='LWPOLYLINE'){const pts=[];let x=null;for(const[g,v]of e.d){if(g===10)x=num(v);else if(g===20&&x!==null){pts.push([X(x),Y(num(v))]);x=null;}}poly(pts,g1(e,70)&1);}
    else if(e.t==='POLYLINE')pl={pts:[],closed:g1(e,70)&1};
    else if(e.t==='VERTEX'&&pl)pl.pts.push([X(g1(e,10)),Y(g1(e,20))]);
    else if(e.t==='SEQEND'&&pl){poly(pl.pts,pl.closed);pl=null;}
    else if(e.t==='CIRCLE'){const r=g1(e,40)*f;if(r>0.5)O.push({type:'circle',p:[[X(g1(e,10)),Y(g1(e,20))]],r,lw:1,c:''});}
    else if(e.t==='ARC'){
      const cx=g1(e,10),cy=g1(e,20),r=g1(e,40);let a0=g1(e,50)*Math.PI/180,a1=g1(e,51)*Math.PI/180;if(a1<=a0)a1+=2*Math.PI;
      const n=Math.max(6,Math.ceil((a1-a0)*12)),pts=[];
      for(let k=0;k<=n;k++){const a=a0+(a1-a0)*k/n;pts.push([X(cx+r*Math.cos(a)),Y(cy+r*Math.sin(a))]);}
      poly(pts,false);
    }else if(e.t==='TEXT'||e.t==='MTEXT'){
      let s=gs(e,1);if(e.t==='MTEXT')s=s.replace(/\\P/g,' ').replace(/\\[A-Za-z][^;]*;/g,'').replace(/[{}]/g,'');
      if(s)O.push({type:'text',p:[[X(g1(e,10)),Y(g1(e,20))]],s,h:Math.max(g1(e,40)*f,50),c:''});
    }else skip++;
  }
  return{objs:O,skip};
}
function fit(objs){
  let x0=1e18,y0=1e18,x1=-1e18,y1=-1e18;
  for(const o of objs)for(const q of o.p){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}
  const W=cv.clientWidth,H=cv.clientHeight,k=Math.min(2,Math.max(0.005,Math.min((W-40)/Math.max(x1-x0,1),(H-40)/Math.max(y1-y0,1))));
  view.k=k;view.x=(W-(x1-x0)*k)/2-x0*k;view.y=(H-(y1-y0)*k)/2-y0*k;
}
function add(objs){
  if(!objs.length){alert('No drawable lines or text were found in this file.');return;}
  if(objs.length>40000){objs.length=40000;alert('Very large drawing: only the first 40,000 items were imported.');}
  push();objs.forEach(o=>{o.id=S.id++;S.objs.push(o);});save();fit(objs);refreshProps();
}
// ---- vector PDF (uses the pdf.js library, loaded from the internet when needed) ----
const LIB='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
function loadPdf(){
  return window.pdfjsLib?Promise.resolve(window.pdfjsLib):new Promise((res,rej)=>{
    const s=document.createElement('script');s.src=LIB+'pdf.min.js';
    s.onload=()=>{pdfjsLib.GlobalWorkerOptions.workerSrc=LIB+'pdf.worker.min.js';res(pdfjsLib);};
    s.onerror=()=>rej(new Error('PDF import needs an internet connection the first time.'));
    document.head.appendChild(s);
  });
}
const mul=(m,n)=>[m[0]*n[0]+m[2]*n[1],m[1]*n[0]+m[3]*n[1],m[0]*n[2]+m[2]*n[3],m[1]*n[2]+m[3]*n[3],m[0]*n[4]+m[2]*n[5]+m[4],m[1]*n[4]+m[3]*n[5]+m[5]];
async function pdfObjs(doc,pageNo,N,lib){
  const page=await doc.getPage(pageNo),H=page.getViewport({scale:1}).height,MM=25.4/72*N,O=lib.OPS,ol=await page.getOperatorList();
  const out=[],st=[];let ctm=[1,0,0,1,0,0],last=0;
  const pt=(x,y)=>[(ctm[0]*x+ctm[2]*y+ctm[4])*MM,(H-(ctm[1]*x+ctm[3]*y+ctm[5]))*MM];
  const seg=(p,q)=>{const a=pt(p[0],p[1]),b=pt(q[0],q[1]);if(Math.hypot(a[0]-b[0],a[1]-b[1])>0.5&&out.length<40000)out.push({type:'line',p:[a,b],lw:1,c:''});};
  const bez=(p0,p1,p2,p3)=>{let p=p0;for(let i=1;i<=8;i++){const t=i/8,u=1-t,q=[u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]];seg(p,q);p=q;}return p;};
  for(let i=0;i<ol.fnArray.length;i++){
    const f=ol.fnArray[i],a=ol.argsArray[i];
    if(f===O.save)st.push(ctm.slice());
    else if(f===O.restore)ctm=st.pop()||ctm;
    else if(f===O.transform)ctm=mul(ctm,a);
    else if(f===O.clip||f===O.eoClip)out.length=last;
    else if(f===O.constructPath){
      last=out.length;let k=0,cur=null,start=null;const c=a[1];
      for(const op of a[0]){
        if(op===O.moveTo){cur=start=[c[k],c[k+1]];k+=2;}
        else if(op===O.lineTo){const n=[c[k],c[k+1]];k+=2;seg(cur,n);cur=n;}
        else if(op===O.curveTo){cur=bez(cur,[c[k],c[k+1]],[c[k+2],c[k+3]],[c[k+4],c[k+5]]);k+=6;}
        else if(op===O.curveTo2){cur=bez(cur,cur,[c[k],c[k+1]],[c[k+2],c[k+3]]);k+=4;}
        else if(op===O.curveTo3){cur=bez(cur,[c[k],c[k+1]],[c[k+2],c[k+3]],[c[k+2],c[k+3]]);k+=4;}
        else if(op===O.closePath){if(cur&&start)seg(cur,start);cur=start;}
        else if(op===O.rectangle){const x=c[k],y=c[k+1],w=c[k+2],h=c[k+3];k+=4;
          const r=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];for(let j=0;j<4;j++)seg(r[j],r[(j+1)%4]);cur=start=r[0];}
      }
    }
  }
  const tc=await page.getTextContent();
  for(const it of tc.items){
    if(!it.str||!it.str.trim())continue;
    const t=it.transform,h=Math.hypot(t[2],t[3])*MM;
    out.push({type:'text',p:[[t[4]*MM,(H-t[5])*MM*1]],s:it.str,h:Math.max(h,1),c:''});
  }
  return out;
}
async function pdfFlow(f){
  const lib=await loadPdf(),doc=await lib.getDocument({data:await f.arrayBuffer()}).promise;
  ask('Page number (1 to '+doc.numPages+')','1',pg=>ask('Drawing scale 1:N (type 1 if the PDF is already full size)','1',async sc=>{
    try{
      const N=Math.max(0.001,parseFloat(sc)||1),p=Math.min(doc.numPages,Math.max(1,parseInt(pg)||1));
      add(await pdfObjs(doc,p,N,lib));
    }catch(e){alert('Could not read this PDF: '+(e.message||e));}
  }));
}
// ---- button + file picker ----
const fi=document.createElement('input');fi.type='file';fi.hidden=true;document.body.appendChild(fi);
fi.onchange=async()=>{
  const f=fi.files[0];fi.value='';if(!f)return;const n=f.name.toLowerCase();
  try{
    if(n.endsWith('.dxf')){const r=parseDXF(await f.text());add(r.objs);if(r.skip)alert(r.skip+' items (blocks or special objects) were skipped.');}
    else if(n.endsWith('.pdf'))await pdfFlow(f);
    else alert('Import supports DXF files and vector PDFs. Pictures as tracing backgrounds come in a later update.');
  }catch(e){alert('Could not read this file: '+(e.message||e));}
};
$('#tb').appendChild(el('button','bt','Import',()=>fi.click()));
window.ArchiImport={parseDXF};
})();
