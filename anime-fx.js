(() => {
// Bail when Anime.js is missing or the user prefers reduced motion.
if (!window.anime || !anime.animate || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
const { animate, stagger, createTimeline } = anime;

// Run a function without letting it break the dashboard.
function safe(fn) { try { fn(); } catch (e) {} }

// Previous splitText result, so re-splitting the title stays clean.
let titleSplit = null;

// Split #title into per-character elements, preferring anime.splitText.
function titleChars() {
  const t = document.getElementById("title");
  if (!t) return [];
  // Try the official splitter first (v4.1+ exposes splitText; newer builds use text.split).
  try {
    const fn = anime.splitText || (anime.text && anime.text.split);
    if (typeof fn === "function") {
      try { if (titleSplit && titleSplit.revert) titleSplit.revert(); } catch (e) {}
      // If the title was manually split before, flatten it back to plain text.
      if (t.querySelector("span")) t.textContent = t.textContent;
      titleSplit = fn("#title", { chars: true });
      if (titleSplit && titleSplit.chars && titleSplit.chars.length) return titleSplit.chars;
    }
  } catch (e) {}
  // Manual fallback: one inline-block span per character.
  titleSplit = null;
  const txt = t.textContent;
  t.textContent = "";
  const out = [];
  [...txt].forEach((ch) => {
    const s = document.createElement("span");
    s.textContent = ch === " " ? " " : ch;
    s.style.display = "inline-block";
    t.appendChild(s);
    out.push(s);
  });
  return out;
}

// A. Title letters rise in on every view change.
function fxTitle() {
  try {
    if (typeof animate !== "function" || typeof stagger !== "function") return;
    const chars = titleChars();
    if (!chars.length) return;
    animate(chars, { opacity: [0, 1], y: [40, 0], duration: 500, ease: "outExpo", delay: stagger(30) });
  } catch (e) {}
}

// B. Stat numbers pop with a spring ease (animate the inner "b", never the .tilt card).
function fxStats() {
  try {
    if (typeof animate !== "function" || typeof stagger !== "function") return;
    const nums = document.querySelectorAll(".stat b");
    if (!nums.length) return;
    animate(nums, { scale: [0.6, 1], opacity: [0, 1], duration: 700, ease: "outElastic(1, .6)", delay: stagger(80, { from: "center" }) });
  } catch (e) {}
}

// C. Rows slide in from the left via the Anime.js scroll observer.
function fxRows() {
  try {
    if (typeof animate !== "function") return;
    const scroller = anime.onScroll;
    if (typeof scroller !== "function") return;
    const rows = document.querySelectorAll("#view .row");
    rows.forEach((row) => {
      animate(row, { x: [-30, 0], opacity: [0, 1], duration: 500, ease: "outExpo", autoplay: scroller({ target: row }) });
    });
  } catch (e) {}
}

// Page-change wiring: MutationObserver on #view, childList only.
// Rows re-run only when the hash (page) actually changed, so button
// presses that re-render the same page do not replay the scroll effect.
let lastHash = location.hash;
function onViewChanged() {
  const h = location.hash;
  const pageChanged = h !== lastHash;
  lastHash = h;
  safe(fxTitle);
  safe(fxStats);
  if (pageChanged) safe(fxRows);
}
safe(fxTitle);
safe(fxStats);
safe(fxRows);
const view = document.getElementById("view");
if (view) new MutationObserver(onViewChanged).observe(view, { childList: true });
})();
