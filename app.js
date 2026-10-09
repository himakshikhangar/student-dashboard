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
V.overview=()=>{
  const today=S.tt.filter(c=>c.day==dayIdx()).sort(byStart),ps=S.subjects.map(s=>pct(s.id)).filter(x=>x!=null);
  const avg=ps.length?Math.round(ps.reduce((a,b)=>a+b)/ps.length):0,low=S.subjects.filter(s=>pct(s.id)!=null&&pct(s.id)<75),ex=nextExam();
  return `<div class="grid stats">${stat("Overall attendance",ps.length?avg+"%":"–",avg<75&&ps.length?"red":"green")}${stat("Classes today",today.length)}${stat("Next exam",ex?Math.ceil((examTime(ex)-Date.now())/864e5)+" days":"None")}${stat("CGPA",gpa(S.grades).toFixed(2))}</div>
  ${low.length?`<div class="alert"><b>Attendance shortage</b><br>${low.map(s=>`${esc(s.name)} is at ${pct(s.id)}%: ${need(s.id)}`).join("<br>")}</div>`:""}
  <div class="grid two"><div class="card"><h3>Today's schedule</h3>${classList(today)}</div><div class="card"><h3>To-do</h3>${todoList(S.todos.slice(0,5))}</div></div>`};
V.timetable=()=>`<form class="card form" data-f="tt"><select name="day" aria-label="Day">${DAYS.map((d,i)=>`<option value="${i}">${d}</option>`).join("")}</select><input type="time" name="start" required aria-label="Start"><input type="time" name="end" required aria-label="End"><select name="subj" aria-label="Subject">${subjOpts()}</select><input name="room" placeholder="Room"><button class="btn b">Add class</button><button type="button" class="btn y" data-a="notify">Enable reminders</button></form>
  <div class="week">${DAYS.map((d,i)=>`<div class="card day${i==dayIdx()?" today":""}"><h3>${d}</h3>${S.tt.some(c=>c.day==i)?classList(S.tt.filter(c=>c.day==i).sort(byStart),1):'<p class="empty">Free</p>'}</div>`).join("")}</div>`;
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
const TABS=[["overview","Overview"],["timetable","Timetable"],["attendance","Attendance"],["exams","Exams"],["grades","Grades"],["focus","Focus"],["notices","Notices"],["profile","Profile"]];
function render(){
  const t=TABS.find(x=>x[0]==location.hash.slice(1))||TABS[0];
  document.documentElement.dataset.theme=S.theme;
  $("#tabs").innerHTML=TABS.map(([k,n])=>`<a href="#${k}" class="${k==t[0]?"on":""}">${n}</a>`).join("");
  $("#title").textContent=t[1];$("#sub").textContent=`${S.profile.name} · ${S.profile.course}, Sem ${S.profile.sem} · ${new Date().toDateString()}`;
  $("#view").innerHTML=V[t[0]]();tickCD();drawPM();
}
addEventListener("hashchange",render);

// ---------- countdown, pomodoro, toast ----------
function tickCD(){$$("[data-cd]").forEach(el=>{let ms=Math.max(0,new Date(el.dataset.cd)-Date.now());
  const v=[864e5,36e5,6e4,1e3].map(u=>{const x=Math.floor(ms/u);ms-=x*u;return x});
  $$("b",el).forEach((b,i)=>{const t=String(v[i]).padStart(2,0);if(b.textContent!=t){b.textContent=t;b.classList.remove("flipit");void b.offsetWidth;b.classList.add("flipit")}})})}
setInterval(tickCD,1000);
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
  clear:()=>{if(confirm("Delete all your data?")){const t=S.theme,p=S.profile;S=fresh();S.theme=t;S.profile=p;save();render()}}
};
document.addEventListener("click",e=>{const b=e.target.closest("[data-a]");if(b)A[b.dataset.a](b,b.dataset)});
$("#themeBtn").onclick=()=>{S.theme=S.theme=="dark"?"light":"dark";save();render()};

// ---------- forms ----------
document.addEventListener("submit",e=>{const f=e.target.closest("[data-f]");if(!f)return;e.preventDefault();
  const d=Object.fromEntries(new FormData(f)),k=f.dataset.f,id=uid();
  if((k=="tt"||k=="exams")&&!S.subjects.length)return toast("Add a subject in Attendance first.");
  if(k=="subj")S.subjects.push({id,name:d.name.trim(),color:COL[S.subjects.length%6]});
  else if(k=="tt"){if(d.end<=d.start)return toast("End time must be after start time.");S.tt.push({id,...d,day:+d.day})}
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
