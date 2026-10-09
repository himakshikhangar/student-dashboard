/* 3D classroom. app.js never touches THREE directly. */
var ClassScene = (function () {
  var renderer = null;
  var scene = null;
  var camera = null;
  var controls = null;
  var container = null;
  var desksGroup = null;
  var desksById = {};
  var selectCb = null;
  var tooltip = null;
  var raycaster = null;
  var mouse = null;
  var shakeLevel = 0;
  var firstLoad = true;
  var topGeo = null;
  var chairGeo = null;
  var flagGeo = null;
  var labelTextures = {};
  var gradeMats = {};
  var chairMat = null;
  var flagMat = null;

  /* Read one CSS variable for theme-aware colours. */
  function cssVar(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name);
      return v && v.trim() ? v.trim() : fallback;
    } catch (e) {
      return fallback;
    }
  }

  /* Map a grade to a desk top colour. */
  function gradeColor(g) {
    if (g === "A" || g === "B") {
      return cssVar("--green", "#1F7A4D");
    }
    if (g === "C" || g === "D") {
      return cssVar("--yellow", "#F6E27A");
    }
    if (g === "F") {
      return cssVar("--red", "#D1342F");
    }
    return cssVar("--grey", "#9AA5B5");
  }

  /* Shared canvas texture with one letter drawn on it. */
  function labelTexture(letter) {
    if (labelTextures[letter]) {
      return labelTextures[letter];
    }
    var c = document.createElement("canvas");
    c.width = 128;
    c.height = 64;
    var ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = "#111111";
    ctx.font = "bold 40px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, 64, 34);
    var tex = new THREE.CanvasTexture(c);
    labelTextures[letter] = tex;
    return tex;
  }

  /* Material for a desk top, shared per grade. */
  function topMaterial(g) {
    if (gradeMats[g || "none"]) {
      return gradeMats[g || "none"];
    }
    var mat = new THREE.MeshLambertMaterial({ color: gradeColor(g) });
    gradeMats[g || "none"] = mat;
    return mat;
  }

  /* Desk x position from seat column. */
  function seatX(seat, index) {
    var col = seat && typeof seat.col === "number" ? seat.col : index % 6;
    return (col - 2.5) * 2.2;
  }

  /* Desk z position from seat row. */
  function seatZ(seat, index) {
    var row = seat && typeof seat.row === "number" ? seat.row : Math.floor(index / 6);
    return row * 2.2 - 4;
  }

  /* Build renderer, camera and lights. */
  function setupStage() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(container.clientWidth || 600, 420);
    container.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(cssVar("--surface", "#FCFCFD"));
    camera = new THREE.PerspectiveCamera(45, (container.clientWidth || 600) / 420, 0.1, 200);
    camera.position.set(0, 8, 11);
    camera.lookAt(0, 0, -1);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    var dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 7);
    scene.add(dir);
  }

  /* Build floor, shared geometry and tooltip. */
  function setupWorld() {
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshLambertMaterial({ color: cssVar("--bg", "#E8ECF1") }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.6;
    scene.add(floor);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(0, 0, -1);
    desksGroup = new THREE.Group();
    scene.add(desksGroup);
    topGeo = new THREE.BoxGeometry(1.4, 0.12, 0.9);
    chairGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    flagGeo = new THREE.BoxGeometry(0.08, 0.7, 0.08);
    chairMat = new THREE.MeshLambertMaterial({ color: cssVar("--muted", "#5B6B87") });
    flagMat = new THREE.MeshBasicMaterial({ color: cssVar("--red", "#D1342F") });
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    tooltip = document.createElement("div");
    tooltip.className = "scene-tip";
    tooltip.style.display = "none";
    container.style.position = "relative";
    container.appendChild(tooltip);
  }

  /* Build the scene, return false if WebGL is unavailable. */
  function init(containerEl) {
    if (typeof THREE === "undefined") {
      return false;
    }
    try {
      var test = document.createElement("canvas").getContext("webgl");
      if (!test) {
        return false;
      }
    } catch (e) {
      return false;
    }
    container = containerEl;
    container.innerHTML = "";
    setupStage();
    setupWorld();
    renderer.domElement.addEventListener("mousemove", onHover);
    renderer.domElement.addEventListener("click", onClick);
    window.addEventListener("resize", onResize);
    animate();
    return true;
  }

  /* Keep the renderer sized to the container. */
  function onResize() {
    if (!renderer || !container) {
      return;
    }
    var w = container.clientWidth || 600;
    renderer.setSize(w, 420);
    camera.aspect = w / 420;
    camera.updateProjectionMatrix();
  }

  /* Show a tooltip with name and average on hover. */
  function onHover(ev) {
    if (!renderer) {
      return;
    }
    var rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    var hits = raycaster.intersectObjects(desksGroup.children, true);
    var desk = hits.length ? findDeskRoot(hits[0].object) : null;
    if (desk) {
      tooltip.style.display = "block";
      tooltip.style.left = (ev.clientX - rect.left + 12) + "px";
      tooltip.style.top = (ev.clientY - rect.top + 12) + "px";
      var avg = desk.userData.average;
      tooltip.textContent = desk.userData.name + ", avg " + (avg === null || avg === undefined ? "No data" : Math.round(avg));
    } else {
      tooltip.style.display = "none";
    }
  }

  /* Walk up to the desk group root. */
  function findDeskRoot(obj) {
    var o = obj;
    while (o && !o.userData.studentId) {
      o = o.parent;
    }
    return o;
  }

  /* Forward desk clicks to the app callback. */
  function onClick() {
    if (!selectCb || !raycaster) {
      return;
    }
    var hits = raycaster.intersectObjects(desksGroup.children, true);
    if (hits.length) {
      var root = findDeskRoot(hits[0].object);
      if (root) {
        selectCb(root.userData.studentId);
      }
    }
  }

  /* Create or update desks for the given students. */
  function render(studentsWithStatus) {
    if (!scene) {
      return;
    }
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var seen = {};
    gradeMats = {};
    (studentsWithStatus || []).forEach(function (info, i) {
      seen[info.id] = true;
      var desk = desksById[info.id];
      if (!desk) {
        desk = makeDesk(info, i, reduce);
        desksById[info.id] = desk;
        desksGroup.add(desk);
      } else {
        updateDesk(desk, info, i);
      }
    });
    Object.keys(desksById).forEach(function (id) {
      if (!seen[id]) {
        desksGroup.remove(desksById[id]);
        delete desksById[id];
      }
    });
    if (firstLoad) {
      firstLoad = false;
    }
  }

  /* Build one desk group with top, chair, letter and flag. */
  function makeDesk(info, index, reduce) {
    var desk = new THREE.Group();
    desk.userData.studentId = info.id;
    desk.userData.name = info.name;
    desk.userData.average = info.average;
    var top = new THREE.Mesh(topGeo, topMaterial(info.grade));
    top.position.y = 0;
    top.userData.studentId = info.id;
    desk.add(top);
    var label = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.35), new THREE.MeshBasicMaterial({ map: labelTexture(info.grade || "?") }));
    label.rotation.x = -Math.PI / 2;
    label.position.y = 0.07;
    desk.add(label);
    var chair = new THREE.Mesh(chairGeo, chairMat);
    chair.position.set(0, -0.4, 1.1);
    desk.add(chair);
    if (info.needsAttention) {
      var flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(0.7, 0.4, -0.4);
      flag.name = "flag";
      desk.add(flag);
    }
    desk.position.set(seatX(info.seat, index), reduce ? 0 : (firstLoad ? -2 : 3), seatZ(info.seat, index));
    desk.userData.targetY = 0;
    desk.userData.born = Date.now();
    return desk;
  }

  /* Update colour, letter, flag and seat for an existing desk. */
  function updateDesk(desk, info, index) {
    desk.userData.name = info.name;
    desk.userData.average = info.average;
    desk.children[0].material = topMaterial(info.grade);
    desk.position.x = seatX(info.seat, index);
    desk.position.z = seatZ(info.seat, index);
    var hasFlag = !!desk.getObjectByName("flag");
    if (info.needsAttention && !hasFlag) {
      var flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(0.7, 0.4, -0.4);
      flag.name = "flag";
      desk.add(flag);
    }
    if (!info.needsAttention && hasFlag) {
      desk.remove(desk.getObjectByName("flag"));
    }
  }

  /* Register the desk click callback. */
  function onSelect(callback) {
    selectCb = callback;
  }

  /* Set noise meter jitter from 0 to 1. */
  function setShake(level) {
    shakeLevel = Math.min(1, Math.max(0, level));
  }

  /* Render loop with rise, drop and shake motion. */
  function animate() {
    requestAnimationFrame(animate);
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var now = Date.now();
    Object.keys(desksById).forEach(function (id) {
      var desk = desksById[id];
      if (!reduce && Math.abs(desk.position.y - desk.userData.targetY) > 0.01 && now - desk.userData.born < 5000) {
        desk.position.y += (desk.userData.targetY - desk.position.y) * 0.12;
      } else {
        desk.position.y = desk.userData.targetY;
      }
      if (shakeLevel > 0 && !reduce) {
        desk.position.x += (Math.random() - 0.5) * shakeLevel * 0.06;
      }
    });
    controls.update();
    renderer.render(scene, camera);
  }

  return { init: init, render: render, onSelect: onSelect, setShake: setShake };
})();

if (typeof module !== "undefined") {
  module.exports = ClassScene;
}
