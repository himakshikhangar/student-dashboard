# Campus Desk

Campus Desk is a dashboard where a college student manages study tasks.

HTML, CSS, JavaScript, Anime.js, Opencode.

## About

Campus Desk is for college students with busy weeks.

It keeps timetable, attendance, exams, grades and focus time in one place.

It runs in the browser with no backend and no sign-up.

## Features

### Home

- **What it does:** It greets the student and shows six tiles for the day.
- **How to use it:**
  1. Open the app to land on Home.
  2. Read the greeting line for classes and low attendance.
  3. Tap a button to jump to Attendance, Focus or Timetable.
- **How it works:** Tiles show classes, mean attendance, days to next exam,
  tasks, sessions and CGPA. Day progress runs from 8:00 to 18:00.

### Overview

- **What it does:** It sums up attendance, classes, exams and grades.
- **How to use it:**
  1. Open Overview from the sidebar.
  2. Read the four stat cards at the top.
  3. Scroll for today, to-do, subject bars and the week.
- **How it works:** Mean attendance below 75% raises a shortage alert. Each
  low subject names the classes needed from `max(0, 3*total - 4*present)`.

### Timetable

- **What it does:** It stores weekly classes and shows them on a grid.
- **How to use it:**
  1. Tap Add class and fill day, start, end, subject and room.
  2. Tap a block to edit it or delete it.
  3. Tap Enable reminders to allow browser notifications.
- **How it works:** A reminder fires 10 minutes before class with a toast
  and a notice. End time must be after start time, and a subject must exist.

### Attendance

- **What it does:** It counts Present and Absent taps per subject.
- **How to use it:**
  1. Add a subject with the form at the top.
  2. Tap Present or Absent after each class.
  3. Tap Details to flip the card for counts and advice.
- **How it works:** Percent is `present / total * 100`, and below 75% the
  card warns. Recovery uses `max(0, 3*total - 4*present)`, and safe skips
  use `floor((4*present - 3*total) / 3)`.

### Exams

- **What it does:** It lists exams with a live countdown per exam.
- **How to use it:**
  1. Add an exam with name, subject, date and time.
  2. Watch the days, hrs, min and sec boxes tick.
  3. Remove past exams with the Remove link.
- **How it works:** The countdown ticks each second and flips each changed
  digit. A subject must exist before an exam is added.

### Grades

- **What it does:** It stores marks and shows GPA per semester and CGPA.
- **How to use it:**
  1. Add semester, subject, credits, marks and max marks.
  2. Read GPA cards per semester at the top.
  3. Delete a row with the cross button.
- **How it works:** Points run 10 down to 0 at marks 90, 80, 70, 60, 50,
  45 and 40. GPA is the credit-weighted mean, and marks cannot pass max.

### Focus

- **What it does:** It runs a Pomodoro timer next to a daily to-do list.
- **How to use it:**
  1. Tap Start or Pause on the timer ring.
  2. Tap Switch to move between Focus and Break.
  3. Add tasks, tick them done, or delete them.
- **How it works:** Focus lasts 25 minutes and Break lasts 5 minutes. Each
  finished focus block adds one to the session count.

### Notices

- **What it does:** It keeps a small manual notice board.
- **How to use it:**
  1. Post a notice with a title, details and optional pin.
  2. Pinned notices sort to the top.
  3. Delete old notices with the Delete link.
- **How it works:** Notices store title, body, pin flag and date. The board
  is manual since the app has no link to a college system.

### Profile

- **What it does:** It stores the student name, course and semester.
- **How to use it:**
  1. Edit name, course, semester and theme, then save.
  2. Tap Load demo data to fill the app with sample rows.
  3. Tap Clear all data to wipe rows after a confirm.
- **How it works:** Profile and theme save into the same stored object.
  Clear keeps the profile and theme and wipes the rest.

### Live side panel

- **What it does:** It shows clock, tasks, attendance, exams and week.
- **How to use it:**
  1. Widen the window to 1400 pixels or more.
  2. Read the panel on the right side.
  3. It refreshes on each view change.
- **How it works:** It shows an analog and digital clock, a tasks ring, one
  bar per subject, the next 2 exams and seven day columns.

### Theme and settings

- **What it does:** It switches the app between light and dark themes.
- **How to use it:**
  1. Tap Change Theme in the header.
  2. Or pick Light or Dark in the Profile form.
  3. The choice stays after reload.
- **How it works:** Themes are CSS variables on `[data-theme]`. The saved
  theme applies before first paint from storage.

## Animations and 3D

| Effect                       | Where                 | Library  |
|------------------------------|-----------------------|----------|
| Intro curtains, cube, title  | First visit intro     | Anime.js |
| Sidebar link entrance        | Sidebar               | Anime.js |
| Active tab pill              | Sidebar               | Anime.js |
| Dock magnification           | Sidebar, wide screens | Anime.js |
| Click ripple                 | Sidebar links         | Anime.js |
| Dot grid build and ripple    | Home hero             | Anime.js |
| Pointer glow on dots         | Home hero             | Anime.js |
| Greeting letters rise        | Home hero             | Anime.js |
| Stat tiles, rings, count-up  | Home stats            | Anime.js |
| Rolling clock digits         | Home hero             | Anime.js |
| Day progress bar fill        | Home                  | Anime.js |
| Title letters rise           | Every view            | Anime.js |
| Stat numbers pop             | Overview, Grades      | Anime.js |
| Rows slide in on scroll      | Lists                 | Anime.js |
| Attendance bars, count-up    | Overview              | Anime.js |
| Week day tiles flip in       | Overview              | Anime.js |
| Subject dots pop in          | Overview              | Anime.js |
| Cards slide in               | Side panel            | Anime.js |
| Clock sweep and ticks        | Side panel            | Anime.js |
| Tasks ring fill              | Side panel            | Anime.js |
| Attendance bars grow         | Side panel            | Anime.js |
| Week columns grow            | Side panel            | Anime.js |
| Cards fade up on change      | Every view            | CSS      |
| Card tilt, max 8 degrees     | Cards, hover only     | CSS      |
| Attendance card flip         | Attendance            | CSS      |
| Countdown digit flip         | Exams                 | CSS      |
| Spinning cube logo           | Sidebar logo          | CSS      |

All motion switches off when the system has reduced motion turned on.

## Tech stack

| Tool         | Used for                                                 |
|--------------|----------------------------------------------------------|
| HTML         | Page shell, sidebar, view and panel in `index.html`      |
| CSS          | Themes and layout in `style.css`, `home.css`, `rail.css` |
| JavaScript   | Data, views, routing and timer in `app.js`               |
| Anime.js v4  | Motion in `anime-*.js` files, loads from jsDelivr CDN    |
| Opencode     | #D animation and .js files                               |

Anime.js v4 loads from the jsDelivr CDN through a defer script tag in
`index.html`. Fonts load from Google Fonts with `system-ui` fallbacks.

## Project structure

```text
student-dashboard/
├── AGENTS.md         # Rules for working on this project
├── README.md         # This file
├── index.html        # Page shell, sidebar, view and panel
├── style.css         # Themes, layout, cards, flip and motion
├── home.css          # Home hero, dot grid and stat tiles
├── rail.css          # Live side panel for wide screens
├── app.js            # Data, nine views, routing and reminders
├── anime-intro.js    # Opening curtains, cube and title
├── anime-nav.js      # Tab pill, dock zoom and click ripple
├── anime-home.js     # Dot grid, greeting, tiles and clock
├── anime-fill.js     # Overview bars, day tiles and dots
├── anime-fx.js       # Title, stats and row entrance
├── anime-rail.js     # Side panel clock, ring, bars and week
└── .gitignore        # Git ignore rules
```

## Run it locally

1. Install VS Code on your machine.
2. Install the Live Server extension in VS Code.
3. Open the `student-dashboard` folder in VS Code.
4. Right-click `index.html` and choose Open with Live Server.
5. Keep an internet link on, since fonts and Anime.js load from CDNs.

You can also double-click `index.html` to open it straight in a browser.

## How your data is stored

Everything stays in this browser in one stored object, and nothing is sent
anywhere. The Load demo data button fills sample rows, and the Clear all
data button wipes rows but keeps profile and theme. Clearing browser data
removes it all.

| Key        | What it holds                                             |
|------------|-----------------------------------------------------------|
| `sd.v1`    | Theme, profile, subjects, classes, attendance, exams,     |
|            | grades, notices, to-dos and focus count                   |
| `sd.intro` | Intro-seen flag in session storage, cleared on tab close  |

## Deploy on GitHub Pages

1. Open the repository on GitHub.
2. Open Settings, then Pages.
3. Under Source pick "Deploy from a branch".
4. Pick branch master and folder / (root).
5. Press Save and wait for the build.
6. Open https://himakshikhangar.github.io/student-dashboard/ to check it.

## Known limits

- Class reminders only work while the tab is open.
- The notice board is manual, with no link to a college system.
- Data lives in one browser on one device, with no sync.
- Fonts and Anime.js need internet, since they load from CDNs.
- Without the CDN scripts the page still works, but motion is lost.

## Live demo

Visit my project using: **(https://thee-studentt-dashboardd-portall.vercel.app/)**

