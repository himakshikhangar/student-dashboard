/* Default subjects for a new store. */
var DEFAULT_SUBJECTS = ["Maths", "Science", "English", "Hindi", "Social science"];

/* Default seating constraints referencing seed ids. */
var DEFAULT_CONSTRAINTS = { keepApart: [["s_b2", "s_d4"]], frontRow: ["s_c3"] };

/* Full store kept in memory and persisted. */
var store = null;

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
  if (!localStorage.getItem("classdeck.v1")) {
    return freshStore();
  }
  try {
    var again = JSON.parse(localStorage.getItem("classdeck.v1"));
    if (isValidStore(again)) {
      return again;
    }
  } catch (e2) {
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

/* Render one card per student plus the empty state. */
function renderStudents() {
  var box = document.getElementById("students");
  box.textContent = "";
  store.students.forEach(function (s) {
    var card = document.createElement("article");
    card.className = "card";
    var title = document.createElement("h2");
    title.textContent = s.name;
    var roll = document.createElement("p");
    roll.textContent = "Roll number: " + s.rollNo;
    var cls = document.createElement("p");
    cls.textContent = "Class: " + s.className;
    cls.classList.add("muted");
    var row = document.createElement("div");
    row.className = "card-actions";
    var edit = document.createElement("button");
    edit.type = "button";
    edit.className = "btn";
    edit.textContent = "Edit";
    edit.addEventListener("click", function () {
      openForm(s);
    });
    var del = document.createElement("button");
    del.type = "button";
    del.className = "btn";
    del.textContent = "Delete student";
    del.addEventListener("click", function () {
      deleteStudent(s.id);
    });
    row.appendChild(edit);
    row.appendChild(del);
    card.appendChild(title);
    card.appendChild(roll);
    card.appendChild(cls);
    card.appendChild(row);
    box.appendChild(card);
  });
  document.getElementById("empty").hidden = store.students.length !== 0;
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
  renderStudents();
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
  saveStore();
  renderStudents();
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
  renderStudents();
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
    renderStudents();
    document.getElementById("restore-error").hidden = true;
  };
  reader.readAsText(file);
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

/* Wire up every Phase 2 control. */
function init() {
  store = loadStore();
  saveStore();
  document.getElementById("show-btn").addEventListener("click", renderStudents);
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
    renderStudents();
  });
  renderStudents();
}

init();
