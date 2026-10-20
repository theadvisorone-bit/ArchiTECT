'use strict';
function el(tag,cls,txt,fn){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;if(fn)e.onclick=fn;return e;}
function row(){return el('div','row');}
function ask(title,val,cb){
  $('#mt').textContent=title;const i=$('#mi');i.value=val;$('#md').hidden=false;setTimeout(()=>i.focus(),50);
  const done=ok=>{$('#md').hidden=true;if(ok)cb(i.value.trim());};
  $('#mk').onclick=()=>done(true);$('#mc').onclick=()=>done(false);i.onkeydown=e=>{if(e.key==='Enter')done(true);};
}
// ---- file saving (browser download, or share sheet inside the installed app) ----
async function saveFile(name,text){
  try{
    const C=window.Capacitor;
    if(C&&C.isNativePlatform&&C.isNativePlatform()){
      const r=await C.Plugins.Filesystem.writeFile({path:name,data:text,directory:'CACHE',encoding:'utf8'});
      await C.Plugins.Share.share({title:name,url:r.uri});return;
    }
  }catch(e){}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download=name;
  document.body.appendChild(a);a.click();a.remove();
}
function applyTheme(n){
  T=THEMES[n];S.theme=n;const r=document.documentElement.style;
  r.setProperty('--bg',T.bg);r.setProperty('--ui',T.ui);r.setProperty('--line',T.line);r.setProperty('--ink',T.ink);r.setProperty('--mut',T.mut);r.setProperty('--acc',T.acc);
  const m=document.querySelector('meta[name=theme-color]');if(m)m.content=T.ui;
  save();render();
}
// ---- properties panel for the selected object ----
function change(fn){push();fn(sel);save();refreshProps();}
function refreshProps(){
  const p=$('#pp');
  if(!sel||tool!=='select'){p.hidden=true;resize();return;}
  p.hidden=false;p.innerHTML='';
  const o=sel,cr=row();
  COLORS.forEach(c=>{const b=el('button','sw'+((o.c||'')===c?' on':''),c?'':'A',()=>change(x=>x.c=c));
    b.style.background=c||T.bg;b.style.color=T.ink;b.style.fontSize='11px';cr.appendChild(b);});
  p.appendChild(cr);
  const r2=row();
  if(o.type==='wall'){[75,115,150,200,230,300,450].forEach(v=>r2.appendChild(el('button','bt'+(o.t===v?' on':''),fmt(v),()=>{lastT=v;change(x=>x.t=v);})));}
  else if(o.type==='text'){
    [150,250,400,600,1000].forEach(v=>r2.appendChild(el('button','bt'+(o.h===v?' on':''),fmt(v),()=>change(x=>x.h=v))));
    r2.appendChild(el('button','bt','Edit text',()=>ask('Edit text',o.s,s=>{if(s)change(x=>x.s=s);})));
  }else{[0.5,1,1.5,2.5,4].forEach(v=>r2.appendChild(el('button','bt'+(o.lw===v?' on':''),'Line '+v,()=>{lastLW=v;change(x=>x.lw=v);})));}
  p.appendChild(r2);
  const r3=row();
  r3.appendChild(el('button','bt','Duplicate',()=>{push();const c=JSON.parse(JSON.stringify(o));c.id=S.id++;c.p=c.p.map(q=>[q[0]+300,q[1]+300]);S.objs.push(c);sel=c;save();refreshProps();}));
  r3.appendChild(el('button','bt','Delete',()=>{push();S.objs.splice(S.objs.indexOf(o),1);sel=null;save();refreshProps();}));
  r3.appendChild(el('button','bt','Deselect',()=>{sel=null;refreshProps();}));
  p.appendChild(r3);resize();
}
// ---- menu ----
function openMenu(){
  const b=$('#mb');b.innerHTML='';b.appendChild(el('h4',null,'THEME'));
  const tr=row();for(const k in THEMES)tr.appendChild(el('button','bt'+(S.theme===k?' on':''),THEMES[k].n,()=>{applyTheme(k);openMenu();}));
  b.appendChild(tr);b.appendChild(el('h4',null,'PROJECT'));
  const pr=row();
  pr.appendChild(el('button','bt','Save project file',()=>saveFile('archiplan-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(S))));
  pr.appendChild(el('button','bt','Open project file',()=>$('#fi').click()));
  pr.appendChild(el('button','bt','New project',()=>{if(confirm('Start a new empty project? Save a project file first if you need this one.')){push();adopt({unit:S.unit,theme:S.theme});save();refreshProps();$('#menu').hidden=true;}}));
  b.appendChild(pr);
  b.appendChild(el('h4',null,'Your work is saved automatically on this phone. Use Save project file for a backup you keep.'));
  b.appendChild(el('button','bt','Close',()=>{$('#menu').hidden=true;}));
  $('#menu').hidden=false;
}
const fi=el('input');fi.type='file';fi.id='fi';fi.hidden=true;document.body.appendChild(fi);
fi.onchange=()=>{
  const f=fi.files[0];if(!f)return;const rd=new FileReader();
  rd.onload=()=>{try{const d=JSON.parse(rd.result);if(!d.objs&&!d.walls)throw 0;
    if(confirm('Open this file and replace the current drawing?')){adopt(d);applyTheme(S.theme);$('#unit').value=S.unit;save();refreshProps();$('#menu').hidden=true;}}
    catch(e){alert('This is not an ArchiPlan project file.');}fi.value='';};
  rd.readAsText(f);
};
// ---- startup ----
load();
$('#hl').src=I192;$('#sl').src=I192;
{const l=document.createElement('link');l.rel='icon';l.href=I192;document.head.appendChild(l);
 try{const u=location.origin+location.pathname,m={name:'ArchiPlan',short_name:'ArchiPlan',start_url:u,scope:u,display:'standalone',background_color:'#0b0b0c',theme_color:'#0b0b0c',icons:[{src:I192,sizes:'192x192',type:'image/webp'},{src:I512,sizes:'512x512',type:'image/webp'}]};
  const k=document.createElement('link');k.rel='manifest';k.href=URL.createObjectURL(new Blob([JSON.stringify(m)],{type:'application/manifest+json'}));document.head.appendChild(k);}catch(e){}}
const unitSel=$('#unit');
for(const u in UNITS){const o=document.createElement('option');o.value=u;o.textContent=UNITS[u].l;unitSel.appendChild(o);}
unitSel.value=S.unit;unitSel.onchange=()=>{S.unit=unitSel.value;save();refreshProps();};
const tb=$('#tb');
[['select','Select'],['pan','Pan'],['wall','Wall'],['line','Line'],['rect','Rect'],['circle','Circle'],['dim','Dim'],['text','Text'],['erase','Erase']].forEach(([t,n])=>{const b=el('button','bt',n,()=>setTool(t));b.dataset.t=t;tb.appendChild(b);});
tb.appendChild(el('button','bt','Undo',undo));tb.appendChild(el('button','bt','Redo',redo));
const ob=el('button','bt on','Ortho',()=>{orthoOn=!orthoOn;ob.classList.toggle('on',orthoOn);});
const sb=el('button','bt on','Snap',()=>{snapOn=!snapOn;sb.classList.toggle('on',snapOn);});
tb.appendChild(ob);tb.appendChild(sb);
tb.appendChild(el('button','bt','Clear',()=>{if(S.objs.length&&confirm('Clear the whole drawing?')){push();S.objs=[];sel=null;save();refreshProps();}}));
$('#mn').onclick=openMenu;
$('#menu').onclick=e=>{if(e.target.id==='menu')$('#menu').hidden=true;};
window.addEventListener('resize',resize);
applyTheme(S.theme);setTool('wall');resize();
setTimeout(()=>{const s=$('#splash');s.style.opacity=0;setTimeout(()=>s.remove(),500);},1600);
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
