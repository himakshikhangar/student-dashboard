// Campus Desk: all data lives in localStorage under "sd.v1"
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const K="sd.v1",DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],COL=["#3a5bff","#ff5d5d","#12b5a6","#e8960c","#8a5cf6","#ec4899"];
const fresh=()=>({theme:matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light",profile:{name:"Student",course:"B.Tech",sem:1},subjects:[],tt:[],att:{},exams:[],grades:[],notices:[],todos:[],pomo:0});
let S=JSON.parse(localStorage.getItem(K)||"null");
const save=()=>localStorage.setItem(K,JSON.stringify(S));
const uid=()=>Math.random().toString(36).slice(2,8);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const subj=id=>S.subjects.find(x=>x.id==id)||{name:"Unknown",color:"#999"};
const dayIdx=()=>(new Date().getDay()+6)%7;
const hm=()=>{const d=new Date();return String(d.getHours()).padStart(2,0)+":"+String(d.getMinutes()).padStart(2,0)};
const pct=id=>{const a=S.att[id];return a&&a.t?Math.round(a.p/a.t*100):null};
// classes needed to reach 75%, or how many can be skipped
const need=id=>{const a=S.att[id]||{p:0,t:0},n=Math.max(0,3*a.t-4*a.p);return n?`attend the next ${n} classes to reach 75%`:`you can skip ${Math.floor((4*a.p-3*a.t)/3)} and stay at 75%`};
const gp=p=>p>=90?10:p>=80?9:p>=70?8:p>=60?7:p>=50?6:p>=45?5:p>=40?4:0;
const gpa=l=>{const c=l.reduce((a,g)=>a+g.credits,0);return c?l.reduce((a,g)=>a+g.credits*gp(g.marks/g.max*100),0)/c:0};
const examTime=e=>new Date(e.date+"T"+e.time);
const examsSorted=()=>[...S.exams].sort((a,b)=>examTime(a)-examTime(b));
const nextExam=()=>examsSorted().find(e=>examTime(e)>Date.now());
const byStart=(a,b)=>a.start<b.start?-1:1;
const subjOpts=()=>S.subjects.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("");
// minutes since midnight for an "HH:MM" string
const toMin=t=>{const[a,b]=t.split(":");return +a*60+(+b)};
// id of the class in progress right now, or null
const ttNow=()=>{const n=hm();return (S.tt.filter(c=>c.day==dayIdx()&&c.start<=n&&n<c.end).sort(byStart)[0]||{}).id||null};
// id of the next class today, or null
const ttNext=()=>{const n=hm();return (S.tt.filter(c=>c.day==dayIdx()&&c.start>n).sort(byStart)[0]||{}).id||null};
// grid hour range in minutes, padded by 1h, default 8:00 to 17:00
function ttRange(){let s=8*60,e=17*60;
  if(S.tt.length){s=Math.min(...S.tt.map(c=>toMin(c.start)))-60;e=Math.max(...S.tt.map(c=>toMin(c.end)))+60}
  return {s:Math.max(0,Math.floor(s/60)*60),e:Math.min(1440,Math.ceil(e/60)*60)}}
// side-by-side lanes for overlapping classes, as {id:{i,n}}
function ttLayout(list){const out={},groups=[];let g=[],end=-1;
  list.forEach(c=>{const s=toMin(c.start),e=toMin(c.end);
    if(s<end){g.push(c);if(e>end)end=e}else{if(g.length)groups.push(g);g=[c];end=e}});
  if(g.length)groups.push(g);
  groups.forEach(gg=>{const ends=[];
    gg.forEach(c=>{const s=toMin(c.start);let i=ends.findIndex(x=>s>=x);if(i<0){i=ends.length;ends.push(0)}ends[i]=toMin(c.end);out[c.id]={i,n:0}});
    gg.forEach(c=>{out[c.id].n=ends.length})});
  return out}
// selected mobile day (null means today) and open sheet (null means closed)
let ttDay=null,ttSheet=null;

function seed(){
  S=fresh();const n=[["Maths",0],["Physics",1],["Data Structures",2],["English",3]];
  S.subjects=n.map(([name,c])=>({id:uid(),name,color:COL[c]}));
  const ids=S.subjects.map(x=>x.id);
  S.att={[ids[0]]:{p:18,t:22},[ids[1]]:{p:12,t:20},[ids[2]]:{p:21,t:24},[ids[3]]:{p:9,t:10}};
  const slots=[["09:00","10:00","A-101"],["10:15","11:15","Lab 2"],["11:30","12:30","B-204"],["14:00","15:00","A-103"]];
  for(let d=0;d<5;d++)slots.forEach(([a,b,r],j)=>S.tt.push({id:uid(),day:d,start:a,end:b,subj:ids[(d+j)%4],room:r}));
  const dd=k=>new Date(Date.now()+k*864e5).toISOString().slice(0,10);
  S.exams=[{id:uid(),name:"Mid-sem",subj:ids[0],date:dd(6),time:"10:00"},{id:uid(),name:"Mid-sem",subj:ids[2],date:dd(9),time:"10:00"}];
  S.grades=[["Maths",4,78],["Physics",3,64],["Data Structures",4,88],["English",2,71]].map(([name,credits,marks])=>({id:uid(),sem:1,name,credits,marks,max:100}));
  S.notices=[{id:uid(),title:"Library hours extended",body:"Open till 9 pm during exams.",pin:1,date:dd(0)}];
  S.todos=[{id:uid(),t:"Finish physics record",done:0},{id:uid(),t:"Revise integration",done:0}];
  save();
}
if(!S){seed()}

// ---------- small building blocks ----------
const stat=(l,v,t="blue")=>`<div class="card stat tilt ${t}"><small>${l}</small><b>${v}</b></div>`;
const classList=(l,del)=>l.length?l.map(c=>{const s=subj(c.subj),now=c.day==dayIdx()&&hm()>=c.start&&hm()<c.end;
  return `<div class="row${now?" now":""}" style="--c:${s.color}"><span class="t">${c.start}–${c.end}</span><b>${esc(s.name)}</b><small>${esc(c.room||"")}</small>${now?"<em>Now</em>":""}${del?`<button class="x" data-a="del" data-k="tt" data-id="${c.id}" aria-label="Delete class">×</button>`:""}</div>`}).join(""):`<p class="empty">No classes.</p>`;
const todoList=l=>l.map(t=>`<div class="row" style="--c:var(--blue)"><button class="chk ${t.done?"on":""}" data-a="tog" data-id="${t.id}" aria-label="Toggle task"></button><span class="${t.done?"done":""}">${esc(t.t)}</span><button class="x" data-a="del" data-k="todos" data-id="${t.id}" aria-label="Delete task">×</button></div>`).join("")||`<p class="empty">Nothing to do.</p>`;

// ---------- views ----------
const V={};
// Home landing page (default route). Uses existing S data; no shape change.
V.home=()=>{
  const today=S.tt.filter(c=>c.day==dayIdx()).sort(byStart);
  const finished=today.filter(c=>c.end<=hm()).length;
  const ps=S.subjects.map(s=>pct(s.id)).filter(x=>x!=null);
  const avg=ps.length?Math.round(ps.reduce((a,b)=>a+b)/ps.length):0;
  const ex=nextExam();
  const days=ex?Math.ceil((examTime(ex)-Date.now())/864e5):0;
  const pend=S.todos.filter(t=>!t.done).length;
  const tot=S.todos.length;
  const cg=gpa(S.grades);
  const fCls=today.length?finished/today.length:0;
  const fAtt=avg/100;
  const fExam=ex?1-Math.min(days,30)/30:0;
  const fTask=tot?(tot-pend)/tot:0;
  const fPomo=Math.min(S.pomo,8)/8;
  const fCg=cg/10;
  // greeting text (anime-home.js re-checks and animates it)
  const h=new Date().getHours();
  const gr=h>=5&&h<=11?"Good morning":h>=12&&h<=16?"Good afternoon":h>=17&&h<=20?"Good evening":"Good night";
  const first=today[0];
  let line=today.length?`You have ${today.length} class${today.length==1?"":"es"} today. First one at ${first.start}.`:`No classes today. A good day to catch up.`;
  const lows=S.subjects.map(s=>({s,p:pct(s.id)})).filter(x=>x.p!=null&&x.p<75).sort((a,b)=>a.p-b.p);
  if(lows.length)line+=` ${lows[0].s.name} needs attention.`;
  const date=new Date().toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const n0=new Date();
  const clock=[n0.getHours(),n0.getMinutes(),n0.getSeconds()].map(x=>String(x).padStart(2,0)).join(":");
  // one stat tile with an SVG ring (r=34, dasharray 214)
  const tile=(label,val,suffix,fill)=>{
    const f=Math.max(0,Math.min(1,fill));
    const off=(214*(1-f)).toFixed(1);
    return `<div class="card home-tile" data-fill="${f.toFixed(3)}"><svg viewBox="0 0 80 80" aria-hidden="true"><circle class="trk" cx="40" cy="40" r="34" stroke-dasharray="214"></circle><circle class="rg" cx="40" cy="40" r="34" stroke-dasharray="214" stroke-dashoffset="${off}" data-fill="${f.toFixed(3)}"></circle></svg><div><b class="hv" data-to="${val}" data-suffix="${suffix}">${val}${suffix}</b><small>${label}</small></div></div>`};
  const tiles=tile("Classes today",today.length,"",fCls)+tile("Overall attendance",avg,"%",fAtt)+tile("Next exam (days)",days,"",fExam)+tile("Tasks pending",pend,"",fTask)+tile("Focus sessions",S.pomo,"",fPomo)+tile("CGPA",cg.toFixed(2),"",fCg);
  // up next: next class today, else next exam, else nothing
  const nx=S.tt.filter(c=>c.day==dayIdx()&&c.start>hm()).sort(byStart)[0];
  let up="";
  if(nx){const s=subj(nx.subj);up=`<p><b>${esc(s.name)}</b> · ${nx.start} · ${esc(nx.room||"")}</p><p class="up-time" data-start="${nx.start}">Starts in <b>--:--</b></p>`}
  else if(ex){const s=subj(ex.subj);up=`<p><b>${esc(s.name)}</b> · ${esc(ex.name)} · ${ex.date} ${ex.time}</p><p class="up-time" data-exam="${ex.date}T${ex.time}"><b>--</b></p>`}
  else up=`<p>Nothing scheduled</p>`;
  // day progress 8:00 to 18:00
  const d=new Date(),mins=d.getHours()*60+d.getMinutes()+d.getSeconds()/60;
  const dpct=Math.max(0,Math.min(100,(mins-480)/(1080-480)*100));
  return `<section class="hero card"><div id="dotgrid" aria-hidden="true"></div><div class="hero-text"><small id="hdate">${date}</small><h2 id="greet">${esc(gr+", "+S.profile.name)}</h2><p id="hline">${esc(line)}</p><div id="hclock">${clock}</div><div class="btns"><a class="btn b" href="#attendance">Mark attendance</a><a class="btn g" href="#focus">Start focusing</a><a class="btn y" href="#timetable">Open timetable</a></div></div></section>`
  +`<div class="grid home-stats">${tiles}</div>`
  +`<div class="grid two"><div class="card" id="upnext"><h3>Up next</h3><div class="up-body">${up}</div></div><div class="card" id="dayprog"><h3>Day progress</h3><div class="daybar"><i class="dayfill" style="width:${dpct.toFixed(1)}%"></i><u class="daymark" style="left:${dpct.toFixed(1)}%"></u></div><div class="daylbl"><span>8:00</span><span class="daypct">${dpct.toFixed(0)}%</span><span>18:00</span></div></div></div>`};
V.overview=()=>{
  const today=S.tt.filter(c=>c.day==dayIdx()).sort(byStart),ps=S.subjects.map(s=>pct(s.id)).filter(x=>x!=null);
  const avg=ps.length?Math.round(ps.reduce((a,b)=>a+b)/ps.length):0,low=S.subjects.filter(s=>pct(s.id)!=null&&pct(s.id)<75),ex=nextExam();
  // Subject bars for the fill cards (final state in HTML; anime-fill.js animates from 0)
  const fillRows=S.subjects.map(s=>{const a=S.att[s.id]||{p:0,t:0},p=pct(s.id),isLow=p!=null&&p<75,w=p==null?0:p;
    return `<div class="fill-row" style="--c:${s.color}"><div class="fill-top"><b>${esc(s.name)}</b><span class="fill-pct"${p==null?"":` data-pct="${p}"`}>${p==null?"–":p+"%"}</span></div><small class="fill-sub">${a.p} of ${a.t} classes${isLow?` · ${need(s.id)}`:""}</small><div class="fill-bar"><i class="fill-fill${isLow?" low":""}" data-w="${w}" style="width:${w}%"></i><u></u></div></div>`}).join("")||'<p class="empty">Add subjects in Attendance to see bars.</p>';
  // 7 day tiles with class counts and subject-colour dots
  const fillDays=DAYS.map((d,i)=>{const list=S.tt.filter(c=>c.day==i);
    return `<div class="fill-day${i==dayIdx()?" today":""}"><b>${d}</b><span class="fill-count">${list.length} class${list.length==1?"":"es"}</span><span class="fill-dots">${list.map(c=>`<i class="fill-dot" style="background:${subj(c.subj).color}"></i>`).join("")}</span></div>`}).join("");
  return `<div class="grid stats">${stat("Overall attendance",ps.length?avg+"%":"–",avg<75&&ps.length?"red":"green")}${stat("Classes today",today.length)}${stat("Next exam",ex?Math.ceil((examTime(ex)-Date.now())/864e5)+" days":"None")}${stat("CGPA",gpa(S.grades).toFixed(2))}</div>
  ${low.length?`<div class="alert"><b>Attendance shortage</b><br>${low.map(s=>`${esc(s.name)} is at ${pct(s.id)}%: ${need(s.id)}`).join("<br>")}</div>`:""}
  <div class="grid two"><div class="card"><h3>Today's schedule</h3>${classList(today)}</div><div class="card"><h3>To-do</h3>${todoList(S.todos.slice(0,5))}</div></div>
  <div class="card fill-card"><h3>Subject attendance</h3><div class="fill-list">${fillRows}</div></div>
  <div class="card fill-card"><h3>This week</h3><div class="fill-week">${fillDays}</div></div>`};
V.timetable=()=>{
  const days=[0,1,2,3,4,5];if(S.tt.some(c=>c.day==6))days.push(6);
  const R=ttRange(),H=[];for(let h=R.s/60;h<R.e/60;h++)H.push(h);
  const today=dayIdx(),now=ttNow(),next=ttNext(),sel=ttDay==null?today:ttDay,nm=toMin(hm());
  const gutter=H.map(h=>`<span class="tt-h" style="top:${(h-R.s/60)*64}px">${String(h).padStart(2,0)}:00</span>`).join("");
  const lines=H.map(h=>`<div class="tt-hline" style="top:${(h-R.s/60)*64}px"></div>`).join("");
  const head=days.map(d=>`<div class="tt-hday${d==today?" today":""}">${DAYS[d]}</div>`).join("");
  const cols=days.map(d=>{
    const list=S.tt.filter(c=>c.day==d).sort(byStart),lay=ttLayout(list);
    const blocks=list.map(c=>{const s=subj(c.subj),p=lay[c.id],w=100/p.n;
      return `<button class="tt-b tilt" data-a="ttEdit" data-id="${c.id}" style="--c:${s.color};top:${(toMin(c.start)-R.s)/60*64}px;height:${Math.max(28,(toMin(c.end)-toMin(c.start))/60*64)}px;left:calc(${p.i*w}% + 4px);width:calc(${w}% - 8px)" aria-label="${esc(s.name)} ${c.start} to ${c.end}"><b>${esc(s.name)}</b><span>${esc(c.room||"")}</span><span>${c.start}–${c.end}</span>${c.id==now?"<em>Now</em>":""}${c.id==next?"<em>Next</em>":""}</button>`}).join("");
    const line=d==today&&nm>=R.s&&nm<=R.e?`<div class="tt-now" style="top:${(nm-R.s)/60*64}px"></div>`:"";
    return `<div class="tt-col${d==today?" today":""}">${lines}${blocks}${line}</div>`}).join("");
  const chips=DAYS.map((d,i)=>`<button class="chip${i==sel?" on":""}${i==today?" today":""}" data-a="ttDay" data-day="${i}" role="tab" aria-selected="${i==sel}">${d}</button>`).join("");
  const cards=S.tt.filter(c=>c.day==sel).sort(byStart).map(c=>{const s=subj(c.subj);
    return `<button class="ttm-card" data-a="ttEdit" data-id="${c.id}" style="--c:${s.color}" aria-label="${esc(s.name)} ${c.start} to ${c.end}"><span class="t">${c.start}–${c.end}</span><span class="ttm-main"><b>${esc(s.name)}</b><small>${esc(c.room||"")}${c.id==now&&sel==today?" · Now":""}${c.id==next&&sel==today?" · Next":""}</small></span></button>`}).join("")||'<p class="empty">No classes this day.</p>';
  let cur={day:sel,start:"09:00",end:"10:00",subj:(S.subjects[0]||{}).id||"",room:""};
  if(ttSheet&&ttSheet.id)cur=S.tt.find(x=>x.id==ttSheet.id)||cur;
  const subSel=S.subjects.map(s=>`<option value="${s.id}"${cur.subj==s.id?" selected":""}>${esc(s.name)}</option>`).join("");
  const sheet=ttSheet?`<div class="sheet-back"><div class="sheet" role="dialog" aria-modal="true" aria-label="${ttSheet.id?"Edit class":"Add class"}"><h3>${ttSheet.id?"Edit class":"Add class"}</h3>
    <form data-f="ttSheet"><input type="hidden" name="id" value="${ttSheet.id||""}">
    <label>Day<select name="day">${DAYS.map((d,i)=>`<option value="${i}"${cur.day==i?" selected":""}>${d}</option>`).join("")}</select></label>
    <label>Start<input type="time" name="start" value="${cur.start}" required></label>
    <label>End<input type="time" name="end" value="${cur.end}" required></label>
    <label>Subject<select name="subj">${subSel}</select></label>
    <label>Room<input name="room" value="${esc(cur.room||"")}" placeholder="Room"></label>
    <div class="btns"><button class="btn b">Save</button>${ttSheet.id?`<button type="button" class="btn r" data-a="ttDel" data-id="${ttSheet.id}">Delete</button>`:""}<button type="button" class="lnk" data-a="ttClose">Cancel</button></div></form></div></div>`:"";
  return `<div class="tt-bar"><button class="btn b" data-a="ttAdd">Add class</button><button class="btn y" data-a="notify">Enable reminders</button></div>
  ${S.tt.length?"":'<p class="empty">No classes yet. Tap Add class to begin.</p>'}
  <div class="tt-chips" role="tablist" aria-label="Days">${chips}</div>
  <div class="tt-grid"><div class="tt-head"><div class="tt-corner"></div>${head}</div><div class="tt-body" style="height:${H.length*64}px"><div class="tt-gutter">${gutter}</div>${cols}</div></div>
  <div class="tt-day">${cards}</div>${sheet}`;};
V.attendance=()=>`<form class="card form" data-f="subj"><input name="name" placeholder="New subject" required><button class="btn g">Add subject</button></form>
  <div class="grid cards3">${S.subjects.map(s=>{const a=S.att[s.id]||{p:0,t:0},p=pct(s.id);return `<div class="flip"><div class="in">
  <div class="face card" style="--c:${s.color}"><h3>${esc(s.name)}</h3><div class="big ${p!=null&&p<75?"bad":""}">${p==null?"–":p+"%"}</div><div class="bar" style="--c:${s.color}"><i style="width:${p||0}%"></i><u></u></div>
  <div class="btns"><button class="btn g" data-a="att" data-id="${s.id}" data-v="1">Present</button><button class="btn r" data-a="att" data-id="${s.id}" data-v="0">Absent</button></div><button class="lnk" data-a="flip">Details</button></div>
  <div class="face back card" style="--c:${s.color}"><h3>${esc(s.name)}</h3><p>${a.p} of ${a.t} classes attended</p><p>${a.t?need(s.id):"Mark a class to begin."}</p><p class="empty">The line on the bar is 75%.</p><button class="lnk" data-a="flip">Back</button><button class="lnk" data-a="del" data-k="subjects" data-id="${s.id}">Remove subject</button></div></div></div>`}).join("")||'<p class="empty">Add your first subject.</p>'}</div>`;
V.exams=()=>`<form class="card form" data-f="exams"><input name="name" placeholder="Exam name" required><select name="subj" aria-label="Subject">${subjOpts()}</select><input type="date" name="date" required><input type="time" name="time" value="10:00" required><button class="btn b">Add exam</button></form>
  <div class="grid cards3">${examsSorted().map(e=>{const s=subj(e.subj);return `<div class="card tilt" style="--c:${s.color}"><h3>${esc(s.name)}</h3><p>${esc(e.name)} · ${e.date} · ${e.time}</p><div class="cd" data-cd="${e.date}T${e.time}">${["days","hrs","min","sec"].map(u=>`<div><b>00</b><small>${u}</small></div>`).join("")}</div><button class="lnk" data-a="del" data-k="exams" data-id="${e.id}">Remove</button></div>`}).join("")||'<p class="empty">No exams added.</p>'}</div>`;
V.grades=()=>{const sems=[...new Set(S.grades.map(g=>g.sem))].sort((a,b)=>a-b);
  return `<div class="grid stats">${stat("CGPA",gpa(S.grades).toFixed(2))}${sems.map(s=>stat("Sem "+s+" GPA",gpa(S.grades.filter(g=>g.sem==s)).toFixed(2),"green")).join("")}</div>
  <form class="card form" data-f="grades"><input name="sem" type="number" min="1" max="12" value="${S.profile.sem}" required aria-label="Semester"><input name="name" placeholder="Subject" required><input name="credits" type="number" min="1" max="10" placeholder="Credits" required><input name="marks" type="number" min="0" placeholder="Marks" required><input name="max" type="number" min="1" value="100" required aria-label="Max marks"><button class="btn b">Add</button></form>
  <div class="card">${S.grades.map(g=>{const p=g.marks/g.max*100;return `<div class="row" style="--c:${COL[gp(p)%6]}"><span class="t">Sem ${g.sem}</span><b>${esc(g.name)}</b><small>${g.credits} cr · ${g.marks}/${g.max}</small><em>${gp(p)} pts</em><button class="x" data-a="del" data-k="grades" data-id="${g.id}" aria-label="Delete">×</button></div>`}).join("")||'<p class="empty">No marks yet.</p>'}</div>`};
V.focus=()=>`<div class="grid two"><div class="card pomo tilt"><svg viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="100"/><circle id="ring" cx="110" cy="110" r="100"/></svg><div class="ptxt"><small id="pmm">Focus</small><b id="pmt">25:00</b></div><div class="btns"><button class="btn b" id="pms" data-a="pms">Start</button><button class="btn y" data-a="pmr">Reset</button><button class="btn g" data-a="pmx">Switch</button></div><p>${S.pomo} focus sessions finished</p></div>
  <div class="card"><h3>To-do</h3><form class="form" data-f="todos"><input name="t" placeholder="Add a task" required><button class="btn g">Add</button></form>${todoList(S.todos)}</div></div>`;
V.notices=()=>`<form class="card form" data-f="notices"><input name="title" placeholder="Title" required><input name="body" placeholder="Details"><label><input type="checkbox" name="pin"> Pin</label><button class="btn b">Post notice</button></form>
  <div class="grid cards3">${[...S.notices].sort((a,b)=>b.pin-a.pin).map(n=>`<div class="card tilt ${n.pin?"pin":""}"><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p><small class="empty">${n.date}${n.pin?" · pinned":""}</small><br><button class="lnk" data-a="del" data-k="notices" data-id="${n.id}">Delete</button></div>`).join("")||'<p class="empty">No notices.</p>'}</div>`;
V.profile=()=>{const p=S.profile,o=t=>`<option value="${t}"${S.theme==t?" selected":""}>${t[0].toUpperCase()+t.slice(1)}</option>`;
  return `<div class="card prof tilt"><div class="av">${esc((p.name||"S")[0].toUpperCase())}</div><div><h3>${esc(p.name)}</h3><p>${esc(p.course)} · Semester ${p.sem}</p></div></div>
  <form class="card form" data-f="profile"><input name="name" value="${esc(p.name)}" placeholder="Name" required><input name="course" value="${esc(p.course)}" placeholder="Course" required><input name="sem" type="number" min="1" max="12" value="${p.sem}" required aria-label="Semester"><select name="theme" aria-label="Theme">${o("light")}${o("dark")}</select><button class="btn b">Save profile</button></form>
  <div class="card"><h3>Data</h3><p>Everything is saved only in this browser.</p><div class="btns"><button class="btn g" data-a="demo">Load demo data</button><button class="btn r" data-a="clear">Clear all data</button></div></div>`};

// ---------- render ----------
const TABS=[["home","Home"],["overview","Overview"],["timetable","Timetable"],["attendance","Attendance"],["exams","Exams"],["grades","Grades"],["focus","Focus"],["notices","Notices"],["profile","Profile"]];
function render(){
  const t=TABS.find(x=>x[0]==location.hash.slice(1))||TABS[0];
  // forget timetable UI state when leaving the view
  if(t[0]!="timetable"){ttDay=null;ttSheet=null}
  document.documentElement.dataset.theme=S.theme;
  $("#tabs").innerHTML=TABS.map(([k,n])=>`<a href="#${k}" class="${k==t[0]?"on":""}">${n}</a>`).join("");
  $("#title").textContent=t[1];$("#sub").textContent=`${S.profile.name} · ${S.profile.course}, Sem ${S.profile.sem} · ${new Date().toDateString()}`;
  $("#view").innerHTML=V[t[0]]();tickCD();drawPM();
  if(t[0]=="home"){try{window.dispatchEvent(new Event("home:render"))}catch(e){}}
}
addEventListener("hashchange",render);

// ---------- countdown, pomodoro, toast ----------
function tickCD(){$$("[data-cd]").forEach(el=>{let ms=Math.max(0,new Date(el.dataset.cd)-Date.now());
  const v=[864e5,36e5,6e4,1e3].map(u=>{const x=Math.floor(ms/u);ms-=x*u;return x});
  $$("b",el).forEach((b,i)=>{const t=String(v[i]).padStart(2,0);if(b.textContent!=t){b.textContent=t;b.classList.remove("flipit");void b.offsetWidth;b.classList.add("flipit")}})})}
setInterval(tickCD,1000);
// keep the now-line and Now/Next badges fresh, but never wipe an open sheet
setInterval(()=>{if(location.hash=="#timetable"&&!ttSheet)render()},60000);
const pm={mode:"focus",left:1500,run:false},PM={focus:1500,break:300};
function drawPM(){const r=$("#ring");if(!r)return;$("#pmt").textContent=String(Math.floor(pm.left/60)).padStart(2,0)+":"+String(pm.left%60).padStart(2,0);
  r.style.strokeDashoffset=628*(1-pm.left/PM[pm.mode]);$("#pmm").textContent=pm.mode=="focus"?"Focus":"Break";$("#pms").textContent=pm.run?"Pause":"Start"}
setInterval(()=>{if(!pm.run)return;if(--pm.left<=0){if(pm.mode=="focus"){S.pomo++;save()}pm.mode=pm.mode=="focus"?"break":"focus";pm.left=PM[pm.mode];toast(pm.mode=="break"?"Focus done. Take 5 minutes.":"Break over. Back to it.")}drawPM()},1000);
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove("on"),3800)}

// ---------- class reminders (work while this tab is open) ----------
const fired=new Set();
function remind(){const n=new Date();S.tt.filter(c=>c.day==dayIdx()).forEach(c=>{const [h,m]=c.start.split(":"),diff=(new Date(n.getFullYear(),n.getMonth(),n.getDate(),h,m)-n)/6e4,key=c.id+n.toDateString();
  if(diff>0&&diff<=10&&!fired.has(key)){fired.add(key);const msg=`${subj(c.subj).name} in ${Math.ceil(diff)} min · ${c.room||"no room set"}`;toast(msg);if("Notification" in window&&Notification.permission=="granted")new Notification("Next class",{body:msg})}})}
setInterval(remind,30000);setTimeout(remind,1500);

// ---------- clicks ----------
const A={
  flip:b=>b.closest(".flip").classList.toggle("on"),
  del:(b,d)=>{S[d.k]=S[d.k].filter(x=>x.id!=d.id);if(d.k=="subjects")delete S.att[d.id];save();render()},
  att:(b,d)=>{const a=S.att[d.id]||(S.att[d.id]={p:0,t:0});a.t++;if(+d.v)a.p++;save();render();if(pct(d.id)<75)toast(`${subj(d.id).name} is at ${pct(d.id)}%: ${need(d.id)}`)},
  tog:(b,d)=>{const t=S.todos.find(x=>x.id==d.id);t.done=t.done?0:1;save();render()},
  notify:()=>{if(!("Notification" in window))return toast("This browser has no notifications. In-app reminders still work.");Notification.requestPermission().then(r=>toast(r=="granted"?"Reminders on. Keep this tab open.":"Notifications blocked. In-app reminders still work."))},
  pms:()=>{pm.run=!pm.run;drawPM()},pmr:()=>{pm.run=false;pm.left=PM[pm.mode];drawPM()},pmx:()=>{pm.mode=pm.mode=="focus"?"break":"focus";pm.left=PM[pm.mode];pm.run=false;drawPM()},
  demo:()=>{seed();render();toast("Demo data loaded.")},
  clear:()=>{if(confirm("Delete all your data?")){const t=S.theme,p=S.profile;S=fresh();S.theme=t;S.profile=p;save();render()}},
  ttAdd:()=>{ttSheet={};render();const f=$(".sheet select");if(f)f.focus()},
  ttEdit:(b,d)=>{ttSheet={id:d.id};render();const f=$(".sheet select");if(f)f.focus()},
  ttClose:()=>{ttSheet=null;render()},
  ttDay:(b,d)=>{ttDay=+d.day;render()},
  ttDel:(b,d)=>{S.tt=S.tt.filter(x=>x.id!=d.id);ttSheet=null;save();render()},
};
document.addEventListener("click",e=>{const b=e.target.closest("[data-a]");if(b)A[b.dataset.a](b,b.dataset)});
// Escape closes the class sheet
document.addEventListener("keydown",e=>{if(e.key=="Escape"&&ttSheet){ttSheet=null;render()}});
$("#themeBtn").onclick=()=>{S.theme=S.theme=="dark"?"light":"dark";save();render()};

// ---------- forms ----------
document.addEventListener("submit",e=>{const f=e.target.closest("[data-f]");if(!f)return;e.preventDefault();
  const d=Object.fromEntries(new FormData(f)),k=f.dataset.f,id=uid();
  if((k=="tt"||k=="exams")&&!S.subjects.length)return toast("Add a subject in Attendance first.");
  if(k=="subj")S.subjects.push({id,name:d.name.trim(),color:COL[S.subjects.length%6]});
  else if(k=="ttSheet"){if(!S.subjects.length)return toast("Add a subject in Attendance first.");if(d.end<=d.start)return toast("End time must be after start time.");if(d.id){const c=S.tt.find(x=>x.id==d.id);Object.assign(c,{day:+d.day,start:d.start,end:d.end,subj:d.subj,room:d.room})}else S.tt.push({id,day:+d.day,start:d.start,end:d.end,subj:d.subj,room:d.room});ttSheet=null}
  else if(k=="exams")S.exams.push({id,...d});
  else if(k=="grades"){if(+d.marks>+d.max)return toast("Marks cannot be more than the maximum.");S.grades.push({id,sem:+d.sem,name:d.name,credits:+d.credits,marks:+d.marks,max:+d.max})}
  else if(k=="notices")S.notices.push({id,title:d.title,body:d.body||"",pin:d.pin?1:0,date:new Date().toISOString().slice(0,10)});
  else if(k=="todos")S.todos.push({id,t:d.t,done:0});
  else if(k=="profile"){S.profile={name:d.name,course:d.course,sem:+d.sem};S.theme=d.theme}
  save();render()});

// ---------- 3D tilt on cards ----------
document.addEventListener("pointermove",e=>{const c=e.target.closest(".tilt");
  $$(".tilt.hot").forEach(x=>{if(x!=c){x.classList.remove("hot");x.style.transform=""}});
  if(!c||!matchMedia("(hover:hover)").matches||matchMedia("(prefers-reduced-motion:reduce)").matches)return;
  const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
  c.classList.add("hot");c.style.transform=`perspective(700px) rotateX(${-y*8}deg) rotateY(${x*8}deg) translateY(-2px)`});

render();
