(() => {
// New opening animation built with Anime.js v4 only.
function cleanup() {
  try { document.documentElement.classList.remove("intro-lock"); } catch (e) {}
  try { var n = document.getElementById("intro"); if (n) n.remove(); } catch (e) {}
}
// Remember that the intro has played once.
function markSeen() {
  try { sessionStorage.setItem("sd.intro", "1"); } catch (e) {}
}
// Random number in [a, b).
function rand(a, b) {
  return a + Math.random() * (b - a);
}
// Build curtains, cube, word and line inside #intro.
function build(root) {
  root.innerHTML = "";
  root.setAttribute("aria-hidden", "true");
  // Curtain halves.
  var top = document.createElement("div");
  top.style.position = "absolute";
  top.style.top = "0"; top.style.left = "0"; top.style.right = "0";
  top.style.height = "50%";
  top.style.background = "var(--side)";
  var bottom = document.createElement("div");
  bottom.style.position = "absolute";
  bottom.style.bottom = "0"; bottom.style.left = "0"; bottom.style.right = "0";
  bottom.style.height = "50%";
  bottom.style.background = "var(--side)";
  root.appendChild(top);
  root.appendChild(bottom);
  // Centred stage with perspective.
  var stage = document.createElement("div");
  stage.style.position = "relative";
  stage.style.zIndex = "2";
  stage.style.perspective = "700px";
  stage.style.display = "flex";
  stage.style.flexDirection = "column";
  stage.style.alignItems = "center";
  stage.style.justifyContent = "center";
  root.appendChild(stage);
  // 96px 3D cube.
  var cube = document.createElement("div");
  cube.style.width = "96px";
  cube.style.height = "96px";
  cube.style.position = "relative";
  cube.style.transformStyle = "preserve-3d";
  stage.appendChild(cube);
  var colors = ["#3a5bff", "#ff5d5d", "#12b5a6", "#e8960c", "#8a5cf6", "#ec4899"];
  var faces = colors.map(function (c) {
    var f = document.createElement("i");
    f.style.position = "absolute";
    f.style.inset = "0";
    f.style.background = c;
    f.style.border = "2px solid #fff";
    f.style.opacity = "0";
    cube.appendChild(f);
    return f;
  });
  // Text under the cube.
  var textWrap = document.createElement("div");
  textWrap.style.display = "flex";
  textWrap.style.flexDirection = "column";
  textWrap.style.alignItems = "center";
  textWrap.style.marginTop = "24px";
  stage.appendChild(textWrap);
  var word = document.createElement("div");
  word.style.fontFamily = '"Bricolage Grotesque",system-ui,sans-serif';
  word.style.fontWeight = "800";
  word.style.fontSize = "40px";
  word.style.lineHeight = "1.1";
  word.style.color = "#fff";
  word.style.display = "flex";
  textWrap.appendChild(word);
  var letters = [];
  // Prefer the official splitter, fall back to hand-made masks.
  var split = null;
  try { split = window.anime && window.anime.splitText; } catch (e) {}
  if (typeof split === "function") {
    try {
      word.textContent = "Campus Desk";
      var res = split(word, { chars: true });
      var chars = (res && res.chars) || word.querySelectorAll("span");
      Array.prototype.forEach.call(chars, function (ch) {
        var mask = document.createElement("span");
        mask.style.display = "inline-block";
        mask.style.overflow = "hidden";
        ch.style.display = "inline-block";
        ch.parentNode.insertBefore(mask, ch);
        mask.appendChild(ch);
        letters.push(ch);
      });
    } catch (e) { letters = []; }
  }
  if (!letters.length) {
    word.textContent = "";
    "Campus Desk".split("").forEach(function (ch) {
      var mask = document.createElement("span");
      mask.style.display = "inline-block";
      mask.style.overflow = "hidden";
      var inner = document.createElement("span");
      inner.style.display = "inline-block";
      inner.textContent = ch === " " ? " " : ch;
      mask.appendChild(inner);
      word.appendChild(mask);
      letters.push(inner);
    });
  }
  letters.forEach(function (el) { el.style.transform = "translateY(110%)"; });
  // Yellow underline, grows from 0 to 160px.
  var line = document.createElement("div");
  line.style.height = "2px";
  line.style.width = "0px";
  line.style.marginTop = "12px";
  line.style.background = "var(--yel)";
  textWrap.appendChild(line);
  return { top: top, bottom: bottom, cube: cube, faces: faces, textWrap: textWrap, letters: letters, line: line };
}
// Play the intro; force=true rebuilds even when already seen.
function play(force) {
  try {
    if (!window.anime || !window.anime.animate || !window.anime.createTimeline) { cleanup(); return; }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches && !force) { cleanup(); markSeen(); return; }
    var root = document.getElementById("intro");
    if (!root) {
      root = document.createElement("div");
      root.id = "intro";
      root.setAttribute("aria-hidden", "true");
      document.body.insertBefore(root, document.body.firstChild);
    }
    document.documentElement.classList.add("intro-lock");
    var parts = build(root);
    var animate = window.anime.animate;
    var createTimeline = window.anime.createTimeline;
    var stagger = window.anime.stagger;
    var finals = [
      { rx: 0, ry: 0 }, { rx: 0, ry: 180 }, { rx: 0, ry: 90 },
      { rx: 0, ry: -90 }, { rx: 90, ry: 0 }, { rx: -90, ry: 0 }
    ];
    var done = false;
    var tl = null;
    // Reveal the dashboard behind the opening curtains.
    function open() {
      try { document.documentElement.classList.remove("intro-lock"); } catch (e) {}
      try { window.dispatchEvent(new Event("intro:open")); } catch (e) {}
    }
    function finish() {
      if (done) return;
      done = true;
      try { open(); } catch (e) {}
      try { markSeen(); } catch (e) {}
      try { cleanup(); } catch (e) {}
    }
    tl = createTimeline({ onComplete: finish });
    // 0.0s-1.0s: faces fly in from random positions and assemble.
    tl.add(parts.faces, {
      x: [function () { return rand(-500, 500); }, 0],
      y: [function () { return rand(-500, 500); }, 0],
      z: [function () { return rand(-500, 500); }, 48],
      rotateX: [function () { return rand(-360, 360); }, function (el, i) { return finals[i % 6].rx; }],
      rotateY: [function () { return rand(-360, 360); }, function (el, i) { return finals[i % 6].ry; }],
      opacity: [0, 0.92],
      duration: 1000,
      ease: "outExpo",
      delay: stagger(70)
    }, 0);
    // 0.8s-1.6s: whole cube spins.
    tl.add(parts.cube, {
      rotateX: [0, 360],
      rotateY: [0, 540],
      duration: 800,
      ease: "inOutQuart"
    }, 800);
    // 0.9s-1.6s: letters rise, yellow line grows.
    tl.add(parts.letters, {
      y: ["110%", "0%"],
      duration: 700,
      ease: "outExpo",
      delay: stagger(35)
    }, 900);
    tl.add(parts.line, {
      width: ["0px", "160px"],
      duration: 700,
      ease: "outExpo"
    }, 900);
    // 1.7s-2.3s: cube flies to the sidebar logo, text fades.
    var dx = 0, dy = 0, sc = 0, hasTarget = false;
    try {
      var target = document.querySelector(".logo .cube");
      var tb = target && target.getBoundingClientRect();
      var cb = parts.cube.getBoundingClientRect();
      if (target && tb && (tb.width > 0 || tb.height > 0)) {
        dx = (tb.left + tb.width / 2) - (cb.left + cb.width / 2);
        dy = (tb.top + tb.height / 2) - (cb.top + cb.height / 2);
        sc = tb.width > 0 ? Math.max(0.05, tb.width / 96) : 0;
        hasTarget = true;
      }
    } catch (e) { hasTarget = false; }
    if (hasTarget) {
      tl.add(parts.cube, { x: [0, dx], y: [0, dy], scale: [1, sc], duration: 600, ease: "inOutQuart" }, 1700);
    } else {
      tl.add(parts.cube, { scale: [1, 0], opacity: [1, 0], duration: 600, ease: "inOutQuart" }, 1700);
    }
    tl.add(parts.textWrap, { opacity: [1, 0], duration: 600, ease: "outExpo" }, 1700);
    // 2.2s-3.0s: curtains open.
    tl.add(parts.top, { y: [0, "-100%"], duration: 800, ease: "inOutExpo", onBegin: open }, 2200);
    tl.add(parts.bottom, { y: [0, "100%"], duration: 800, ease: "inOutExpo" }, 2200);
    // Skip on click or any key.
    function skip() {
      try { if (tl && typeof tl.complete === "function") tl.complete(); } catch (e) {}
      try { if (tl && typeof tl.seek === "function") tl.seek(3000); } catch (e) {}
      try { finish(); } catch (e) {}
    }
    root.addEventListener("click", skip);
    window.addEventListener("keydown", skip, { once: true });
  } catch (e) {
    try { cleanup(); } catch (err) {}
  }
}
// Autoplay only when the no-flash script locked the page.
try {
  if (document.documentElement.classList.contains("intro-lock")) {
    if (!window.anime) {
      window.addEventListener("load", function () {
        try {
          if (document.documentElement.classList.contains("intro-lock")) play(false);
        } catch (e) { cleanup(); }
      });
    } else {
      play(false);
    }
  }
} catch (e) { cleanup(); }
// Replay when the sidebar logo is clicked.
try {
  document.addEventListener("click", function (e) {
    try {
      if (e.target && e.target.closest && e.target.closest(".logo")) play(true);
    } catch (err) {}
  });
} catch (e) {}
})();
