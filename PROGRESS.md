# PROGRESS — ClassDeck autopilot

## Done
- Phase 1 files exist: index.html (H1 + 3 buttons + #students), style.css (tokens), seed.js (6 students, 6 tests, 20 days), app.js (in-memory show/add/theme), favicon.svg.

## Next
1. rules.js (pure functions + runChecks) + node test
2. AGENTS.md §3 update: ClassScene.setShake(level) fourth function
3. Phase 2: validation/edit/delete+undo/persist/backup/restore/empty state → commit
4. Phase 3: attendance/tests/attention/search/filter/sort/notes/stats/charts/CSV/print → commit
5. Phase 4: scene3d.js + tilt/flip + fallback → commit
6. Phase 5: spinner/teams/seats/noise/time/trend/messages/cmd/badges/stars → commit
7. Phase 6: responsive/cleanup/README/final review → commit

## Resume
- If interrupted, read this file, `git log --oneline -8`, `git status --short`, then continue at first unchecked item.
- Test helper: `node --check <file>`; rules test: `node -e "const r=require('./rules.js'); r.runChecks()"`.
- Temp helper `devFill(45)` (Phase 5) must be removed in Phase 6.

## Log
- Phase 1 verified from prior session (6 cards, theme toggle, centred dashboard).
- rules.js written, node runChecks 19 passed. AGENTS.md §3 updated to 4 functions (setShake).
- Phase 2 done: validation via rules.js, edit, delete + 8s Undo toast, persist classdeck.v1, backup/restore with shape check, empty state. node --check clean.
