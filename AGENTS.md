# AGENTS.md: ClassDeck

## 1. What this is
A student dashboard for one teacher managing one class of 20 to 45 students. It runs in the browser with no server.

The one memorable thing is the **3D classroom**: one desk per student, coloured by performance. Everything else stays quiet so the classroom stands out.

The teacher's three jobs: see who needs attention, take attendance, record marks.

## 2. Hard constraints
- No backend, no accounts, no network calls. The only requests allowed are the CDN scripts and fonts listed below.
- Plain HTML, CSS, JavaScript. No frameworks, no npm, no build step.
- Classic `<script>` tags only. ES modules fail when the page is opened from `file://`.
- 3D: Three.js r128 global build (`cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`) and OrbitControls from `cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js`. Do not use a newer Three.js; the global build was removed in r160.
- Must work by double-clicking `index.html` in current Chrome, Edge and Firefox.
- Storage: `localStorage` only.
- Develop with VS Code's Live Server extension. The noise meter's microphone needs `localhost` or HTTPS.
- Code a student can read: every function has a one-line comment saying what it does, functions stay under about 30 lines, no clever one-liners.

## 3. Files
```
student-dashboard/
├── AGENTS.md
├── README.md
├── index.html
├── style.css
├── favicon.svg
├── seed.js       sample data, defines window.SEED
├── rules.js      every rule from section 5, pure functions, no DOM
├── scene3d.js    3D classroom only
└── app.js        state, UI, storage
```
Load order: three.min.js, OrbitControls.js, seed.js, rules.js, scene3d.js, app.js.

`rules.js` defines only pure functions: `percent`, `average`, `grade`, `attendancePercent`, `streak`, `needsAttention`, `trend`, `mostImproved`, `badges`, `runChecks`. They take plain data in and return plain data out.

`scene3d.js` exposes exactly four functions. `app.js` never touches Three.js directly.
```js
ClassScene.init(containerEl)        // build scene, return false if WebGL is unavailable
ClassScene.render(studentsWithStatus) // create or update desks
ClassScene.onSelect(callback)       // callback(studentId) when a desk is clicked
ClassScene.setShake(level)          // noise meter jitter 0 to 1, 0 is still
```

## 4. Data model
Stored under `localStorage["classdeck.v1"]`. Theme is stored separately under `classdeck.theme` as `"paper"` or `"chalkboard"`.
```js
{
  version: 1,
  subjects: ["Maths", "Science", "English", "Hindi", "Social science"],
  constraints: { keepApart: [["s_a", "s_b"]], frontRow: ["s_c"] },
  students: [{
    id: "s_k3j9x2",                       // generated, never shown
    name: "Aarav Sharma",                 // required, 1 to 40 chars
    rollNo: "14",                         // required, string, unique
    className: "10-B",                    // required
    notes: "",                            // private, max 500 chars
    seat: { row: 0, col: 0 },             // unique per student, 6 columns
    attendance: { "2026-10-09": true },   // true = present
    tests: [{ subject: "Maths", name: "Unit test 1",
              date: "2026-09-20", score: 42, max: 50 }]
  }]
}
```
Badges, grades, averages and statuses are computed. Never store them.

## 5. Rules
Write each rule once in `rules.js` and reuse it everywhere (cards, 3D desks, charts, CSV, report card).

| Rule | Definition |
|---|---|
| Test percent | `score / max * 100` |
| Average | Mean of all test percents, every subject weighted equally. `null` if no tests. |
| Grade | A ≥ 90, B ≥ 75, C ≥ 60, D ≥ 40, F < 40. No tests: no grade. |
| Attendance % | present days / marked days * 100. `null` if no marked days. The UI shows "No data", never 0%. |
| Streak | Consecutive present days, ending at the latest marked day. |
| Needs attention | Any of: attendance < 75%; average < 40; with at least 4 tests, the mean of the last 2 test percents is 10 or more points below the mean of the 2 before them. |
| Trend | Least-squares line through test percents in date order. Needs at least 3 tests, else "Not enough tests". Prediction = next point, clamped to 0 to 100. |
| Most improved | Mean of last 3 test percents minus mean of the 3 before. Needs at least 6 tests. Show the top 3. |
| Badges | `streak7`: streak of 7 or more. `comeback`: last test percent is 20 or more points above the one before. `perfect`: any test with score = max. |

Validation: name 1 to 40 chars; roll number required and unique (error names the clash: "Roll number 14 is already used by Diya Patel."); score between 0 and max; max greater than 0.

## 6. Design
**Concept:** marking a notebook. Light theme "Paper" is a ruled page: blue ink for content, red pen for anything that needs the teacher's eye. Dark theme "Chalkboard" is a classroom board.

**Colour tokens** (define as CSS variables on `[data-theme]`; no hard-coded colours elsewhere):

| Token | Paper | Chalkboard |
|---|---|---|
| `--bg` | `#E8ECF1` | `#16201C` |
| `--surface` | `#FCFCFD` | `#1E2B26` |
| `--ink` | `#1B2A4A` | `#ECEFE6` |
| `--muted` | `#5B6B87` | `#9BAAA1` |
| `--rule` | `#C9D6EA` | `#34463E` |
| `--blue` | `#2447C8` | `#7FB2F0` |
| `--green` | `#1F7A4D` | `#8FD3A4` |
| `--yellow` | `#F6E27A` | `#EBD65A` |
| `--red` | `#D1342F` | `#F0766B` |

**Buttons (the task asks for colourful):** Show Students = blue, Add Student = green, Change Theme = yellow. Text on Paper blue/green is white; on yellow and all Chalkboard fills it is the ink or bg colour. Every text/background pair must reach 4.5:1 contrast.

**Type:** headings Bricolage Grotesque 700; body Public Sans; Caveat only for the teacher's notes and the red-pen annotations. Numbers use `font-variant-numeric: tabular-nums`. Scale: 14 / 16 / 20 / 28 / 44 px. Line length 70 characters or less. Always include fallbacks (`system-ui, sans-serif`).

**Layout:** one dashboard container, centred, `max-width: 1100px`, radius 16px, one shadow (`0 12px 32px rgba(27,42,74,.14)` on Paper, `0 12px 32px rgba(0,0,0,.45)` on Chalkboard). Student cards radius 8px. Text left-aligned, numbers right-aligned in tables.
```
┌───────────────────────────────────────────────────────────┐
│ Student Dashboard        [Show Students][Add Student][Change Theme]
├───────────────────────────────────────────────────────────┤
│ students | class average | present today | need attention │
├───────────────────────────────────────────────────────────┤
│ Classroom (3D, default) | Cards | Constellation           │
│ ┌───────────────────────────────┐ ┌─────────────────────┐ │
│ │ view area                     │ │ student panel       │ │
│ └───────────────────────────────┘ └─────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

**Structure carries meaning:** a student card has a red margin line on the left only when the student needs attention. Nothing is decorative.

**3D classroom:**
- Perspective camera at about 35° elevation. One directional light plus ambient. No post-processing.
- Desk = box top + chair block, shared geometry and materials. Desk top colour by grade: A/B green, C/D yellow, F red, no tests grey. The letter grade is drawn on the desk top, and a small red flag marks "needs attention". Colour is never the only signal.
- OrbitControls: pan off, zoom limited, polar angle clamped so the camera never goes under the floor.
- Hover shows a tooltip (name, average). Click opens the student panel.
- If WebGL is unavailable, show the card view and one line saying why.

**Motion (only these):**
1. Desks rise into place once, 600 ms, the first time the 3D view loads.
2. A new student's desk drops in.
3. Card flip on click, 300 ms.
4. Card tilt, max 6°, only when `(hover: hover)`.
5. Stat counters count up, 500 ms.

Under `prefers-reduced-motion`, all of these are instant. No other hover animation.

**Never use:** decorative gradients, glass blur, emoji as icons, ALL-CAPS labels, eyebrow labels above headings, 01/02/03 numbering, arrows on buttons, lorem ipsum, greetings like "Welcome back", words like "unlock", "seamless", "empower".

**Copy:** sentence case, plain verbs, buttons say what happens ("Save student", "Delete student"). Toast: "Student deleted. Undo". Empty state: "No students yet. Add one or load a sample class." Errors say what to fix. The task's three button labels stay exactly as written.

**Accessibility:** every control reachable by keyboard, 2px visible focus ring in `--blue`, form fields have labels, touch targets at least 40px. The card view is the full-function equivalent of the 3D view.

## 7. Phases
Build one phase, then stop.

**Phase 1: Basic task**
- `<h1>Student Dashboard</h1>`, three buttons (Show Students, Add Student, Change Theme), and `<div id="students">`.
- Show Students renders one card per student from 6 seeded samples. Card shows name, roll number, class.
- Add Student opens a form (name, roll number, class). Saving adds a card (in memory only).
- Change Theme switches Paper and Chalkboard through `data-theme` on `<html>`. First visit follows `prefers-color-scheme`.
- Add `favicon.svg` and link it in `index.html`.
- Seed data lives in `seed.js` as `window.SEED`. It is fixed, not random: 6 students, at least 5 tests each over 8 weeks, about 20 marked school days, at least one student who needs attention and one with a perfect score.
- *Check:* opening `index.html` shows a centred dashboard; Show Students gives 6 cards; theme toggle changes every colour.

**Phase 2: Core**
- Validation from section 5, edit, delete with an 8-second Undo toast.
- Persist to `classdeck.v1`; persist theme and set it before first paint (inline script in `<head>`).
- Backup downloads JSON. Restore uploads JSON, checks `version` and shape, and on a bad file changes nothing and says why.
- Empty state with "Load sample class".
- *Check:* refresh keeps data; duplicate roll number is rejected with the named clash; a bad restore file leaves data unchanged.

**Phase 3: Teacher tools**
- Attendance: toggle per student for today, "Mark all present", streak shown.
- Test entry form; average and grade on each card.
- Needs attention panel (rule in section 5).
- Search (name or roll number), filter (class, grade, needs attention), sort (name, roll number, average, attendance).
- Private notes in the panel.
- Stats row: students, class average, present today, need attention.
- Charts in plain SVG: grade distribution bars; per-student line of test percents.
- Export CSV with columns `rollNo,name,className,average,attendancePercent,grade,needsAttention`.
- Report card: `@media print`, one student per page: name, roll number, class, test table, average, grade, attendance. Notes are never printed.
- `runChecks()` in `rules.js`, callable from the console, asserts every rule in section 5 against the seed data.
- *Check:* `runChecks()` logs no failures.

**Phase 4: 3D and cards**
- `scene3d.js` per section 3 and section 6.
- Card tilt and flip.
- Smooth with 45 desks while orbiting.
- *Check:* click a desk opens the same panel as clicking a card; WebGL fallback shows cards.

**Phase 5: Extra features**
- **Cold-call spinner:** 3D wheel picks a random student not yet picked this round. "Reset round" button. When everyone has been picked, the round resets with a notice.
- **Team maker:** choose a group count; sort by average (no tests last), then deal in snake order so groups stay balanced.
- **Seating shuffler:** random seats that respect `keepApart` and `frontRow`. If the constraints can't be met, say which one failed.
- **Noise meter:** `getUserMedia({ audio: true })` with an `AnalyserNode`; desks jitter in proportion to loudness above a threshold. Audio is never recorded, stored or sent. It stops when toggled off or the tab is hidden. If blocked: "Microphone blocked. Allow it in the browser's site settings." If it fails, tell the user to open the page through Live Server.
- **Time travel:** weekly slider from the earliest date to today. Recompute everything using only data dated on or before that week. Read-only until back at today.
- **Trend prediction and Most improved:** per section 5.
- **Parent message maker:** fill-in templates, not AI. Three tones (formal, friendly, concerned) using `{name}`, `{average}`, `{attendance}`. Copy button.
- **Command bar:** `Ctrl+K` opens, `Esc` closes. Commands: `add <name>`, `present <name>`, `absent <name>`, `open <name>`, `theme`, `spin`, `undo`. Names match by prefix, ignoring case; if more than one matches, list them.
- **Badges:** per section 5, shown on cards and in the panel.
- **Constellation view:** 2D canvas. Star radius from average (4 to 14 px), brightness from attendance %, positions from seat positions, lines join students in the same team from the last team maker run.
- *Check:* each feature works from the keyboard and under reduced motion.

**Phase 6: Polish**
- Responsive at 640px and below: buttons stack, panel becomes a full-screen sheet, 3D view 60vh.
- Remove `console.log`, check focus order, check contrast on both themes.
- `README.md`: how to open it, how to back up data.

## 8. Out of scope
Accounts, multiple teachers, cloud sync, notifications, student photos, parent portal, AI-written text, translations.

## 9. How to work
1. Read this whole file before writing code.
2. Do one phase. Do not build ahead.
3. When the phase is done, list: what to test by hand, which checks pass, and any place you deviated. Then stop and wait for "next".
4. Add no libraries, files or features that are not listed. If something here is unclear or contradicts itself, ask instead of guessing.
5. Keep every rule from section 5 in `rules.js` only.
