# CLAUDE.md — Dispatch Layer (Bangkok Flood Response)

Claude Code reads this file automatically at the start of every session. Keep it short and true.

## What this project is
A web app for a community organization responding to floods in Bangkok (all 50 districts).
This repo part = the **dispatch layer**: dispatchers see incidents (people needing help) and
response teams on a map, assign teams, and track each incident until resolved.
It does NOT forecast floods. It does NOT diagnose medical conditions.

## My part vs teammates
- Me (dispatch layer): incident map, team cards, assignment, status tracking, team suggestions,
  health triage display, responder safety, field feedback, demo mode.
- Person 1: flood maps (depth, rising or not). Person 2: severity score, access type, routes.
- Person 3: app shell, SMS intake + Gemini parsing, login, deployment.
- Person 4: validation and demo script.
- Until teammates' real data exists, use the fake data in `data/fake/`. Never invent their APIs.

## Tech stack (confirm with Person 3 before changing)
- React + TypeScript + Vite
- MapLibre GL JS for the map
- PostgreSQL + PostGIS for data (`db/schema.sql`). Switched from Supabase on 2026-10-04, agreed
  with Person 3. How the browser reaches it (API server, live updates, login) is not decided yet.
- dnd-kit for drag and drop
- Vitest for tests

## Data contracts (source of truth: `src/types/` once created)
Tables: incidents, health, teams, assignments, events.
Incident status: new, verified, assigned, en_route, on_scene, resolved, could_not_reach, cancelled.
Team status: available, en_route, on_scene, returning, resting, off_duty.
Severity levels: critical, high, medium, low.
Access types: truck, boat_only, walk_only.

## Rules for working in this repo
1. **Don't guess.** If a library API, file, or requirement is unclear, check the installed
   package's types/docs or the code, or ask me. Never invent function names, endpoints or data.
2. **Stay in scope.** Only do what the current session prompt asks. List other ideas at the end
   instead of building them.
3. **Small steps.** Make a plan first, then change a few files at a time, then run tests.
4. **No new dependencies** without asking me first.
5. **Business logic in pure functions** under `src/logic/` with unit tests. UI components stay thin.
6. **Every state change writes an event** to the events log.
7. **Health data:** show only priority colour + need icon on the map; full details only in the
   incident card. Never log health details to the console.
8. **AI never decides.** Gemini-extracted fields must show `verified_by_human` and the original message.
9. **Critical medical cases** must show a reminder to call 1669 (Thai emergency medical service);
   rescues 1784 (DDPM).
10. **Before finishing a session:** run `npm test` and `npm run build`, fix failures, then update
    `PROGRESS.md` (what's done, what's next, known issues) and stop.

## Files to read at session start
- `CLAUDE.md` (this file)
- `PROGRESS.md` (what previous sessions did)
- `docs/dispatch-plan.md` (full plan, if present)
