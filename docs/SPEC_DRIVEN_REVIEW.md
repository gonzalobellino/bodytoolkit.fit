# Spec-driven quality review

Reviewed against `main` plus the local security bump on branch `analysis/spec-driven-quality`. This note is an assessment, not a new specification.

## Verdict

The repository has the skeleton of spec-driven development: an index, three long specs, one ADR, a contribution rule that says to update specs with behavior changes, and `AGENTS.md` pointing at those files.

It is not a closed loop. Specs are narrative architecture and UX notes. They are not acceptance criteria, they are not checked by CI, and several sections contradict the code or each other. An agent that treats `docs/` as the source of truth will follow stale paths and a "no backend" claim that the same file already retracted.

## What is in place

- `docs/README.md` names Architecture, UX, and Data as the reading order, and marks `IMPLEMENTATION_PLAN.md` as historical.
- `CONTRIBUTING.md` says to read the spec before changing behavior and to update it in the same change.
- `AGENTS.md` routes any agent to the rule files and the specs without copying them.
- ADR 001 records a real decision: video and pose stay in the browser, with the consequence that there is no transcoding backend.
- `DATA_SPEC.md` defines ID prefixes (`p__`, `a__`, `e__`, `c__`) and relationship rules that match how the catalogs are shaped.

## Gaps

### 1. The source of truth is split

`docs/ARCHITECTURE_SPEC.md` (~480 lines) and `.cursor/rules/main.md` (~470 lines) both describe stack, structure, and security. They already disagree (see below). A change can update one and leave the other stale. Spec-driven work needs one normative file per topic. Rules should point at the spec, not restate it.

### 2. Specs mix current behavior, history, and unfinished plans

`IMPLEMENTATION_PLAN.md` marks joint angles, gait, compensations, and calibration as completed in the narrative, then ends with unchecked boxes to create those same files (`AngleOverlay.tsx`, `useGaitAnalysis.ts`, `CalibrationPage.tsx`). Those files already exist under `src/`. The document cannot tell an agent what is left to build.

`ARCHITECTURE_SPEC.md` still lists a future service worker ("Not currently implemented") while `vite-plugin-pwa` generates `dist/service-worker.js` on build.

### 3. Internal contradictions

| Claim | Where | What the tree actually has |
|-------|--------|----------------------------|
| Vite 6.3.5 | Architecture, technology stack | `package.json` pins `vite` 6.4.3 |
| No backend, no server-side security concerns | Architecture, Security Considerations | Same file's overview documents `api/` on Vercel (Resend) |
| Data files in `app/public/data/` | Data spec overview | Files live in `public/data/` |
| `quizQuestions.json` is a data file | Data spec file list | That file is not in `public/data/` |
| UI components in a path that matched an older layout | UX spec design-system reference still cites `app/prototype_figma/` | No `app/` tree |
| Types live in `app/src/types/index.ts` | `.cursor/rules/main.md` | `src/types/index.ts` |
| Cursor rules file `.cursorrules` | Data spec references | No `.cursorrules` file |

The project tree in the architecture spec lists a handful of hooks and components. The repo has 20 hooks and 41 top-level components, including gait, calibration, premium gating, and movement analysis. The tree is an early sketch, not an inventory.

### 4. Decisions are mostly unrecorded

Only ADR 001 exists. Premium gating, the hash-router (no React Router), PWA/offline, and "email leaves the browser only through `api/`" are behavior, but they are not written as decisions with consequences. The contribution guide allows an ADR "when practical", so skipping one is always allowed.

### 5. Nothing checks that a spec matches the code

There is no spec test, no schema check that JSON matches `DATA_SPEC.md`, and no CI step that fails when a documented path does not exist. The testing section of the architecture spec says unit, component, and integration tests are not implemented. Manual testing is the only described method. A spec can drift with no signal.

### 6. Acceptance criteria are missing

The UX spec describes colors, spacing, and layout intent. It does not state observable outcomes (given a loaded video that is not fullscreen, the page scrolls). Those outcomes live in `.cursor/rules/video-photo-layout.md` instead. Data rules are closer to a spec (ID prefixes, referential integrity) but they are a checklist for humans, not a validator.

## What this means for an agent

An agent that follows `AGENTS.md` will open the right files. It will then have to guess which paragraph is current. The safest reading today is:

- Trust `DATA_SPEC.md` for ID prefixes and relationships, after ignoring `app/public` and `quizQuestions.json`.
- Trust ADR 001 for where video is processed.
- Treat `IMPLEMENTATION_PLAN.md` as history, including the unchecked list at the bottom.
- Treat the architecture security section ("no backend") as outdated relative to the overview in the same file.
- Treat `.cursor/rules/video-photo-layout.md` and `forms-bilingual.md` as the normative UX/data rules for those features, because they are shorter and more operational than the specs.

## Suggested order if the specs are tightened later

1. Fix the contradictions in the table above so one sentence is true.
2. Delete or archive the unchecked "files to create" list in `IMPLEMENTATION_PLAN.md`.
3. Stop duplicating stack and layout inside `.cursor/rules/main.md`; link to the architecture spec.
4. Add ADRs only for decisions that are already true (PWA generation, serverless email, premium gate), not for a roadmap.
5. Add one machine check: JSON files that the data spec names must exist, and paths cited as current must exist.
