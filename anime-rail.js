(() => {
// Live right-hand panel for wide screens (Anime.js v4 only).
function reduced() {
  try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
}
// True when Anime.js v4 animate is available.
function hasAnime() {
  try { return !!(window.anime && typeof window.anime.animate === "function"); } catch (e) { return false; }
}
// Spring ease with bounce .4, falling back to outBack.
function springEase() {
  try {
    if (window.anime && typeof window.anime.spring === "function") return window.anime.spring({ bounce: 0.4, duration: 800 });
    if (window.anime && typeof window.anime.createSpring === "function") return window.anime.createSpring({ bounce: 0.4, duration: 800 });
  } catch (e) {}
  return "outBack";
}
// Stagger helper that degrades to a plain delay.
function stag(n) {
  try { if (window.anime && typeof window.anime.stagger === "function") return window.anime.stagger(n); } catch (e) {}
  return 0;
}
// Wide-screen breakpoint for the rail.
function isWide() {
  try { return matchMedia("(min-width: 1400px)").matches; } catch (e) {}
  return window.innerWidth >= 1400;
}
// Read-only access to the dashboard store (defined in app.js).
function getS() {
  try { if (typeof S !== "undefined" && S) return S; } catch (e) {}
  try { if (window.S) return window.S; } catch (e) {}
  return null;
}
// Safe wrappers around the app.js helpers (never modified here).
function safeSubj(id) {
  try { if (typeof subj === "function") return subj(id); } catch (e) {}
  return { name: "Unknown", color: "#999" };
}
function safePct(id) {
  try { if (typeof pct === "function") return pct(id); } catch (e) {}
  try {
    const d = getS(), a = d && d.att && d.att[id];
    return a && a.t ? Math.round(a.p / a.t * 100) : null;
  } catch (e) { return null; }
}
function safeDayIdx() {
  try { if (typeof dayIdx === "function") return dayIdx(); } catch (e) {}
  return (new Date().getDay() + 6) % 7;
}
function safeExamTime(e) {
  try { if (typeof examTime === "function") return examTime(e); } catch (e) {}
  try { return new Date(e.date + "T" + e.time); } catch (err) { return new Date(0); }
}
// Next 2 upcoming exams sorted by date.
function upcoming2() {
  try {
    const d = getS();
    if (!d || !Array.isArray(d.exams)) return [];
    return [...d.exams].sort((a, b) => safeExamTime(a) - safeExamTime(b)).filter((e) => safeExamTime(e) > Date.now()).slice(0, 2);
  } catch (e) { return []; }
}
// Escape for names rendered into the rail.
function esc(s) {
  try { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); } catch (e) { return ""; }
}
// "Xd Yh" countdown text.
function cdText(e) {
  try {
    const ms = Math.max(0, safeExamTime(e) - Date.now());
    return Math.floor(ms / 864e5) + "d " + Math.floor((ms % 864e5) / 36e5) + "h";
  } catch (err) { return ""; }
}
// Current hand angles in degrees (smooth minutes/hours).
function handDegs(now) {
  const d = now || new Date();
  const s = d.getSeconds() + d.getMilliseconds() / 1000;
  const m = d.getMinutes() + s / 60;
  const h = (d.getHours() % 12) + m / 60;
  return { s: (s / 60) * 360, m: (m / 60) * 360, h: (h / 12) * 360 };
}

let sweeping = false, todoKey = "", widePrev = false;
const CIRC = 2 * Math.PI * 52;

// 12 tick marks for the clock face.
function ticks() {
  let out = "";
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180, r1 = i % 3 === 0 ? 60 : 66, r2 = 72;
    const x1 = (80 + r1 * Math.sin(a)).toFixed(1), y1 = (80 - r1 * Math.cos(a)).toFixed(1);
    const x2 = (80 + r2 * Math.sin(a)).toFixed(1), y2 = (80 - r2 * Math.cos(a)).toFixed(1);
    out += `<line class="rail-tick" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${i % 3 === 0 ? 3 : 2}"/>`;
  }
  return out;
}
// Full rail markup; every card keeps class "card" and never "tilt".
function buildHTML() {
  const d = getS() || { todos: [], subjects: [], tt: [], att: {} };
  const todos = Array.isArray(d.todos) ? d.todos : [];
  const done = todos.filter((t) => t.done).length, total = todos.length;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0"), mm = String(now.getMinutes()).padStart(2, "0"), ss = String(now.getSeconds()).padStart(2, "0");
  // Tasks card body.
  const tasks = total
    ? `<div class="rail-ring-wrap"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="rail-track" cx="60" cy="60" r="52"/><circle id="rail-todo-ring" cx="60" cy="60" r="52"/></svg><div class="rail-ring-txt"><b>${done}/${total}</b></div></div><p class="rail-sub">tasks done</p>`
    : `<p class="empty">No tasks yet.</p>`;
  // Attendance rows.
  const subs = Array.isArray(d.subjects) ? d.subjects : [];
  const att = subs.length
    ? subs.map((s) => {
        const p = safePct(s.id);
        return `<div class="rail-att-row"><div class="rail-att-top"><span>${esc(s.name)}</span><b>${p == null ? "–" : p + "%"}</b></div><div class="rail-bar${p != null && p < 75 ? " low" : ""}" style="--c:${esc(s.color || "#999")}"><i data-w="${p || 0}" style="width:${p || 0}%"></i><u></u></div></div>`;
      }).join("")
    : `<p class="empty">Add a subject in Attendance.</p>`;
  // Next 2 exams.
  const ex = upcoming2();
  const exams = ex.length
    ? ex.map((e) => {
        const s = safeSubj(e.subj);
        return `<div class="rail-exam" style="--c:${esc(s.color || "#999")}"><b>${esc(s.name)}</b><small>${esc(e.name || "")} · ${esc(e.date || "")} ${esc(e.time || "")}</small><span data-rail-cd="${esc(e.date || "")}T${esc(e.time || "")}">${esc(cdText(e))}</span></div>`;
      }).join("")
    : `<p class="empty">No upcoming exams.</p>`;
  // Week columns Mon..Sun.
  const tt = Array.isArray(d.tt) ? d.tt : [], counts = [0, 1, 2, 3, 4, 5, 6].map((k) => tt.filter((c) => c.day === k).length);
  const mx = Math.max(1, ...counts), today = safeDayIdx();
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const week = `<div class="rail-week">${counts.map((n, i) => {
    const h = n === 0 ? 4 : Math.round(12 + (n / mx) * 60);
    return `<div class="rail-wk${i === today ? " today" : ""}"><div class="rail-wk-col"><i data-h="${h}" style="height:${h}px"></i></div><small>${names[i]}</small></div>`;
  }).join("")}</div>`;
  return `<section class="card" data-rail="clock"><h3>Now</h3><div class="rail-clock-wrap"><svg class="rail-clock" width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="Analog clock"><circle class="rail-face" cx="80" cy="80" r="76"/><g>${ticks()}</g><line id="rail-hour" class="rail-hand" x1="80" y1="80" x2="80" y2="46" stroke-width="5"/><line id="rail-min" class="rail-hand" x1="80" y1="80" x2="80" y2="26" stroke-width="3"/><line id="rail-sec" class="rail-hand" x1="80" y1="80" x2="80" y2="22" stroke-width="2"/><circle class="rail-dot" cx="80" cy="80" r="5"/></svg></div><div id="rail-digital" class="rail-digital">${hh}:${mm}:${ss}</div><div id="rail-date" class="rail-date">${esc(now.toDateString())}</div></section>`
    + `<section class="card" data-rail="tasks"><h3>Tasks</h3>${tasks}</section>`
    + `<section class="card" data-rail="att"><h3>Attendance</h3>${att}</section>`
    + `<section class="card" data-rail="exams"><h3>Exams</h3>${exams}</section>`
    + `<section class="card" data-rail="week"><h3>This week</h3>${week}</section>`;
}
// Plain style update for the hands (never animated per-second).
function setHands(deg) {
  try {
    const h = document.getElementById("rail-hour"), m = document.getElementById("rail-min"), s = document.getElementById("rail-sec");
    if (h) h.style.transform = `rotate(${deg.h}deg)`;
    if (m) m.style.transform = `rotate(${deg.m}deg)`;
    if (s) s.style.transform = `rotate(${deg.s}deg)`;
  } catch (e) {}
}
// One-second clock refresh: digital, date and hands.
function tickClock() {
  try {
    if (!document.getElementById("rail")) return;
    const now = new Date();
    const el = document.getElementById("rail-digital");
    if (el) el.textContent = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0") + ":" + String(now.getSeconds()).padStart(2, "0");
    const dt = document.getElementById("rail-date");
    if (dt) dt.textContent = now.toDateString();
    if (!sweeping) setHands(handDegs(now));
  } catch (e) {}
}
// One-minute exam countdown refresh.
function tickExams() {
  try {
    document.querySelectorAll("[data-rail-cd]").forEach((el) => {
      const t = new Date(el.getAttribute("data-rail-cd")) - Date.now();
      if (isNaN(t)) return;
      const ms = Math.max(0, t);
      el.textContent = Math.floor(ms / 864e5) + "d " + Math.floor((ms % 864e5) / 36e5) + "h";
    });
  } catch (e) {}
}
// Card entrance: slide from the right with a spring.
function fxCards() {
  try {
    if (reduced() || !hasAnime()) return;
    const cards = document.querySelectorAll("#rail .card");
    if (!cards.length) return;
    const { animate, stagger } = window.anime;
    animate(cards, { x: [60, 0], opacity: [0, 1], delay: stagger(110), ease: springEase() });
  } catch (e) {}
}
// Ticks pop in with a stagger.
function fxTicks() {
  try {
    if (reduced() || !hasAnime()) return;
    const t = document.querySelectorAll("#rail .rail-tick");
    if (!t.length) return;
    const { animate, stagger } = window.anime;
    animate(t, { scale: [0, 1], opacity: [0, 1], delay: stagger(40), duration: 400, ease: "outExpo" });
  } catch (e) {}
}
// Hands sweep once from 12 o'clock, then the plain ticker takes over.
function fxSweep() {
  try {
    if (reduced() || !hasAnime()) { setHands(handDegs()); return; }
    const h = document.getElementById("rail-hour"), m = document.getElementById("rail-min"), s = document.getElementById("rail-sec");
    if (!h || !m || !s) return;
    sweeping = true;
    const target = handDegs();
    const done = () => { try { sweeping = false; setHands(handDegs()); } catch (e) { sweeping = false; } };
    const { animate } = window.anime;
    animate(h, { rotate: [0, target.h], duration: 1200, ease: "outExpo" });
    animate(m, { rotate: [0, target.m], duration: 1200, ease: "outExpo" });
    animate(s, { rotate: [0, target.s], duration: 1200, ease: "outExpo", onComplete: done });
    setTimeout(() => { try { if (sweeping) done(); } catch (e) {} }, 1600);
  } catch (e) { try { sweeping = false; setHands(handDegs()); } catch (err) {} }
}
// Tasks ring from empty to the current fraction.
function fxRing(fromEmpty) {
  try {
    const ring = document.getElementById("rail-todo-ring");
    if (!ring) return;
    const d = getS() || { todos: [] }, todos = Array.isArray(d.todos) ? d.todos : [];
    const done = todos.filter((t) => t.done).length, total = todos.length;
    if (!total) return;
    const frac = done / total, off = CIRC * (1 - frac);
    ring.style.strokeDasharray = String(CIRC);
    if (reduced() || !hasAnime() || !fromEmpty) { ring.style.strokeDashoffset = String(off); return; }
    ring.style.strokeDashoffset = String(CIRC);
    const { animate } = window.anime;
    animate(ring, { strokeDashoffset: [CIRC, off], duration: 800, ease: "outExpo" });
  } catch (e) {}
}
// Attendance bars grow from 0; low bars pulse softly.
function fxBars() {
  try {
    if (reduced() || !hasAnime()) return;
    const bars = document.querySelectorAll("#rail .rail-bar i");
    if (!bars.length) return;
    const { animate, stagger } = window.anime;
    bars.forEach((b) => { try { b.style.width = "0%"; } catch (e) {} });
    animate(bars, {
      width: ["0%", (el) => (el.getAttribute("data-w") || "0") + "%"],
      duration: 700, ease: "outExpo", delay: stagger(90),
      onComplete: () => { try { bars.forEach((b) => { b.style.width = (b.getAttribute("data-w") || "0") + "%"; }); } catch (e) {} },
    });
  } catch (e) {}
  try {
    if (reduced() || !hasAnime()) return;
    const low = document.querySelectorAll("#rail .rail-bar.low");
    if (!low.length) return;
    const { animate } = window.anime;
    animate(low, { opacity: [1, 0.55], duration: 900, loop: true, alternate: true });
  } catch (e) {}
}
// Week columns grow from 0.
function fxWeek() {
  try {
    if (reduced() || !hasAnime()) return;
    const cols = document.querySelectorAll("#rail .rail-wk-col i");
    if (!cols.length) return;
    const { animate, stagger } = window.anime;
    animate(cols, { scaleY: [0, 1], duration: 600, ease: "outExpo", delay: stagger(60) });
  } catch (e) {}
}
// Render the rail; entrance=true replays all effects.
function render(entrance) {
  try {
    const rail = document.getElementById("rail");
    if (!rail) return;
    rail.innerHTML = buildHTML();
    const ring = document.getElementById("rail-todo-ring");
    if (ring) { try { ring.style.strokeDasharray = String(CIRC); } catch (e) {} }
    const d = getS() || { todos: [] }, todos = Array.isArray(d.todos) ? d.todos : [];
    todoKey = todos.filter((t) => t.done).length + "/" + todos.length;
    if (!entrance || reduced() || !hasAnime()) {
      try { setHands(handDegs()); } catch (e) {}
      try { fxRing(false); } catch (e) {}
      return;
    }
    try { fxCards(); } catch (e) {}
    try { fxTicks(); } catch (e) {}
    try { fxSweep(); } catch (e) {}
    try { fxRing(true); } catch (e) {}
    try { fxBars(); } catch (e) {}
    try { fxWeek(); } catch (e) {}
  } catch (e) {}
}
// Instant data refresh (no entrance); ring replays only when counts change.
function refresh() {
  try {
    const rail = document.getElementById("rail");
    if (!rail) return;
    const d = getS() || { todos: [] }, todos = Array.isArray(d.todos) ? d.todos : [];
    const key = todos.filter((t) => t.done).length + "/" + todos.length;
    const changed = key !== todoKey;
    render(false);
    if (changed) { try { fxRing(true); } catch (e) {} }
    try { tickExams(); } catch (e) {}
  } catch (e) {}
}
try { widePrev = isWide(); } catch (e) { widePrev = false; }
try { render(widePrev && !reduced()); } catch (e) {}
try { tickClock(); } catch (e) {}
try { setInterval(tickClock, 1000); } catch (e) {}
try { setInterval(tickExams, 60000); } catch (e) {}
// Refresh instantly when the main view re-renders.
try {
  const view = document.getElementById("view");
  if (view) new MutationObserver(() => { try { refresh(); } catch (e) {} }).observe(view, { childList: true });
} catch (e) {}
// Replay the entrance when the window grows past 1400px.
try {
  window.addEventListener("resize", () => {
    try {
      const w = isWide();
      if (w && !widePrev) render(true);
      widePrev = w;
    } catch (e) {}
  });
} catch (e) {}
})();
