# ADR 004: Keep navigation in the client

## Status

Accepted

## Context

The app has a small set of top-level sections, detail views, and shareable form links.

## Decision

Use React state for section changes and URL hashes for shareable form routes. `src/App.tsx` also reads selected direct paths on initial load. Do not introduce React Router for the current route set.

## Consequences

- New direct paths must be checked against the static host and the route parser in `src/App.tsx`.
- Form links depend on the hash route format; changes to it require a matching UX specification update.
