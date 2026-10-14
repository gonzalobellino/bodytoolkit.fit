# Spec-driven development review

This is an assessment of the current repository, not a product specification. The normative documents are indexed in [README.md](./README.md).

## Current status

The repository has a usable SDD workflow: `AGENTS.md` directs agents to the rules and specs; `CONTRIBUTING.md` requires the matching spec with behavior changes; the PR template asks for the contract and verification; CI runs `check:specs`, `check:data`, and the build. Accepted architecture decisions have their own [ADR index](./adr/README.md).

This is still a partial closed loop. `check:specs` checks selected paths and text references, while `check:data` checks catalog shape, IDs, references, quiz metadata, and bilingual forms. Neither check verifies every narrative claim or the visual behavior of the app. The UX criteria for video and photo analysis are observable, but currently require manual verification.

## Resolved in the SDD cleanup

| Issue | Resolution | Evidence |
|-------|------------|----------|
| Stale `app/` paths and nonexistent quiz question file | Corrected documented paths and described runtime quiz generation | `docs/DATA_SPEC.md`, `docs/ARCHITECTURE_SPEC.md`, `scripts/check-spec-paths.mjs` |
| Historical plan looked like open work | Marked it as history and removed the stale task list | `docs/IMPLEMENTATION_PLAN.md` |
| Serverless email was described as no backend | Documented the Vercel functions and required environment variables | `docs/ARCHITECTURE_SPEC.md`, ADR 003 |
| Quiz topic schema did not match the app | Documented `questionCount`, `knowledgeBase`, and `questionTypes` | `docs/DATA_SPEC.md`, `src/types/index.ts` |
| Data rules had no CI gate | Added catalog validation and CI step | `scripts/check-data.mjs`, `.github/workflows/ci.yml` |

## Remaining work

1. **Catalog relationship curation.** Thirteen existing `exercise.pattern_ids` links lack the corresponding `pattern.exercise_ids` link. `check:data` reports them without failing; a domain review should decide which links to retain before enforcing symmetry.
2. **Runtime data validation.** TypeScript annotations do not validate fetched JSON. `src/utils/dataLoader.ts` currently trusts most parsed responses. Reuse a shared schema or guards if runtime validation is required.
3. **Behavior verification.** Add targeted automated checks for high-value interactions such as loaded-media scrolling, fullscreen exit, and form-link submission. Until then, include manual scenarios in the PR.
4. **Spec maintenance.** Architecture and UX contain broad historical descriptions. Prefer short, current contracts with direct evidence; remove stale inventory and speculative guidance as those areas are touched.
5. **Existing static-analysis debt.** `npx tsc --noEmit` currently reports 20 errors, and `npm run lint` reports 454 errors and 667 warnings. CI only gates the build and the two SDD checks. Resolve these in focused changes before claiming type-check or lint compliance.

## Review standard for future changes

For each behavior change, identify the observable outcome, update its spec in the same PR, and record how the outcome was checked. For data changes, run `check:data`; for architectural choices with lasting consequences, add or amend an ADR.
