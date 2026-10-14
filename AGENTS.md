# Agent instructions

This file is the entry point for any coding agent working in this repository (Cursor, Codex, Claude, Copilot, or others).

Do not copy rule text into this file or into chat replies as a substitute for reading the files below. Read the linked file and follow it.

## Rules

| File | Read it when |
|------|----------------|
| [`.cursor/rules/main.md`](.cursor/rules/main.md) | Any change. Stack, layout of the repo, and day-to-day engineering constraints. |
| [`.cursor/rules/no-direct-push-main.mdc`](.cursor/rules/no-direct-push-main.mdc) | Git: branches, pull requests, and merges. |
| [`.cursor/rules/forms-bilingual.md`](.cursor/rules/forms-bilingual.md) | Forms or questionnaire/scale JSON that can be sent by link. |
| [`.cursor/rules/video-photo-layout.md`](.cursor/rules/video-photo-layout.md) | Layout or scroll of video or photo analysis. |
| [`.cursor/rules/floating-toolbar-video.md`](.cursor/rules/floating-toolbar-video.md) | The floating toolbar on video or photo analysis. |

The directory name `.cursor/rules/` is only a path. Those files apply to every agent.

## Specifications

When behavior changes, update the matching spec in the same change. Index: [`docs/README.md`](docs/README.md).

- [`docs/ARCHITECTURE_SPEC.md`](docs/ARCHITECTURE_SPEC.md)
- [`docs/UX_SPEC.md`](docs/UX_SPEC.md)
- [`docs/DATA_SPEC.md`](docs/DATA_SPEC.md)

Human contribution flow: [`CONTRIBUTING.md`](CONTRIBUTING.md).
