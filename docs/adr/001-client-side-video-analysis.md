# ADR 001: Client-side video analysis

## Status

Accepted

## Context

Field tools must work offline-capable, avoid uploading client videos to a server, and support large files on consumer hardware.

## Decision

Decode and paint video frames in the browser (`<video>` + canvas). Pose models run via TensorFlow.js in the client. Drawings and exports are computed locally.

## Consequences

- No transcoding pipeline or video storage backend in this repo.
- Browser codec limits (e.g. HEVC) are handled with user-visible notices, not server-side conversion.
- Export/share uses canvas snapshots and Web Share API when available.
