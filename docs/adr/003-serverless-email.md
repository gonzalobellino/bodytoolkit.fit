# ADR 003: Use serverless functions for email

## Status

Accepted

## Context

Contact, notify-me, and send-by-link form results need outbound email. The browser must not contain the Resend API key.

## Decision

Use Vercel functions in `api/` for email through Resend. Keep video analysis, catalogs, and UI state in the browser. Do not add an application database for this flow.

## Consequences

- Email forms require a host that runs the functions, `RESEND_API_KEY`, and the relevant recipient settings.
- Static-only hosting serves the rest of the app but cannot send these emails without equivalent endpoints.
- Server-side input handling and email behavior must be reviewed as server code.
