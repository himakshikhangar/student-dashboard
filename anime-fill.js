(() => {
// Overview fill cards (Anime.js v4 only). No hover animate() calls here;
// tile lift is a CSS transition in style.css.
function reduced() {
  try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
}
// Run a function without letting it break the dashboard.
function safe(fn) { try { fn(); } catch (e) {} }
// Spring ease for tiles/dots, falling back to outBack.
function springEase() {
  try {
    if (typeof anime.spring === "function") return anime.spring({ bounce: 0.4, duration: 700 });
    if (typeof anime.createSpring === "function") return anime.createSpring({ bounce: 0.4, duration: 700 });
  } catch (e) {}
  return "outBack";
}
// True on #overview (empty hash renders Overview in app.js).
function isOverview() {
  try { const h = location.hash; return h === "" || h === "#" || h === "#overview"; } catch (e) { return false; }
}
// Bars grow 0 -> width in 1100ms outExpo stagger(110); percentages count up alongside.
function fxBars() {
  try {
    if (reduced()) return;
    if (!window.anime || typeof anime.animate !== "function") return;
    const { animate, stagger } = anime;
    const fills = [...document.querySelectorAll("#view .fill-fill")];
    if (fills.length) {
      try {
        animate(fills, { width: ["0%", (el) => (el.dataset.w || "0") + "%"], duration: 1100, ease: "outExpo", delay: typeof stagger === "function" ? stagger(110) : 0 });
      } catch (e) {}
    }
    const pcts = [...document.querySelectorAll("#view .fill-pct[data-pct]")];
    pcts.forEach((el, i) => {
      try {
        const target = parseFloat(el.dataset.pct);
        if (isNaN(target)) return;
        const o = { v: 0 };
        animate(o, { v: target, duration: 1100, ease: "outExpo", delay: i * 110, onUpdate: () => { try { el.textContent = Math.round(o.v) + "%"; } catch (e) {} } });
      } catch (e) {}
    });
  } catch (e) {}
}
// Day tiles flip in with rotateX -80 -> 0, stagger(70), spring bounce .4.
function fxTiles() {
  try {
    if (reduced()) return;
    if (!window.anime || typeof anime.animate !== "function") return;
    const { animate, stagger } = anime;
    const tiles = [...document.querySelectorAll("#view .fill-day")];
    if (!tiles.length) return;
    animate(tiles, { rotateX: [-80, 0], opacity: [0, 1], duration: 700, ease: springEase(), delay: typeof stagger === "function" ? stagger(70) : 0 });
  } catch (e) {}
}
// Subject dots pop in with scale 0 -> 1, stagger(20), starting after the tiles.
function fxDots() {
  try {
    if (reduced()) return;
    if (!window.anime || typeof anime.animate !== "function") return;
    const { animate, stagger } = anime;
    const dots = [...document.querySelectorAll("#view .fill-dot")];
    if (!dots.length) return;
    animate(dots, { scale: [0, 1], duration: 400, ease: springEase(), delay: typeof stagger === "function" ? stagger(20, { start: 500 }) : 500 });
  } catch (e) {}
}
// Only run when the route is Overview and the cards exist;
// replay only when the route changed to Overview.
let lastWasOverview = null;
function onViewChanged() {
  try {
    const over = isOverview();
    const was = lastWasOverview;
    lastWasOverview = over;
    if (!over || was === true) return;
    if (!document.querySelector("#view .fill-card")) return;
    if (reduced()) return;
    safe(fxBars);
    safe(fxTiles);
    safe(fxDots);
  } catch (e) {}
}
try {
  lastWasOverview = null;
  onViewChanged();
  const view = document.getElementById("view");
  if (view) new MutationObserver(onViewChanged).observe(view, { childList: true });
} catch (e) {}
})();
