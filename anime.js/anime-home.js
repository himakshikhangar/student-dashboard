(() => {
// Home landing animations (Anime.js v4 only: animate, createTimeline, stagger, spring, utils).
// Fallbacks: splitText -> manual spans, spring -> 'outBack'. No errors if anime is missing.
function reduced(){try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}}
function hasAnime(){try{return !!(window.anime&&typeof anime.animate==="function")}catch(e){return false}}
function hoverOK(){try{return matchMedia("(hover: hover)").matches}catch(e){return false}}
function getS(){try{if(typeof S!=="undefined"&&S)return S}catch(e){}try{return JSON.parse(localStorage.getItem("sd.v1"))}catch(e){}return null}
function dayIdx(){return (new Date().getDay()+6)%7}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
// spring ease, falling back to outBack
function springEase(bounce){try{if(typeof anime.spring==="function")return anime.spring({bounce:bounce,duration:700})}catch(e){}return "outBack"}
// stagger delay, falling back to 0
function stag(v,opts){try{if(typeof anime.stagger==="function")return anime.stagger(v,opts)}catch(e){}return 0}

let cols=0,rows=0,dots=[],centres=[],glowCur=[];
let rippleRunning=false;
let entranceDone=false,lastHash=null,dayAnimated=false;
let glowRaf=0,glowIn=false,glowPX=0,glowPY=0;

// greeting for an hour (5-11 morning, 12-16 afternoon, 17-20 evening, else night)
function greetFor(h){if(h>=5&&h<=11)return "Good morning";if(h>=12&&h<=16)return "Good afternoon";if(h>=17&&h<=20)return "Good evening";return "Good night"}
// instant text refresh (no animation)
function refreshText(){try{
  const d=getS();if(!d)return;
  const g=document.getElementById("greet"),hl=document.getElementById("hline"),hd=document.getElementById("hdate");
  const h=new Date().getHours(),gr=greetFor(h),name=(d.profile&&d.profile.name)||"Student";
  if(g&&!g.querySelector("span"))g.textContent=gr+", "+name;
  if(g&&g.querySelector("span")&&!g.dataset.anim)g.textContent=gr+", "+name;
  const today=(d.tt||[]).filter(c=>c.day==dayIdx()).sort((a,b)=>a.start<b.start?-1:1);
  let line=today.length?`You have ${today.length} class${today.length==1?"":"es"} today. First one at ${today[0].start}.`:`No classes today. A good day to catch up.`;
  try{
    const pct=id=>{const a=d.att[id];return a&&a.t?Math.round(a.p/a.t*100):null};
    const lows=(d.subjects||[]).map(s=>({s,p:pct(s.id)})).filter(x=>x.p!=null&&x.p<75).sort((a,b)=>a.p-b.p);
    if(lows.length)line+=` ${lows[0].s.name} needs attention.`;
  }catch(e){}
  if(hl)hl.textContent=line;
  if(hd)hd.textContent=new Date().toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long",year:"numeric"});
}catch(e){}}
// split #greet into char spans (splitText first, manual fallback)
function greetChars(){try{
  const g=document.getElementById("greet");if(!g)return [];
  if(g.dataset.anim&&g.querySelectorAll("span").length)return [...g.querySelectorAll("span")];
  try{
    const fn=window.anime&&(anime.splitText);
    if(typeof fn==="function"){
      if(g.querySelector("span"))g.textContent=g.textContent;
      const r=fn("#greet",{chars:true});
      if(r&&r.chars&&r.chars.length){g.dataset.anim="1";return r.chars}
    }
  }catch(e){}
  const txt=g.textContent;g.textContent="";
  const out=[];
  [...txt].forEach(ch=>{const s=document.createElement("span");s.textContent=ch===" "?"\u00a0":ch;s.style.display="inline-block";g.appendChild(s);out.push(s)});
  g.dataset.anim="1";return out;
}catch(e){return []}}

// A. dot grid build
function buildDots(withEntrance){try{
  const grid=document.getElementById("dotgrid");if(!grid)return;
  if(reduced()){grid.innerHTML="";dots=[];centres=[];cols=rows=0;return}
  const w=grid.clientWidth||grid.parentElement.clientWidth||300;
  const h=grid.clientHeight||grid.parentElement.clientHeight||340;
  cols=Math.max(1,Math.floor(w/28));rows=Math.max(1,Math.floor(h/28));
  grid.innerHTML="";
  grid.style.gridTemplateColumns=`repeat(${cols}, 28px)`;
  grid.style.gridTemplateRows=`repeat(${rows}, 28px)`;
  dots=[];centres=[];glowCur=[];
  for(let i=0;i<cols*rows;i++){const d=document.createElement("div");d.className="dot";grid.appendChild(d);dots.push(d);glowCur.push(0)}
  try{dots.forEach(d=>{const r=d.getBoundingClientRect();centres.push({x:r.left+r.width/2,y:r.top+r.height/2})})}catch(e){centres=dots.map(()=>({x:0,y:0}))}
  if(withEntrance&&hasAnime()&&!reduced()){
    try{anime.animate(dots,{scale:[0,1],opacity:[0,.25],delay:stag(12,{grid:[cols,rows],from:"center"}),duration:700,ease:"outBack"})}catch(e){}
  }else{try{dots.forEach(d=>{d.style.transform="";d.style.opacity=""})}catch(e){}}
}catch(e){}}
let resizeT=0;
try{addEventListener("resize",()=>{clearTimeout(resizeT);resizeT=setTimeout(()=>{try{buildDots(false);measureCentres()}catch(e){}},200)})}catch(e){}
// re-measure centres (once per rebuild)
function measureCentres(){try{centres=dots.map(d=>{const r=d.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})}catch(e){}}

// B. click ripple (nearest dot as stagger origin)
function bindRipple(){try{
  document.addEventListener("click",e=>{try{
    if(rippleRunning||reduced()||!hasAnime())return;
    const t=e.target;if(!t||!t.closest)return;
    if(t.closest("a"))return;
    const hero=t.closest(".hero");if(!hero)return;
    if(!dots.length||!centres.length)return;
    let best=0,bd=1e12;
    centres.forEach((c,i)=>{const dx=c.x-e.clientX,dy=c.y-e.clientY,d=dx*dx+dy*dy;if(d<bd){bd=d;best=i}});
    rippleRunning=true;
    anime.animate(dots,{scale:[1,2.4,1],translateY:[0,-14,0],opacity:[.25,1,.25],delay:stag(40,{grid:[cols,rows],from:best}),duration:900,ease:"inOutSine",onComplete:()=>{try{rippleRunning=false}catch(e){}}});
    setTimeout(()=>{rippleRunning=false},1100);
  }catch(err){}});
}catch(e){}}

// C. pointer glow (rAF only, never animate() on pointermove)
function glowTick(){try{
  glowRaf=0;
  if(!dots.length)return;
  let rest=true;
  for(let i=0;i<dots.length;i++){
    const c=centres[i]||{x:0,y:0};
    const dx=c.x-glowPX,dy=c.y-glowPY;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const target=glowIn?Math.max(0,1-dist/90):0;
    glowCur[i]+=(target-glowCur[i])*0.15;
    if(Math.abs(target-glowCur[i])>0.01)rest=false;
    const v=glowCur[i];
    try{dots[i].style.transform=`scale(${(1+v*1.6).toFixed(3)})`;dots[i].style.opacity=(.25+v*.75).toFixed(3)}catch(e){}
  }
  if(!rest||glowIn){glowRaf=requestAnimationFrame(glowTick)}
  else{try{dots.forEach(d=>{d.style.transform="";d.style.opacity=""})}catch(e){}glowCur=dots.map(()=>0)}
}catch(e){}}
function bindGlow(){try{
  if(!hoverOK())return;
  document.addEventListener("pointermove",e=>{try{
    const t=e.target;const hero=t&&t.closest?t.closest(".hero"):null;
    if(!hero){if(glowIn){glowIn=false;if(!glowRaf)glowRaf=requestAnimationFrame(glowTick)}return}
    if(reduced()||!dots.length)return;
    glowIn=true;glowPX=e.clientX;glowPY=e.clientY;
    if(!glowRaf)glowRaf=requestAnimationFrame(glowTick);
  }catch(err){}});
  document.addEventListener("pointerout",e=>{try{
    const t=e.target;const hero=t&&t.closest?t.closest(".hero"):null;
    if(!hero)return;
    const to=e.relatedTarget;
    if(to&&to.closest&&to.closest(".hero"))return;
    glowIn=false;if(!glowRaf)glowRaf=requestAnimationFrame(glowTick);
  }catch(err){}});
}catch(e){}}

// D. idle wave every 7s while visible and on screen
function bindIdle(){try{
  setInterval(()=>{try{
    if(document.hidden||rippleRunning||reduced()||!hasAnime()||!dots.length)return;
    const hero=document.querySelector(".hero");if(!hero)return;
    const r=hero.getBoundingClientRect();
    if(r.bottom<0||r.top>innerHeight)return;
    anime.animate(dots,{scale:[1,1.8,1],delay:stag(30,{grid:[cols,rows],from:"first"}),duration:800,ease:"inOutSine"});
  }catch(e){}},7000);
}catch(e){}}

// E. greeting entrance timeline
function entranceGreeting(doAnim){try{
  refreshText();
  const g=document.getElementById("greet"),hl=document.getElementById("hline"),ck=document.getElementById("hclock");
  const btns=[...document.querySelectorAll(".hero .btn")];
  if(!g)return;
  if(reduced()||!hasAnime()||!doAnim){
    try{delete g.dataset.anim;refreshText();if(hl){hl.style.opacity="";hl.style.transform=""}btns.forEach(b=>{b.style.transform="";b.style.opacity=""});if(ck)ck.style.opacity=""}catch(e){}
    return;
  }
  try{
    const chars=greetChars();
    g.style.perspective="600px";
    chars.forEach(c=>{c.style.transformOrigin="50% 100%"});
    const tl=anime.createTimeline();
    tl.add(chars,{rotateX:[-90,0],translateY:[30,0],opacity:[0,1],delay:stag(28),ease:"outExpo",duration:600});
    if(hl)tl.add(hl,{opacity:[0,1],translateY:[12,0],duration:500,ease:"outExpo"},">-200");
    if(btns.length)tl.add(btns,{scale:[.7,1],opacity:[0,1],delay:stag(80),ease:springEase(.5),duration:600},"<");
    if(ck)tl.add(ck,{opacity:[0,1],duration:500,ease:"outExpo"});
  }catch(e){
    try{ // fallback without timeline
      const chars=greetChars();
      anime.animate(chars,{opacity:[0,1],translateY:[30,0],delay:stag(28),duration:600,ease:"outExpo"});
      if(hl)anime.animate(hl,{opacity:[0,1],translateY:[12,0],duration:500,ease:"outExpo",delay:400});
      if(btns.length)anime.animate(btns,{scale:[.7,1],opacity:[0,1],delay:stag(80),duration:600,ease:"outBack"});
      if(ck)anime.animate(ck,{opacity:[0,1],duration:500,delay:800});
    }catch(err){}
  }
}catch(e){}}

// F. stat tiles (never touch .tilt transforms)
function entranceTiles(doAnim){try{
  const tiles=[...document.querySelectorAll(".home-tile")];
  if(!tiles.length)return;
  const rings=tiles.map(t=>t.querySelector(".rg")).filter(Boolean);
  const vals=tiles.map(t=>t.querySelector(".hv")).filter(Boolean);
  const fills=tiles.map(t=>{const f=parseFloat((t.dataset&&t.dataset.fill)||(t.querySelector(".rg")||{}).dataset?.fill||"0");return isNaN(f)?0:Math.max(0,Math.min(1,f))});
  const finals=rings.map((r,i)=>214*(1-fills[i]));
  const setFinal=()=>{try{
    rings.forEach((r,i)=>{r.style.strokeDashoffset=finals[i]});
    vals.forEach(b=>{b.textContent=(b.dataset?b.dataset.to:"0")+(b.dataset?b.dataset.suffix||"":"")});
  }catch(e){}};
  if(reduced()||!hasAnime()||!doAnim){setFinal();return}
  try{
    anime.animate(tiles,{translateY:[40,0],scale:[.9,1],opacity:[0,1],delay:stag(90),ease:springEase(.45),duration:700});
    rings.forEach((r,i)=>{try{r.style.strokeDashoffset=214;anime.animate(r,{strokeDashoffset:[214,finals[i]],duration:1200,ease:"outExpo",delay:500+i*90})}catch(e){}});
    vals.forEach((b,i)=>{try{
      const toS=b.dataset?b.dataset.to||"0":"0",suf=b.dataset?b.dataset.suffix||"":"";
      const target=parseFloat(toS)||0;
      const dec=(toS.split(".")[1]||"").length;
      const o={v:0};
      anime.animate(o,{v:[0,target],duration:1200,ease:"outExpo",delay:500+i*90,onUpdate:()=>{try{b.textContent=o.v.toFixed(dec)+suf}catch(e){}},onComplete:()=>{try{b.textContent=target.toFixed(dec)+suf}catch(e){}}});
    }catch(e){}});
  }catch(e){setFinal()}
}catch(e){}}

// G. up next + day progress (bar animates once, then follows time)
function upNextHTML(d){try{
  const nx=(d.tt||[]).filter(c=>c.day==dayIdx()).sort((a,b)=>a.start<b.start?-1:1).find(c=>{const n=new Date();const hh=String(n.getHours()).padStart(2,"0")+":"+String(n.getMinutes()).padStart(2,"0");return c.start>hh});
  if(nx){const s=(d.subjects||[]).find(x=>x.id==nx.subj)||{name:"Class"};return `<p><b>${esc(s.name)}</b> · ${nx.start} · ${esc(nx.room||"")}</p><p class="up-time" data-start="${nx.start}">Starts in <b>--:--</b></p>`}
  const fut=(d.exams||[]).map(e=>({e,t:new Date(e.date+"T"+e.time)})).filter(x=>x.t>Date.now()).sort((a,b)=>a.t-b.t)[0];
  if(fut){const s=(d.subjects||[]).find(x=>x.id==fut.e.subj)||{name:"Exam"};return `<p><b>${esc(s.name)}</b> · ${esc(fut.e.name)} · ${fut.e.date} ${fut.e.time}</p><p class="up-time" data-exam="${fut.e.date}T${fut.e.time}"><b>--</b></p>`}
  return `<p>Nothing scheduled</p>`;
}catch(e){return `<p>Nothing scheduled</p>`}}
function tickUpNext(){try{
  const box=document.querySelector("#upnext .up-body");if(!box)return;
  const d=getS();if(!d)return;
  const curStart=box.querySelector("[data-start]"),curExam=box.querySelector("[data-exam]");
  const nx=(d.tt||[]).filter(c=>c.day==dayIdx()).sort((a,b)=>a.start<b.start?-1:1).find(c=>{const n=new Date();const hh=String(n.getHours()).padStart(2,"0")+":"+String(n.getMinutes()).padStart(2,"0");return c.start>hh});
  if(nx){
    if(!curStart||curStart.dataset.start!==nx.start)box.innerHTML=upNextHTML(d);
    const el=box.querySelector(".up-time b");if(!el)return;
    const [h,m]=nx.start.split(":").map(Number);
    const t=new Date();t.setHours(h,m,0,0);
    let s=Math.max(0,Math.floor((t-Date.now())/1000));
    const mm=String(Math.floor(s/60)).padStart(2,"0"),ss=String(s%60).padStart(2,"0");
    const txt=`${mm}:${ss}`;if(el.textContent!==txt)el.textContent=txt;
    return;
  }
  const fut=(d.exams||[]).map(e=>({e,t:new Date(e.date+"T"+e.time)})).filter(x=>x.t>Date.now()).sort((a,b)=>a.t-b.t)[0];
  if(fut){
    const key=fut.e.date+"T"+fut.e.time;
    if(!curExam||curExam.dataset.exam!==key)box.innerHTML=upNextHTML(d);
    const el=box.querySelector(".up-time b");if(!el)return;
    const ms=Math.max(0,fut.t-Date.now());
    const dd=Math.floor(ms/864e5),hh=Math.floor(ms%864e5/36e5);
    const txt=`${dd}d ${hh}h`;if(el.textContent!==txt)el.textContent=txt;
    return;
  }
  if(box.textContent.trim()!=="Nothing scheduled")box.innerHTML=`<p>Nothing scheduled</p>`;
}catch(e){}}
function tickDay(animateOnce){try{
  const bar=document.querySelector("#dayprog .dayfill"),mark=document.querySelector("#dayprog .daymark"),pct=document.querySelector("#dayprog .daypct");
  if(!bar)return;
  const n=new Date(),mins=n.getHours()*60+n.getMinutes()+n.getSeconds()/60;
  const p=Math.max(0,Math.min(100,(mins-480)/(1080-480)*100));
  if(pct)pct.textContent=p.toFixed(0)+"%";
  if(animateOnce&&!dayAnimated&&hasAnime()&&!reduced()){
    dayAnimated=true;
    try{bar.style.width="0";mark.style.left="0";anime.animate(bar,{width:[ "0%",p.toFixed(1)+"%"],duration:1000,ease:"outExpo",onUpdate:()=>{try{mark.style.left=bar.style.width}catch(e){}},onComplete:()=>{try{bar.style.width=p.toFixed(1)+"%";mark.style.left=p.toFixed(1)+"%"}catch(e){}}});setTimeout(()=>{try{mark.style.left=p.toFixed(1)+"%"}catch(e){}},1050)}catch(e){bar.style.width=p.toFixed(1)+"%";mark.style.left=p.toFixed(1)+"%"}
  }else{bar.style.width=p.toFixed(1)+"%";if(mark)mark.style.left=p.toFixed(1)+"%"}
}catch(e){}}

// clock with rolling digits
function buildClock(){try{
  const c=document.getElementById("hclock");if(!c)return;
  const n=new Date(),s=[n.getHours(),n.getMinutes(),n.getSeconds()].map(x=>String(x).padStart(2,"0")).join(":");
  if(!c.querySelector("span")){c.textContent="";[...s].forEach(ch=>{const sp=document.createElement("span");sp.textContent=ch;sp.dataset.ch=ch;c.appendChild(sp)})}
}catch(e){}}
function tickClock(){try{
  const c=document.getElementById("hclock");if(!c)return;
  const n=new Date(),s=[n.getHours(),n.getMinutes(),n.getSeconds()].map(x=>String(x).padStart(2,"0")).join(":");
  if(!c.querySelector("span")){c.textContent=s;return}
  const spans=[...c.querySelectorAll("span")];
  while(spans.length<s.length){const sp=document.createElement("span");sp.textContent="";c.appendChild(sp);spans.push(sp)}
  [...s].forEach((ch,i)=>{try{
    const sp=spans[i];if(!sp)return;
    if(sp.textContent===ch)return;
    if(reduced()||!hasAnime()||ch===":"){sp.textContent=ch;return}
    try{
      anime.animate(sp,{translateY:["0%","-100%"],opacity:[1,0],duration:250,ease:"outExpo",onComplete:()=>{try{
        sp.textContent=ch;
        anime.animate(sp,{translateY:["100%","0%"],opacity:[0,1],duration:250,ease:"outExpo"});
      }catch(e){sp.textContent=ch}}});
    }catch(e){sp.textContent=ch}
  }catch(e){}});
}catch(e){}}

// H. render wiring with re-render safety
function onHome(doEntrance){try{
  refreshText();buildClock();tickClock();tickUpNext();
  buildDots(doEntrance);
  entranceGreeting(doEntrance);
  entranceTiles(doEntrance);
  tickDay(doEntrance);
}catch(e){}}
function handleRender(){try{
  if(!document.getElementById("greet"))return;
  const h=location.hash;
  const repeat=entranceDone&&h===lastHash;
  lastHash=h;
  if(repeat){ // instant refresh, no entrance replay
    try{refreshText();buildClock();tickUpNext();tickDay(false);entranceTiles(false);
      const g=document.getElementById("greet");if(g&&!g.dataset.anim)refreshText();
    }catch(e){}
    return;
  }
  entranceDone=true;
  onHome(true);
}catch(e){}}

try{addEventListener("home:render",handleRender)}catch(e){}
try{addEventListener("hashchange",()=>{try{if(location.hash!=="#home"&&location.hash!=="")entranceDone=false;dayAnimated=false;const g=document.getElementById("greet");if(g)delete g.dataset.anim}catch(e){}})}catch(e){}
// per-second and per-minute ticks (started once)
try{setInterval(()=>{try{if(document.getElementById("greet")){tickClock();tickUpNext();tickDay(false)}}catch(e){}},1000)}catch(e){}
try{setInterval(()=>{try{if(document.getElementById("greet"))refreshText()}catch(e){}},60000)}catch(e){}
bindRipple();bindGlow();bindIdle();
// run once on load if #greet exists
try{if(document.getElementById("greet")){lastHash=location.hash;entranceDone=true;onHome(true)}}catch(e){}
})();
