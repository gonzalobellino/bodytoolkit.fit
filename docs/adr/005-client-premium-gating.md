# ADR 005: Keep current feature gating in browser state

## Status

Accepted for the current product

## Context

The app presents free and premium tool states, while payment activation is currently disabled in `src/config/env.ts`.

## Decision

Use `PremiumContext` and local storage to drive visible feature access. Treat this as a client-side product gate, not verified entitlement or authorization.

## Consequences

- Premium state can be changed in the browser and must not protect server data or paid services.
- Any future paid entitlement requires server verification before relying on it for access control.
