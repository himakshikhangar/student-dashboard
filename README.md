# ClassDeck — student dashboard

One teacher, one class. No server, no accounts. Data stays in this browser.

## How to open it

1. Double-click `index.html`. It works in current Chrome, Edge and Firefox.
2. For the noise meter microphone, open it through VS Code Live Server (`localhost`) instead.

Load order of scripts: `three.min.js`, `OrbitControls.js`, `seed.js`, `rules.js`, `scene3d.js`, `app.js`.

## The three jobs

- See who needs attention (red margin on cards, red flag on desks, attention list).
- Take attendance (per student toggle, Mark all present, streak shown).
- Record marks (test form, average and grade on each card).

Views: Classroom (3D, default), Cards, Constellation. Cards do everything the 3D view does.

## How to back up data

- Click `Download backup` to save `classdeck-backup.json`.
- Click `Restore backup` and pick a backup file to bring it back.
- A bad file changes nothing and says why.
- Theme is stored separately and stays when data is restored.
- To start over, clear the site data or use `Load sample class` when empty.

## Checks

- Open the console and run `runChecks()`. It logs no failures.
- Press `Ctrl+K` for the command bar (`add`, `present`, `absent`, `open`, `theme`, `spin`, `undo`).
