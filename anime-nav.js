(() => {
// Advanced nav animations (Anime.js v4 only). app.js re-renders #tabs
// innerHTML on every render, so listeners use delegation on #nav and the
// pill lives in #nav (outside #tabs) to survive re-renders.
try {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
} catch (e) { return; }
// No errors when Anime.js failed to load; plain yellow tab remains.
if (!window.anime || typeof anime.animate !== "function") return;
const { animate, stagger } = anime;

// Spring ease for the pill, falling back to a string ease.
function springEase() {
  try {
    if (typeof anime.spring === "function") return anime.spring({ bounce: 0.5, duration: 700 });
    if (typeof anime.createSpring === "function") return anime.createSpring({ bounce: 0.5, duration: 700 });
  } catch (e) {}
  return "outElastic(1, .5)";
}
// Narrow = bottom tab bar (matches the 760px media query).
function isMobile() {
  try { return matchMedia("(max-width: 760px)").matches; } catch (e) {}
  return window.innerWidth <= 760;
}
function safe(fn) { try { fn(); } catch (e) {} }

// 1. Entrance: links swing in once; logo cube pops from scale 0.
// Runs only for the first render; later links stay fully visible.
function fxEntrance() {
  try {
    const tabs = document.getElementById("tabs");
    if (!tabs) return;
    let ran = false;
    // Inline leftovers hide the active label, so always clear them.
    const clean = (links) => {
      try {
        links.forEach((l) => {
          l.style.opacity = "";
          l.style.transform = "";
          l.style.visibility = "";
        });
      } catch (e) {}
    };
    // Any link created by a later render must be visible immediately.
    try {
      new MutationObserver((muts) => {
        if (!ran) return;
        muts.forEach((m) => {
          m.addedNodes.forEach((n) => {
            try {
              if (n.nodeType === 1 && n.matches && n.matches("a")) {
                n.style.opacity = "";
                n.style.transform = "";
                n.style.visibility = "";
              }
            } catch (e) {}
          });
        });
      }).observe(tabs, { childList: true });
    } catch (e) {}
    const run = () => {
      if (ran) return;
      const links = [...tabs.querySelectorAll("a")];
      if (!links.length) return;
      ran = true;
      try {
        tabs.style.perspective = "600px";
        const mobile = isMobile();
        const dly = typeof stagger === "function" ? stagger(70) : 0;
        const from = mobile
          ? { y: [40, 0], rotateY: [-70, 0], opacity: [0, 1] }
          : { x: [-60, 0], rotateY: [-70, 0], opacity: [0, 1] };
        animate(links, { ...from, duration: 700, ease: "outBack", delay: dly,
          onComplete: () => clean([...tabs.querySelectorAll("a")]) });
        const cube = document.querySelector(".logo .cube");
        if (cube) animate(cube, { scale: [0, 1], duration: 800, ease: springEase() });
      } catch (e) {}
    };
    // Wait for the intro if one exists, with a 4500ms failsafe.
    try {
      if (document.getElementById("intro")) {
        addEventListener("intro:open", run, { once: true });
        setTimeout(run, 4500);
        return;
      }
    } catch (e) {}
    run();
  } catch (e) {}
}

// 2. Morphing active pill that follows the ".on" link across renders.
function fxPill() {
  try {
    const nav = document.getElementById("nav"), tabs = document.getElementById("tabs");
    if (!nav || !tabs) return;
    const pill = document.createElement("div");
    pill.id = "navpill";
    nav.appendChild(pill);
    nav.classList.add("pill-on");
    let first = true;
    // Offsets of a link relative to #nav (accounts for scroll).
    const pos = (link) => {
      const n = nav.getBoundingClientRect(), r = link.getBoundingClientRect();
      return { x: r.left - n.left, y: r.top - n.top, w: r.width, h: r.height };
    };
    const placeInstant = () => {
      try {
        const on = tabs.querySelector("a.on");
        if (!on) return;
        const p = pos(on);
        if (isMobile()) {
          pill.style.top = ""; pill.style.height = "";
          pill.style.left = "0px"; pill.style.width = p.w + "px";
          pill.style.transform = `translateX(${p.x}px)`;
        } else {
          pill.style.left = ""; pill.style.width = "";
          pill.style.top = "0px"; pill.style.height = p.h + "px";
          pill.style.transform = `translateY(${p.y}px)`;
        }
      } catch (e) {}
    };
    const moveAnimated = () => {
      try {
        const on = tabs.querySelector("a.on");
        if (!on) return;
        const p = pos(on);
        const ease = springEase();
        if (isMobile()) {
          pill.style.top = ""; pill.style.height = "";
          pill.style.left = "0px"; pill.style.width = p.w + "px";
          animate(pill, { x: [null, p.x], width: [null, p.w], scaleX: [1, 1.15, 1], duration: 700, ease });
        } else {
          pill.style.left = ""; pill.style.width = "";
          pill.style.top = "0px"; pill.style.height = p.h + "px";
          animate(pill, { y: [null, p.y], height: [null, p.h], scaleY: [1, 1.15, 1], duration: 700, ease });
        }
      } catch (e) {}
    };
    const onRender = () => {
      if (first) { first = false; placeInstant(); return; }
      moveAnimated();
    };
    new MutationObserver(onRender).observe(tabs, { childList: true });
    placeInstant();
    first = false;
    addEventListener("resize", placeInstant);
  } catch (e) {}
}

// 3. Dock magnification on hover devices + wide screens only.
// Uses offsetTop (ignores transforms) so scaled links cannot feed back.
// Single rAF loop, no animate() calls in this effect.
function fxDock() {
  try {
    const nav = document.getElementById("nav"), tabs = document.getElementById("tabs");
    if (!nav || !tabs) return;
    try {
      if (!matchMedia("(hover: hover)").matches) return;
    } catch (e) { return; }
    let items = []; // { link, rest, cur, target }
    let raf = 0;
    // Skip when touch-only or narrow (bottom tab bar).
    const canRun = () => {
      try {
        if (!matchMedia("(hover: hover)").matches) return false;
      } catch (e) { return false; }
      return window.innerWidth > 760;
    };
    // rest ignores transforms; re-measured on every render and on resize.
    const measure = () => {
      try {
        items = [...tabs.querySelectorAll("a")].map((link) => ({
          link,
          rest: link.offsetTop + link.offsetHeight / 2,
          cur: 0,
          target: 0,
        }));
      } catch (e) { items = []; }
    };
    const frame = () => {
      try {
        if (!canRun()) { raf = 0; return; }
        let settled = true;
        items.forEach((it) => {
          if (!it.link.isConnected) return;
          const rate = it.target === 0 ? 0.12 : 0.18;
          it.cur += (it.target - it.cur) * rate;
          if (Math.abs(it.cur - it.target) >= 0.002) {
            settled = false;
          } else {
            it.cur = it.target;
          }
          it.link.style.transformOrigin = "left center";
          it.link.style.transform = `translateX(${(it.cur * 16).toFixed(2)}px) scale(${(1 + it.cur * 0.14).toFixed(3)})`;
        });
        items = items.filter((it) => it.link.isConnected);
        if (settled) {
          items.forEach((it) => {
            if (it.target === 0) it.link.style.transform = "";
          });
          raf = 0;
          return;
        }
        raf = requestAnimationFrame(frame);
      } catch (e) { raf = 0; }
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    // #tabs itself is never transformed, so this y is stable.
    tabs.addEventListener("pointermove", (e) => {
      try {
        if (!canRun()) return;
        const y = e.clientY - tabs.getBoundingClientRect().top;
        items.forEach((it) => {
          const d = Math.abs(y - it.rest);
          const t = Math.max(0, 1 - d / 110);
          it.target = t * t;
        });
        kick();
      } catch (err) {}
    });
    nav.addEventListener("pointerleave", () => {
      try {
        items.forEach((it) => { it.target = 0; });
        kick();
      } catch (e) {}
    });
    try {
      new MutationObserver(() => measure()).observe(tabs, { childList: true });
    } catch (e) {}
    addEventListener("resize", () => {
      try {
        if (!canRun()) {
          if (raf) { cancelAnimationFrame(raf); raf = 0; }
          items.forEach((it) => { try { it.link.style.transform = ""; } catch (e) {} });
          return;
        }
        measure();
      } catch (e) {}
    });
    measure();
  } catch (e) {}
}

// 4. Click ripple at the pointer position inside the link.
function fxRipple() {
  try {
    const nav = document.getElementById("nav");
    if (!nav) return;
    nav.addEventListener("pointerdown", (e) => {
      try {
        const link = e.target.closest ? e.target.closest("a") : null;
        if (!link || !link.closest("#tabs")) return;
        const r = link.getBoundingClientRect();
        const dot = document.createElement("span");
        const s = 12;
        dot.style.cssText = `position:absolute;width:${s}px;height:${s}px;border-radius:50%;background:#14213d;pointer-events:none;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px;margin:0;`;
        link.appendChild(dot);
        animate(dot, { scale: [0, 6], opacity: [0.35, 0], duration: 600, ease: "outQuart",
          onComplete: () => { try { dot.remove(); } catch (err) {} } });
      } catch (err) {}
    });
  } catch (e) {}
}

// 5. Logo cube spins 4x while hovered, via the Web Animations API.
function fxLogo() {
  try {
    const nav = document.getElementById("nav");
    if (!nav) return;
    const setRate = (rate) => {
      try {
        const cube = nav.querySelector(".logo .cube");
        if (!cube || typeof cube.getAnimations !== "function") return;
        const ctl = cube.getAnimations()[0];
        if (!ctl) return;
        const from = ctl.playbackRate || 1;
        const proxy = { r: from };
        animate(proxy, { r: [from, rate], duration: 300, ease: "outExpo",
          onUpdate: () => { try { ctl.playbackRate = proxy.r; } catch (e) {} } });
      } catch (e) {}
    };
    nav.addEventListener("pointerover", (e) => {
      try { if (e.target.closest && e.target.closest(".logo")) setRate(4); } catch (err) {}
    });
    nav.addEventListener("pointerout", (e) => {
      try { if (e.target.closest && e.target.closest(".logo")) setRate(1); } catch (err) {}
    });
  } catch (e) {}
}

safe(fxPill);
safe(fxEntrance);
safe(fxDock);
safe(fxRipple);
safe(fxLogo);
})();
