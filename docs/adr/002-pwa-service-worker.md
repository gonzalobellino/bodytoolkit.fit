# ADR 002: Generate the production service worker

## Status

Accepted

## Context

The app needs installability and cached static assets while Vite controls its production output.

## Decision

Use `vite-plugin-pwa` in `vite.config.ts` to generate `service-worker.js` with Workbox. `src/main.tsx` registers that URL. The handwritten `public/service-worker.js` remains in the source tree, but the production build emits the plugin-generated worker at the same path.

## Consequences

- Worker behavior must be verified from the built `dist/service-worker.js`, not inferred from the handwritten source file.
- Changes to precaching or navigation fallback belong in `vite.config.ts` and `docs/ARCHITECTURE_SPEC.md`.
- Offline coverage requires an explicit browser check; build success alone does not establish it.
