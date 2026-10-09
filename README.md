# Campus Desk

Campus Desk is a dashboard for a college student. It tracks timetable, attendance, exams, grades, focus time, and notices.

## Why I built it

The goal is one quiet place for a student's week. It covers classes, attendance, exams, grades, focus, and notices. Everything runs in the browser with no backend.

## Features

| Page | What it does |
| --- | --- |
| Overview | Shows attendance, today's classes, next exam, CGPA, shortage alerts, and to-do preview |
| Timetable | Shows a week grid, highlights today, adds classes, and reminds 10 minutes before class |
| Attendance | Counts Present and Absent per subject on flip cards and warns below 75% |
| Exams | Lists exams with a live days, hours, minutes, and seconds countdown |
| Grades | Stores marks per subject and shows grade points, GPA per semester, and CGPA |
| Focus | Runs a 25/5 Pomodoro timer with a progress ring, session count, and to-do list |
| Notices | Adds, pins, and deletes notices by hand |
| Profile | Edits name, course, semester, and theme, loads demo data, and clears data |

## Tech stack

- Plain HTML in `index.html` for structure.
- Plain CSS in `style.css` for themes and layout.
- Plain JavaScript in `app.js` for views and storage.
- Google Fonts for headings and body, with system fallbacks.
- No frameworks, no build step, no backend.

## Project structure

```text
student-dashboard/
├── AGENTS.md    rules for working on this project
├── index.html   page shell, sidebar, view container
├── style.css    light and dark themes, layout, motion
└── app.js       data, eight views, reminders, routing
```

## Run it locally

1. Open the `student-dashboard` folder.
2. Double-click `index.html`.
3. Use the sidebar to move between pages.
4. For class reminders, allow notifications when asked.

## How it works

- The app stores one object under the `sd.v1` key in `localStorage`.
- The sidebar uses hash routes like `#grades` to switch views.
- Attendance percent is present divided by total, times 100.
- Shortage starts below 75%, with catch-up counts shown.
- Grade points run 10 to 0 on a 10-point scale.
- GPA is the credit-weighted mean of grade points.
- Reminders check every 30 seconds while the tab stays open.

## Known limits

- Reminders only work while the tab is open.
- The notice board is manual, since there is no backend.
- Data is one JSON object in this browser only.
- Clearing site data erases everything.
- There is no sync between devices or browsers.

## Security notes

- Nothing is sent anywhere.
- There are no accounts and no passwords.
- Clearing the browser profile removes the data.
