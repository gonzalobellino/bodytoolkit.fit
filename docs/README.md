# Specification index

Development follows **spec-driven design (SDD)**: these documents are the source of truth for architecture, UX, and data. Update specs when behavior changes.

| Order | Document | Scope |
|-------|----------|--------|
| 1 | [ARCHITECTURE_SPEC.md](./ARCHITECTURE_SPEC.md) | Stack, repo layout, PWA, serverless API |
| 2 | [UX_SPEC.md](./UX_SPEC.md) | Layout, field tools, video/photo UX |
| 3 | [DATA_SPEC.md](./DATA_SPEC.md) | JSON catalogs and types |
| — | [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Historical feature rollout notes |

Accepted decisions: [ADR index](./adr/README.md). Current SDD status and remaining gaps: [SPEC_DRIVEN_REVIEW.md](./SPEC_DRIVEN_REVIEW.md).

Checks: `npm run check:specs` verifies selected documented paths and version references; `npm run check:data` validates catalog structure, IDs, references, quiz metadata, and bilingual forms. These checks do not prove that all UX behavior matches the specs.

Cursor rules for day-to-day work: [`.cursor/rules/`](../.cursor/rules/).
