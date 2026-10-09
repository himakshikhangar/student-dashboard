/* Default subjects for a new store. */
var DEFAULT_SUBJECTS = ["Maths", "Science", "English", "Hindi", "Social science"];

/* Default seating constraints referencing seed ids. */
var DEFAULT_CONSTRAINTS = { keepApart: [["s_b2", "s_d4"]], frontRow: ["s_c3"] };

/* Full store kept in memory and persisted. */
var store = null;

/* UI state for search, filter, sort, selection and time travel. */
var ui = { search: "", filterClass: "", filterGrade: "", onlyAttention: false, sortBy: "name", selectedId: null, view: "classroom", timeCutoff: null, lastTeams: [] };

/* True once the 3D scene has been built. */
var sceneReady = false;

/* Id of the student being edited, null when adding. */
var editingId = null;

/* Last deleted student for Undo. */
var lastDeleted = null;

/* Timer id for the Undo toast. */
var toastTimer = null;

/* Deep copy of the seed students. */
function seedCopy() {
  return JSON.parse(JSON.stringify(window.SEED));
}

/* Fresh store built from the seed. */
function freshStore() {
  return { version: 1, subjects: DEFAULT_SUBJECTS.slice(), constraints: JSON.parse(JSON.stringify(DEFAULT_CONSTRAINTS)), students: seedCopy() };
}

/* True when a parsed file looks like a classdeck store. */
function isValidStore(data) {
  if (!data || data.version !== 1) {
    return false;
  }
  if (!Array.isArray(data.students) || !Array.isArray(data.subjects)) {
    return false;
  }
  return data.students.every(function (s) {
    return s && typeof s.id === "string" && typeof s.name === "string" && typeof s.rollNo === "string";
  });
}

/* Load the store from localStorage or fall back to seed. */
function loadStore() {
  try {
    var raw = localStorage.getItem("classdeck.v1");
    if (raw) {
      var parsed = JSON.parse(raw);
      if (isValidStore(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    return freshStore();
  }
  return freshStore();
}

/* Save the store to localStorage. */
function saveStore() {
  try {
    localStorage.setItem("classdeck.v1", JSON.stringify(store));
  } catch (e) {
    return;
  }
}

/* Local date key YYYY-MM-DD for today. */
function todayKey() {
  var d = new Date();
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

/* Tests dated on or before the time cutoff, or all tests. */
function visibleTests(student) {
  if (!ui.timeCutoff) {
    return student.tests || [];
  }
  return (student.tests || []).filter(function (t) {
    return t.date <= ui.timeCutoff;
  });
}

/* Attendance marked on or before the time cutoff. */
function visibleAttendance(student) {
  if (!ui.timeCutoff) {
    return student.attendance || {};
  }
  var out = {};
  Object.keys(student.attendance || {}).forEach(function (d) {
    if (d <= ui.timeCutoff) {
      out[d] = student.attendance[d];
    }
  });
  return out;
}

/* True when time travel is active and edits are blocked. */
function isReadOnly() {
  return !!ui.timeCutoff && ui.timeCutoff < todayKey();
}

/* Computed stats for one student under the current cutoff. */
function studentView(s) {
  var tests = visibleTests(s);
  var att = visibleAttendance(s);
  var avg = average(tests);
  var proxy = { attendance: att, tests: tests };
  return { avg: avg, grade: grade(avg), att: attendancePercent(att), streak: streak(att), attention: needsAttention(proxy), badges: badges(proxy), trend: trend(tests), tests: tests, attMap: att };
}

/* Find a student by id. */
function findStudent(id) {
  var found = null;
  store.students.forEach(function (s) {
    if (s.id === id) {
      found = s;
    }
  });
  return found;
}

/* Format an average or attendance value for display. */
function fmtVal(v) {
  if (v === null || v === undefined) {
    return "No data";
  }
  return String(Math.round(v));
}

/* Animate a number from 0 to target over 500 ms. */
function countUp(el, target, suffix) {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !(target > 0)) {
    el.textContent = String(target) + (suffix || "");
    return;
  }
  var start = null;
  function frame(now) {
    if (!start) {
      start = now;
    }
    var p = Math.min(1, (now - start) / 500);
    el.textContent = String(Math.round(target * p)) + (suffix || "");
    if (p < 1) {
      requestAnimationFrame(frame);
    }
  }
  requestAnimationFrame(frame);
}

/* Render the four stats in the stats row. */
function renderStats() {
  var avgs = [];
  var present = 0;
  var need = 0;
  var today = todayKey();
  store.students.forEach(function (s) {
    var v = studentView(s);
    if (v.avg !== null) {
      avgs.push(v.avg);
    }
    if ((s.attendance || {})[today]) {
      present += 1;
    }
    if (v.attention) {
      need += 1;
    }
  });
  countUp(document.getElementById("stat-students"), store.students.length, "");
  var avgEl = document.getElementById("stat-average");
  if (avgs.length === 0) {
    avgEl.textContent = "No data";
  } else {
    var mean = avgs.reduce(function (a, b) { return a + b; }, 0) / avgs.length;
    countUp(avgEl, Math.round(mean), "");
  }
  countUp(document.getElementById("stat-present"), present, "");
  countUp(document.getElementById("stat-attention"), need, "");
}

/* Students after search, filter and sort. */
function filteredStudents() {
  var q = ui.search.trim().toLowerCase();
  var list = store.students.filter(function (s) {
    if (q && s.name.toLowerCase().indexOf(q) === -1 && String(s.rollNo).toLowerCase().indexOf(q) === -1) {
      return false;
    }
    if (ui.filterClass && s.className !== ui.filterClass) {
      return false;
    }
    var v = studentView(s);
    if (ui.filterGrade === "none" && v.grade !== null) {
      return false;
    }
    if (ui.filterGrade && ui.filterGrade !== "none" && v.grade !== ui.filterGrade) {
      return false;
    }
    if (ui.onlyAttention && !v.attention) {
      return false;
    }
    return true;
  });
  list.sort(function (a, b) {
    if (ui.sortBy === "rollNo") {
      return String(a.rollNo).localeCompare(String(b.rollNo), undefined, { numeric: true });
    }
    if (ui.sortBy === "average") {
      return (studentView(b).avg || -1) - (studentView(a).avg || -1);
    }
    if (ui.sortBy === "attendance") {
      return (studentView(b).att || -1) - (studentView(a).att || -1);
    }
    return a.name.localeCompare(b.name);
  });
  return list;
}

/* Render one card per filtered student. */
function renderStudents() {
  var box = document.getElementById("students");
  box.textContent = "";
  filteredStudents().forEach(function (s) {
    box.appendChild(studentCard(s));
  });
  document.getElementById("empty").hidden = store.students.length !== 0;
}

/* Build a card element for one student. */
function studentCard(s) {
  var v = studentView(s);
  var card = document.createElement("article");
  card.className = "card" + (v.attention ? " needs" : "");
  card.tabIndex = 0;
  var title = document.createElement("h2");
  title.textContent = s.name;
  var roll = document.createElement("p");
  roll.textContent = "Roll number: " + s.rollNo;
  var cls = document.createElement("p");
  cls.textContent = "Class: " + s.className + "  Average: " + fmtVal(v.avg) + "  Grade: " + (v.grade || "No grade");
  cls.classList.add("muted", "num");
  var att = document.createElement("p");
  att.textContent = "Attendance: " + fmtVal(v.att) + (v.att === null ? "" : "%") + "  Streak: " + v.streak;
  att.classList.add("num");
  card.appendChild(title);
  card.appendChild(roll);
  card.appendChild(cls);
  card.appendChild(att);
  if (v.badges.length > 0) {
    var b = document.createElement("p");
    b.className = "badges";
    b.textContent = "Badges: " + v.badges.join(", ");
    card.appendChild(b);
  }
  var row = document.createElement("div");
  row.className = "card-actions";
  var toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "btn";
  toggle.textContent = ((s.attendance || {})[todayKey()] ? "Mark absent today" : "Mark present today");
  toggle.addEventListener("click", function (ev) {
    ev.stopPropagation();
    toggleToday(s.id);
  });
  row.appendChild(toggle);
  card.appendChild(row);
  enableCardMotion(card, s);
  card.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      openPanel(s.id);
    }
  });
  return card;
}

/* Toggle attendance for today for one student. */
function toggleToday(id) {
  if (isReadOnly()) {
    return;
  }
  var s = findStudent(id);
  if (!s) {
    return;
  }
  s.attendance = s.attendance || {};
  var today = todayKey();
  s.attendance[today] = !s.attendance[today];
  saveStore();
  renderAll();
}

/* Mark every student present today. */
function markAllPresent() {
  if (isReadOnly()) {
    return;
  }
  var today = todayKey();
  store.students.forEach(function (s) {
    s.attendance = s.attendance || {};
    s.attendance[today] = true;
  });
  saveStore();
  renderAll();
}

/* Render the needs attention list. */
function renderAttention() {
  var list = document.getElementById("attention-list");
  list.textContent = "";
  store.students.forEach(function (s) {
    var v = studentView(s);
    if (!v.attention) {
      return;
    }
    var li = document.createElement("li");
    li.textContent = s.name + " (roll " + s.rollNo + "): ";
    var note = document.createElement("span");
    note.className = "red-pen";
    note.textContent = attentionReason(s, v);
    li.appendChild(note);
    list.appendChild(li);
  });
  if (!list.children.length) {
    var none = document.createElement("li");
    none.textContent = "Nobody needs attention right now.";
    list.appendChild(none);
  }
}

/* Short reason why a student needs attention. */
function attentionReason(s, v) {
  if (v.att !== null && v.att < 75) {
    return "attendance " + Math.round(v.att) + "%";
  }
  if (v.avg !== null && v.avg < 40) {
    return "average " + Math.round(v.avg);
  }
  return "recent drop";
}

/* Render the grade distribution bars in plain SVG. */
function renderGradeChart() {
  var svg = document.getElementById("chart-grades");
  svg.textContent = "";
  var counts = { A: 0, B: 0, C: 0, D: 0, F: 0, none: 0 };
  store.students.forEach(function (s) {
    var g = studentView(s).grade;
    if (g) {
      counts[g] += 1;
    } else {
      counts.none += 1;
    }
  });
  var keys = ["A", "B", "C", "D", "F"];
  var max = 1;
  keys.forEach(function (k) {
    max = Math.max(max, counts[k]);
  });
  keys.forEach(function (k, i) {
    var h = Math.round((counts[k] / max) * 90);
    var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(20 + i * 70));
    rect.setAttribute("y", String(110 - h));
    rect.setAttribute("width", "40");
    rect.setAttribute("height", String(h));
    rect.setAttribute("fill", "var(--blue)");
    svg.appendChild(rect);
    var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", String(40 + i * 70));
    label.setAttribute("y", "128");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("fill", "var(--ink)");
    label.textContent = k + " " + counts[k];
    svg.appendChild(label);
  });
}

/* Render the selected student line chart of test percents. */
function renderPanelChart(tests) {
  var svg = document.getElementById("panel-chart");
  svg.textContent = "";
  if (tests.length === 0) {
    return;
  }
  var pts = tests.map(function (t, i) {
    var x = 10 + (i * 260) / Math.max(1, tests.length - 1);
    var y = 110 - (percent(t.score, t.max) / 100) * 100;
    return x + "," + y;
  });
  var line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  line.setAttribute("points", pts.join(" "));
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "var(--blue)");
  line.setAttribute("stroke-width", "2");
  svg.appendChild(line);
}

/* Open the side panel for one student. */
function openPanel(id) {
  ui.selectedId = id;
  var s = findStudent(id);
  if (!s) {
    return;
  }
  var v = studentView(s);
  document.getElementById("panel").hidden = false;
  document.getElementById("panel-name").textContent = s.name;
  document.getElementById("panel-meta").textContent = "Roll " + s.rollNo + ", class " + s.className;
  document.getElementById("panel-stats").textContent = "Average " + fmtVal(v.avg) + ", grade " + (v.grade || "No grade") + ", attendance " + fmtVal(v.att) + ", streak " + v.streak;
  document.getElementById("panel-badges").textContent = v.badges.length ? "Badges: " + v.badges.join(", ") : "Badges: none";
  document.getElementById("panel-trend").textContent = v.trend.status ? "Trend: " + v.trend.status : "Trend prediction: " + Math.round(v.trend.prediction);
  document.getElementById("notes-input").value = s.notes || "";
  renderPanelChart(v.tests);
  fillTestSubjects();
}

/* Close the side panel. */
function closePanel() {
  ui.selectedId = null;
  document.getElementById("panel").hidden = true;
}

/* Fill the subject select for the test form. */
function fillTestSubjects() {
  var sel = document.getElementById("test-subject");
  sel.textContent = "";
  store.subjects.forEach(function (name) {
    var opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
}

/* Add a test to the selected student after validation. */
function submitTest(ev) {
  ev.preventDefault();
  if (isReadOnly()) {
    return;
  }
  var s = findStudent(ui.selectedId);
  if (!s) {
    return;
  }
  var score = Number(document.getElementById("test-score").value);
  var max = Number(document.getElementById("test-max").value);
  var err = validateScore(score, max);
  if (err) {
    showTestError(err);
    return;
  }
  var date = document.getElementById("test-date").value || todayKey();
  s.tests.push({ subject: document.getElementById("test-subject").value, name: document.getElementById("test-name").value || "Test", date: date, score: score, max: max });
  saveStore();
  renderAll();
  openPanel(s.id);
}

/* Show a test form error. */
function showTestError(msg) {
  var el = document.getElementById("test-error");
  el.textContent = msg;
  el.hidden = false;
}

/* Save private notes for the selected student. */
function saveNotes() {
  var s = findStudent(ui.selectedId);
  if (!s || isReadOnly()) {
    return;
  }
  s.notes = document.getElementById("notes-input").value.slice(0, 500);
  saveStore();
}

/* Export the CSV with rollNo,name,className,average,attendancePercent,grade,needsAttention. */
function exportCSV() {
  var rows = ["rollNo,name,className,average,attendancePercent,grade,needsAttention"];
  store.students.forEach(function (s) {
    var v = studentView(s);
    rows.push([s.rollNo, csvCell(s.name), csvCell(s.className), v.avg === null ? "" : Math.round(v.avg), v.att === null ? "" : Math.round(v.att), v.grade || "", v.attention].join(","));
  });
  var blob = new Blob([rows.join("\n")], { type: "text/csv" });
  var link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "classdeck.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* Quote one CSV cell. */
function csvCell(v) {
  return '"' + String(v).replace(/"/g, '""') + '"';
}

/* Build and print one report card page per filtered student. */
function printReports() {
  var box = document.getElementById("report");
  box.textContent = "";
  filteredStudents().forEach(function (s) {
    var v = studentView(s);
    var page = document.createElement("div");
    page.className = "report-page";
    var h = document.createElement("h2");
    h.textContent = s.name + " — roll " + s.rollNo + ", class " + s.className;
    var p = document.createElement("p");
    p.textContent = "Average " + fmtVal(v.avg) + ", grade " + (v.grade || "No grade") + ", attendance " + fmtVal(v.att);
    var table = document.createElement("table");
    table.className = "report-table";
    var head = document.createElement("tr");
    ["Subject", "Test", "Date", "Score"].forEach(function (t, i) {
      var th = document.createElement("th");
      th.textContent = t;
      if (i === 3) {
        th.className = "num";
      }
      head.appendChild(th);
    });
    table.appendChild(head);
    v.tests.forEach(function (t) {
      var tr = document.createElement("tr");
      [t.subject, t.name, t.date, t.score + "/" + t.max].forEach(function (val, i) {
        var td = document.createElement("td");
        td.textContent = val;
        if (i === 3) {
          td.className = "num";
        }
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });
    page.appendChild(h);
    page.appendChild(p);
    page.appendChild(table);
    box.appendChild(page);
  });
  window.print();
}

/* Show or hide the student form. */
function setFormOpen(open) {
  document.getElementById("student-form").hidden = !open;
  document.getElementById("form-error").hidden = true;
}

/* Fill the form for adding or editing. */
function openForm(student) {
  editingId = student ? student.id : null;
  document.getElementById("form-title").textContent = student ? "Edit student" : "Add student";
  document.getElementById("name-input").value = student ? student.name : "";
  document.getElementById("roll-input").value = student ? student.rollNo : "";
  document.getElementById("class-input").value = student ? student.className : "";
  setFormOpen(true);
  document.getElementById("name-input").focus();
}

/* Show a validation message in the form. */
function showFormError(msg) {
  var el = document.getElementById("form-error");
  el.textContent = msg;
  el.hidden = false;
}

/* Save a new student or an edit after validation. */
function submitForm(ev) {
  ev.preventDefault();
  if (isReadOnly()) {
    showFormError("Time travel is active. Go back to today to edit.");
    return;
  }
  var name = document.getElementById("name-input").value;
  var rollNo = document.getElementById("roll-input").value;
  var className = document.getElementById("class-input").value.trim();
  var nameErr = validateName(name);
  if (nameErr) {
    showFormError(nameErr);
    return;
  }
  var rollErr = validateRoll(rollNo, store.students, editingId);
  if (rollErr) {
    showFormError(rollErr);
    return;
  }
  if (!className) {
    showFormError("Enter a class.");
    return;
  }
  if (editingId) {
    store.students.forEach(function (s) {
      if (s.id === editingId) {
        s.name = name.trim();
        s.rollNo = rollNo.trim();
        s.className = className;
      }
    });
  } else {
    var used = {};
    store.students.forEach(function (s) {
      used[s.seat.row + ":" + s.seat.col] = true;
    });
    store.students.push({ id: "s_" + Date.now(), name: name.trim(), rollNo: rollNo.trim(), className: className, notes: "", seat: freeSeat(used), attendance: {}, tests: [] });
  }
  editingId = null;
  ev.target.reset();
  setFormOpen(false);
  saveStore();
  renderAll();
}

/* Find the first free seat in 6 columns. */
function freeSeat(used) {
  var row = 0;
  var col = 0;
  while (used[row + ":" + col]) {
    col += 1;
    if (col > 5) {
      col = 0;
      row += 1;
    }
  }
  return { row: row, col: col };
}

/* Delete a student and show Undo for 8 seconds. */
function deleteStudent(id) {
  if (isReadOnly()) {
    return;
  }
  var index = -1;
  store.students.forEach(function (s, i) {
    if (s.id === id) {
      index = i;
    }
  });
  if (index === -1) {
    return;
  }
  lastDeleted = { student: store.students[index], index: index };
  store.students.splice(index, 1);
  closePanel();
  saveStore();
  renderAll();
  showToast();
}

/* Show the Undo toast for 8 seconds. */
function showToast() {
  var toast = document.getElementById("toast");
  toast.hidden = false;
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(hideToast, 8000);
}

/* Hide the Undo toast and forget the deletion. */
function hideToast() {
  document.getElementById("toast").hidden = true;
  lastDeleted = null;
  toastTimer = null;
}

/* Restore the last deleted student. */
function undoDelete() {
  if (!lastDeleted) {
    return;
  }
  store.students.splice(Math.min(lastDeleted.index, store.students.length), 0, lastDeleted.student);
  saveStore();
  renderAll();
  hideToast();
}

/* Download the store as JSON. */
function downloadBackup() {
  var blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
  var link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "classdeck-backup.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* Show a restore error without changing data. */
function showRestoreError(msg) {
  var el = document.getElementById("restore-error");
  el.textContent = msg;
  el.hidden = false;
}

/* Restore from an uploaded file after checking version and shape. */
function restoreFile(file) {
  var reader = new FileReader();
  reader.onload = function () {
    var parsed = null;
    try {
      parsed = JSON.parse(reader.result);
    } catch (e) {
      showRestoreError("That file is not valid JSON. Nothing was changed.");
      return;
    }
    if (!isValidStore(parsed)) {
      showRestoreError("That backup is the wrong shape or version. Nothing was changed.");
      return;
    }
    store = parsed;
    saveStore();
    renderAll();
    document.getElementById("restore-error").hidden = true;
  };
  reader.readAsText(file);
}

/* Fill the class filter with the classes in the store. */
function fillClassFilter() {
  var sel = document.getElementById("filter-class");
  var keep = sel.value;
  sel.textContent = "";
  var first = document.createElement("option");
  first.value = "";
  first.textContent = "All classes";
  sel.appendChild(first);
  var seen = {};
  store.students.forEach(function (s) {
    if (!seen[s.className]) {
      seen[s.className] = true;
      var opt = document.createElement("option");
      opt.value = s.className;
      opt.textContent = s.className;
      sel.appendChild(opt);
    }
  });
  sel.value = keep;
}

/* Switch between classroom, cards and constellation views. */
function setView(name) {
  ui.view = name;
  document.getElementById("view-3d").hidden = name !== "classroom";
  document.getElementById("view-cards").hidden = name !== "cards";
  document.getElementById("view-stars").hidden = name !== "stars";
  document.getElementById("tab-classroom").setAttribute("aria-selected", String(name === "classroom"));
  document.getElementById("tab-cards").setAttribute("aria-selected", String(name === "cards"));
  document.getElementById("tab-stars").setAttribute("aria-selected", String(name === "stars"));
  if (name === "classroom") {
    initSceneFallback();
  }
}

/* Try the 3D scene, fall back to cards with a reason. */
function initSceneFallback() {
  var note = document.getElementById("scene-note");
  if (sceneReady) {
    note.hidden = true;
    renderScene();
    return;
  }
  var ok = false;
  try {
    if (typeof ClassScene !== "undefined") {
      ok = ClassScene.init(document.getElementById("scene")) !== false;
    }
  } catch (e) {
    ok = false;
  }
  if (!ok) {
    note.hidden = false;
    note.textContent = "3D is unavailable (WebGL missing). Showing cards instead.";
    setView("cards");
    return;
  }
  sceneReady = true;
  note.hidden = true;
  try {
    ClassScene.onSelect(openPanel);
  } catch (e) {
    return;
  }
  renderScene();
}

/* Send students with status to the 3D scene. */
function renderScene() {
  if (!sceneReady || typeof ClassScene === "undefined") {
    return;
  }
  try {
    ClassScene.render(store.students.map(function (s) {
      var v = studentView(s);
      return { id: s.id, name: s.name, average: v.avg, grade: v.grade, needsAttention: v.attention, seat: s.seat };
    }));
  } catch (e) {
    return;
  }
}

/* Add tilt on hover and flip on click to one card. */
function enableCardMotion(card, s) {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover)").matches;
  if (canHover && !reduce) {
    card.addEventListener("mousemove", function (ev) {
      var rect = card.getBoundingClientRect();
      var dx = (ev.clientX - rect.left) / rect.width - 0.5;
      var dy = (ev.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = "rotateX(" + (-dy * 6) + "deg) rotateY(" + (dx * 6) + "deg)";
    });
    card.addEventListener("mouseleave", function () {
      card.style.transform = "";
    });
  }
  card.addEventListener("click", function () {
    if (reduce) {
      openPanel(s.id);
      return;
    }
    card.classList.add("flip");
    setTimeout(function () {
      card.classList.remove("flip");
    }, 300);
    openPanel(s.id);
  });
}

/* Read the theme currently set on <html>. */
function currentTheme() {
  return document.documentElement.getAttribute("data-theme");
}

/* Switch Paper and Chalkboard and remember the choice. */
function toggleTheme() {
  var next = currentTheme() === "paper" ? "chalkboard" : "paper";
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem("classdeck.theme", next);
  } catch (e) {
    return;
  }
}

/* Render stats, cards, attention and charts together. */
function renderAll() {
  fillClassFilter();
  renderStats();
  renderStudents();
  renderAttention();
  renderGradeChart();
  renderImproved();
  renderMessage();
  if (ui.view === "classroom") {
    renderScene();
  }
  if (ui.view === "stars") {
    try {
      renderStars();
    } catch (e) {
      return;
    }
  }
}

/* Ids picked this cold-call round. */
var spinPicked = [];

/* Noise meter audio nodes. */
var noiseStream = null;
var noiseAnalyser = null;
var noiseOn = false;

/* Weekly time steps from the earliest date to today. */
var timeSteps = [];

/* Students not yet picked this round. */
function spinRemaining() {
  return store.students.filter(function (s) {
    return spinPicked.indexOf(s.id) === -1;
  });
}

/* Pick a random unpicked student, reset the round when done. */
function spinPick() {
  var left = spinRemaining();
  if (left.length === 0) {
    spinPicked = [];
    left = store.students.slice();
    document.getElementById("spin-result").textContent = "Round complete. Starting a new round.";
  }
  if (left.length === 0) {
    return;
  }
  var pick = left[Math.floor(Math.random() * left.length)];
  spinPicked.push(pick.id);
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var wheel = document.getElementById("wheel");
  document.getElementById("wheel-label").textContent = pick.name;
  if (!reduce) {
    wheel.classList.remove("spin");
    void wheel.offsetWidth;
    wheel.classList.add("spin");
  }
  document.getElementById("spin-result").textContent = pick.name + " (roll " + pick.rollNo + "). " + spinRemaining().length + " left.";
}

/* Clear the cold-call round. */
function resetSpin() {
  spinPicked = [];
  document.getElementById("wheel-label").textContent = "Spin";
  document.getElementById("spin-result").textContent = "Nobody picked yet this round.";
}

/* Make balanced teams with snake dealing by average. */
function makeTeams() {
  var n = Math.max(2, Math.min(9, Number(document.getElementById("team-count").value) || 3));
  var sorted = store.students.slice().sort(function (a, b) {
    var aa = studentView(a).avg;
    var bb = studentView(b).avg;
    if (aa === null && bb === null) {
      return 0;
    }
    if (aa === null) {
      return 1;
    }
    if (bb === null) {
      return -1;
    }
    return bb - aa;
  });
  var teams = [];
  for (var i = 0; i < n; i++) {
    teams.push([]);
  }
  sorted.forEach(function (s, idx) {
    var round = Math.floor(idx / n);
    var pos = idx % n;
    var team = round % 2 === 0 ? pos : n - 1 - pos;
    teams[team].push(s);
  });
  ui.lastTeams = teams.map(function (t) {
    return t.map(function (s) { return s.id; });
  });
  renderTeams(teams);
  if (ui.view === "stars") {
    renderStars();
  }
}

/* Render team lists. */
function renderTeams(teams) {
  var box = document.getElementById("teams-out");
  box.textContent = "";
  teams.forEach(function (t, i) {
    var p = document.createElement("p");
    p.textContent = "Team " + (i + 1) + ": " + t.map(function (s) { return s.name; }).join(", ");
    box.appendChild(p);
  });
}

/* True when two seats sit next to each other. */
function seatsAdjacent(a, b) {
  return a.row === b.row && Math.abs(a.col - b.col) <= 1;
}

/* Check keepApart and frontRow for a seat map. */
function seatsOk(map) {
  var cons = store.constraints || { keepApart: [], frontRow: [] };
  var badKeep = null;
  (cons.keepApart || []).forEach(function (pair) {
    if (map[pair[0]] && map[pair[1]] && seatsAdjacent(map[pair[0]], map[pair[1]])) {
      badKeep = pair;
    }
  });
  if (badKeep) {
    return { ok: false, msg: "Could not keep " + nameOf(badKeep[0]) + " and " + nameOf(badKeep[1]) + " apart." };
  }
  var badFront = (cons.frontRow || []).filter(function (id) {
    return map[id] && map[id].row !== 0;
  });
  if (badFront.length > 0) {
    return { ok: false, msg: "Could not place " + nameOf(badFront[0]) + " in the front row." };
  }
  return { ok: true, msg: "" };
}

/* Name for an id, or the id when missing. */
function nameOf(id) {
  var s = findStudent(id);
  return s ? s.name : id;
}

/* Shuffle seats, respecting constraints. */
function shuffleSeats() {
  if (isReadOnly()) {
    return;
  }
  var seats = store.students.map(function (s) {
    return { row: s.seat.row, col: s.seat.col };
  });
  for (var attempt = 0; attempt < 200; attempt++) {
    var shuffled = seats.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = tmp;
    }
    var map = {};
    store.students.forEach(function (s, k) {
      map[s.id] = shuffled[k] || s.seat;
    });
    var res = seatsOk(map);
    if (res.ok) {
      store.students.forEach(function (s) {
        s.seat = map[s.id];
      });
      saveStore();
      renderAll();
      document.getElementById("seat-msg").textContent = "Seats shuffled.";
      return;
    }
    if (attempt === 199) {
      document.getElementById("seat-msg").textContent = res.msg;
    }
  }
}

/* Start or stop the noise meter. */
function toggleNoise() {
  if (noiseOn) {
    stopNoise();
    return;
  }
  var msg = document.getElementById("noise-msg");
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    msg.textContent = "Microphone needs Live Server. Open the page through Live Server.";
    return;
  }
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
    noiseStream = stream;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    var ctx = new Ctx();
    var src = ctx.createMediaStreamSource(stream);
    noiseAnalyser = ctx.createAnalyser();
    noiseAnalyser.fftSize = 512;
    src.connect(noiseAnalyser);
    noiseOn = true;
    document.getElementById("noise-btn").textContent = "Stop noise meter";
    msg.textContent = "Listening. Desks jitter with loudness.";
    noiseTick();
  }).catch(function () {
    msg.textContent = "Microphone blocked. Allow it in the browser's site settings.";
  });
}

/* Stop the noise meter and still the desks. */
function stopNoise() {
  noiseOn = false;
  if (noiseStream) {
    noiseStream.getTracks().forEach(function (t) {
      t.stop();
    });
    noiseStream = null;
  }
  document.getElementById("noise-btn").textContent = "Start noise meter";
  document.getElementById("noise-msg").textContent = "Audio is never recorded, stored or sent.";
  if (typeof ClassScene !== "undefined") {
    ClassScene.setShake(0);
  }
}

/* Read loudness and jitter desks above a threshold. */
function noiseTick() {
  if (!noiseOn || !noiseAnalyser) {
    return;
  }
  var data = new Uint8Array(noiseAnalyser.fftSize);
  noiseAnalyser.getByteTimeDomainData(data);
  var sum = 0;
  data.forEach(function (v) {
    sum += Math.pow((v - 128) / 128, 2);
  });
  var loud = Math.sqrt(sum / data.length);
  var level = Math.min(1, Math.max(0, (loud - 0.05) * 4));
  if (typeof ClassScene !== "undefined") {
    ClassScene.setShake(level);
  }
  setTimeout(noiseTick, 120);
}

/* Earliest date in tests or attendance. */
function earliestDate() {
  var dates = [];
  store.students.forEach(function (s) {
    (s.tests || []).forEach(function (t) {
      dates.push(t.date);
    });
    Object.keys(s.attendance || {}).forEach(function (d) {
      dates.push(d);
    });
  });
  dates.sort();
  return dates.length ? dates[0] : todayKey();
}

/* Build weekly steps from the earliest date to today. */
function buildTimeSteps() {
  timeSteps = [];
  var start = new Date(earliestDate() + "T12:00:00");
  var end = new Date(todayKey() + "T12:00:00");
  var d = new Date(start);
  while (d <= end) {
    timeSteps.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 7);
  }
  if (timeSteps[timeSteps.length - 1] !== todayKey()) {
    timeSteps.push(todayKey());
  }
}

/* Set up the time travel slider. */
function setupTimeSlider() {
  buildTimeSteps();
  var slider = document.getElementById("time-slider");
  slider.min = "0";
  slider.max = String(timeSteps.length - 1);
  slider.value = String(timeSteps.length - 1);
  ui.timeCutoff = null;
  document.getElementById("time-label").textContent = "Today";
  document.getElementById("time-note").hidden = true;
}

/* Move time travel to the chosen week. */
function onTimeChange(ev) {
  var idx = Number(ev.target.value);
  var picked = timeSteps[idx];
  if (picked === todayKey()) {
    ui.timeCutoff = null;
    document.getElementById("time-label").textContent = "Today";
    document.getElementById("time-note").hidden = true;
  } else {
    ui.timeCutoff = picked;
    document.getElementById("time-label").textContent = "Week of " + picked;
    document.getElementById("time-note").hidden = false;
  }
  renderAll();
}

/* Render the top 3 most improved students. */
function renderImproved() {
  var list = document.getElementById("improved-list");
  list.textContent = "";
  mostImproved(store.students.map(function (s) {
    return { id: s.id, name: s.name, tests: visibleTests(s) };
  }), 3).forEach(function (row) {
    var li = document.createElement("li");
    li.textContent = row.name + " (+" + Math.round(row.gain) + ")";
    list.appendChild(li);
  });
  if (!list.children.length) {
    var li = document.createElement("li");
    li.textContent = "Not enough tests yet.";
    list.appendChild(li);
  }
}

/* Parent message for the selected student and tone. */
function messageText() {
  var s = findStudent(ui.selectedId) || store.students[0];
  if (!s) {
    return "";
  }
  var v = studentView(s);
  var avg = v.avg === null ? "no tests yet" : String(Math.round(v.avg));
  var att = v.att === null ? "no data" : String(Math.round(v.att)) + "%";
  var tone = document.getElementById("msg-tone").value;
  if (tone === "friendly") {
    return "Hi, quick note on " + s.name + ": average " + avg + ", attendance " + att + ". Thanks for your support.";
  }
  if (tone === "concerned") {
    return "I am writing about " + s.name + ": average " + avg + ", attendance " + att + ". Please meet me to plan next steps.";
  }
  return "Dear parent, " + s.name + " has average " + avg + " and attendance " + att + ". Regards, class teacher.";
}

/* Show the parent message preview. */
function renderMessage() {
  document.getElementById("msg-preview").textContent = messageText();
}

/* Copy the parent message to the clipboard. */
function copyMessage() {
  var text = messageText();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
    return;
  }
  var box = document.createElement("textarea");
  box.value = text;
  document.body.appendChild(box);
  box.select();
  document.execCommand("copy");
  document.body.removeChild(box);
}

/* Open the command bar. */
function openCmd() {
  document.getElementById("cmdbar").hidden = false;
  document.getElementById("cmd-input").value = "";
  document.getElementById("cmd-list").textContent = "";
  document.getElementById("cmd-input").focus();
}

/* Close the command bar. */
function closeCmd() {
  document.getElementById("cmdbar").hidden = true;
}

/* Names starting with the given prefix, ignoring case. */
function matchNames(prefix) {
  var q = (prefix || "").toLowerCase();
  return store.students.filter(function (s) {
    return s.name.toLowerCase().indexOf(q) === 0;
  });
}

/* Show command matches in the list. */
function showCmdMatches(rows) {
  var list = document.getElementById("cmd-list");
  list.textContent = "";
  rows.forEach(function (s) {
    var li = document.createElement("li");
    li.textContent = s.name + " (roll " + s.rollNo + ")";
    list.appendChild(li);
  });
}

/* Run one command bar command. */
function runCmd(raw) {
  var parts = raw.trim().split(/\s+/);
  var cmd = (parts[0] || "").toLowerCase();
  var rest = parts.slice(1).join(" ");
  if (cmd === "theme") {
    toggleTheme();
    closeCmd();
    return;
  }
  if (cmd === "spin") {
    spinPick();
    closeCmd();
    return;
  }
  if (cmd === "undo") {
    undoDelete();
    closeCmd();
    return;
  }
  if (cmd === "add" && rest) {
    openForm(null);
    document.getElementById("name-input").value = rest;
    closeCmd();
    return;
  }
  if ((cmd === "present" || cmd === "absent" || cmd === "open") && rest) {
    var matches = matchNames(rest);
    if (matches.length === 0) {
      showCmdMatches([]);
      document.getElementById("cmd-list").textContent = "No match.";
      return;
    }
    if (matches.length > 1) {
      showCmdMatches(matches);
      return;
    }
    var s = matches[0];
    if (cmd === "open") {
      openPanel(s.id);
    } else {
      s.attendance = s.attendance || {};
      s.attendance[todayKey()] = cmd === "present";
      saveStore();
      renderAll();
    }
    closeCmd();
  }
}

/* Draw the constellation canvas from seats, average and attendance. */
function renderStars() {
  var canvas = document.getElementById("stars");
  var ctx = canvas.getContext("2d");
  var ink = "#1B2A4A";
  try {
    ink = getComputedStyle(document.documentElement).getPropertyValue("--ink") || ink;
  } catch (e) {
    ink = "#1B2A4A";
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  var pos = {};
  store.students.forEach(function (s) {
    var v = studentView(s);
    var x = 40 + ((s.seat.col + 0.5) / 6) * (canvas.width - 80);
    var rows = Math.max(1, Math.ceil(store.students.length / 6));
    var y = 40 + ((s.seat.row + 0.5) / rows) * (canvas.height - 80);
    pos[s.id] = { x: x, y: y };
    var r = v.avg === null ? 4 : 4 + (Math.min(100, v.avg) / 100) * 10;
    var alpha = v.att === null ? 0.4 : 0.4 + (v.att / 100) * 0.6;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = ink;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
  });
  (ui.lastTeams || []).forEach(function (team) {
    for (var i = 1; i < team.length; i++) {
      var a = pos[team[i - 1]];
      var b = pos[team[i]];
      if (a && b) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = ink;
        ctx.stroke();
      }
    }
  });
}

/* Temporary helper to fill fake students for testing. Removed in Phase 6. */
function devFill(n) {
  var fakes = ["Meera Nair", "Arjun Menon", "Sara Khan", "Rohan Das", "Priya Iyer", "Kunal Bose", "Neha Jain", "Aditya Rao", "Pooja Shah", "Rahul Yadav", "Simran Kaur", "Varun Nambiar", "Ankit Tiwari", "Divya Bhat", "Sahil Kumar", "Riya Sen", "Aman Joshi", "Kavya Reddy", "Nikhil Anand", "Shreya Pillai", "Farhan Ali", "Geeta Rao", "Harish Kumar", "Lakshmi Venkat", "Manoj Tiwari", "Naina Kapoor", "Omar Sheikh", "Pankaj Mishra", "Qureshi Ahmed", "Rekha Singh", "Suresh Raina", "Tara Dutt", "Umesh Chandra", "Vani Rao", "Wasim Khan", "Xavier D souza", "Yash Thakur", "Zoya Khan", "Biren Das", "Chetan Bhagat"];
  var used = {};
  store.students.forEach(function (s) {
    used[s.seat.row + ":" + s.seat.col] = true;
  });
  var k = 0;
  while (store.students.length < n && k < fakes.length * 2) {
    var name = fakes[k % fakes.length] + (k >= fakes.length ? " " + (k + 1) : "");
    k += 1;
    var clash = store.students.some(function (s) { return s.name === name; });
    if (clash) {
      continue;
    }
    store.students.push({ id: "s_dev" + k + Date.now(), name: name, rollNo: String(100 + k), className: "10-B", notes: "", seat: freeSeat(used), attendance: { "2026-10-02": true }, tests: [{ subject: "Maths", name: "Unit test 1", date: "2026-09-20", score: 30 + (k % 20), max: 50 }] });
    var last = store.students[store.students.length - 1];
    used[last.seat.row + ":" + last.seat.col] = true;
  }
  saveStore();
  renderAll();
}

/* Wire up every Phase 5 control. */
function wirePhase5() {
  document.getElementById("spin-btn").addEventListener("click", spinPick);
  document.getElementById("spin-reset").addEventListener("click", resetSpin);
  document.getElementById("team-btn").addEventListener("click", makeTeams);
  document.getElementById("seat-btn").addEventListener("click", shuffleSeats);
  document.getElementById("noise-btn").addEventListener("click", toggleNoise);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      stopNoise();
    }
  });
  document.getElementById("time-slider").addEventListener("input", onTimeChange);
  document.getElementById("msg-tone").addEventListener("change", renderMessage);
  document.getElementById("msg-copy").addEventListener("click", copyMessage);
  document.getElementById("cmd-input").addEventListener("input", function (ev) {
    var v = ev.target.value;
    if (/^(present|absent|open)\s+/i.test(v)) {
      var rest = v.replace(/^\w+\s+/, "");
      showCmdMatches(matchNames(rest));
    }
  });
  document.getElementById("cmd-input").addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") {
      runCmd(ev.target.value);
    }
    if (ev.key === "Escape") {
      closeCmd();
    }
  });
  document.addEventListener("keydown", function (ev) {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") {
      ev.preventDefault();
      openCmd();
    }
    if (ev.key === "Escape") {
      closeCmd();
    }
  });
}

/* Wire up every control. */
function init() {
  store = loadStore();
  saveStore();
  document.getElementById("show-btn").addEventListener("click", function () {
    setView("cards");
    renderAll();
  });
  document.getElementById("add-btn").addEventListener("click", function () {
    openForm(null);
  });
  document.getElementById("cancel-btn").addEventListener("click", function () {
    setFormOpen(false);
  });
  document.getElementById("theme-btn").addEventListener("click", toggleTheme);
  document.getElementById("student-form").addEventListener("submit", submitForm);
  document.getElementById("undo-btn").addEventListener("click", undoDelete);
  document.getElementById("backup-btn").addEventListener("click", downloadBackup);
  document.getElementById("csv-btn").addEventListener("click", exportCSV);
  document.getElementById("mark-all-btn").addEventListener("click", markAllPresent);
  document.getElementById("restore-btn").addEventListener("click", function () {
    document.getElementById("restore-file").click();
  });
  document.getElementById("restore-file").addEventListener("change", function (ev) {
    if (ev.target.files.length > 0) {
      restoreFile(ev.target.files[0]);
    }
    ev.target.value = "";
  });
  document.getElementById("sample-btn").addEventListener("click", function () {
    store = freshStore();
    saveStore();
    renderAll();
  });
  document.getElementById("search-input").addEventListener("input", function (ev) {
    ui.search = ev.target.value;
    renderStudents();
  });
  document.getElementById("filter-class").addEventListener("change", function (ev) {
    ui.filterClass = ev.target.value;
    renderStudents();
  });
  document.getElementById("filter-grade").addEventListener("change", function (ev) {
    ui.filterGrade = ev.target.value;
    renderStudents();
  });
  document.getElementById("filter-attention").addEventListener("change", function (ev) {
    ui.onlyAttention = ev.target.value === "yes";
    renderStudents();
  });
  document.getElementById("sort-by").addEventListener("change", function (ev) {
    ui.sortBy = ev.target.value;
    renderStudents();
  });
  document.getElementById("tab-classroom").addEventListener("click", function () {
    setView("classroom");
  });
  document.getElementById("tab-cards").addEventListener("click", function () {
    setView("cards");
  });
  document.getElementById("tab-stars").addEventListener("click", function () {
    setView("stars");
  });
  document.getElementById("test-form").addEventListener("submit", submitTest);
  document.getElementById("notes-save").addEventListener("click", saveNotes);
  document.getElementById("panel-close").addEventListener("click", closePanel);
  document.getElementById("panel-present").addEventListener("click", function () {
    if (ui.selectedId) {
      toggleToday(ui.selectedId);
      openPanel(ui.selectedId);
    }
  });
  document.getElementById("panel-edit").addEventListener("click", function () {
    var s = findStudent(ui.selectedId);
    if (s) {
      openForm(s);
    }
  });
  document.getElementById("panel-delete").addEventListener("click", function () {
    if (ui.selectedId) {
      deleteStudent(ui.selectedId);
    }
  });
  document.getElementById("panel-print").addEventListener("click", printReports);
  document.getElementById("test-date").value = todayKey();
  wirePhase5();
  setupTimeSlider();
  try {
    if (typeof ClassScene !== "undefined") {
      ClassScene.onSelect(openPanel);
    }
  } catch (e) {
    sceneReady = false;
  }
  setView("classroom");
  renderAll();
}

init();
