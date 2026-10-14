# Catalog links and TypeScript audit

Branch: `analysis/data-links-typescript-errors`. Baseline: `main` at merge commit `b8095dd` (PR #11). This is an audit, not a change to product behavior or a clinical endorsement of any association.

## 13 exercise-to-pattern links without reverse links

`npm run check:data` reports these because an exercise lists a pattern in `pattern_ids`, while that pattern does not list the exercise in `exercise_ids`. The app's pattern and exercise detail views navigate using `pattern.exercise_ids`, so the missing reverse link can hide an exercise from the pattern view. Review each association for clinical relevance before adding the reverse link or removing the forward link.

| # | Exercise | Pattern missing the exercise | Review focus |
|---|----------|------------------------------|--------------|
| 1 | `e__psh_head_movement` | `p__forward_head_posture` | Direct cervical posture drill; confirm intended inclusion. |
| 2 | `e__psh_head_movement` | `p__upper_crossed_syndrome` | Confirm whether the broader syndrome should recommend this drill. |
| 3 | `e__cervical_rotation_towel` | `p__cervical_rotation_restriction` | Direct mobility drill; confirm intended inclusion. |
| 4 | `e__cervical_rotation_towel` | `p__forward_head_posture` | Confirm whether rotation work belongs in the posture protocol. |
| 5 | `e__ball_wall_push_hip_hinge` | `p__thoracic_kyphosis` | Check whether shoulder stability and hip hinge work addresses this pattern directly. |
| 6 | `e__ball_wall_push_hip_hinge` | `p__rounded_shoulders` | Check whether the exercise is a corrective for this pattern or only related. |
| 7 | `e__ball_wall_push_hip_hinge` | `p__limited_shoulder_flexion` | Check whether shoulder flexion is an intended target. |
| 8 | `e__hamstring_contract_relax` | `p__hamstring_dominance` | Mobility versus motor-control intent needs review. |
| 9 | `e__hamstring_contract_relax` | `p__posterior_pelvic_tilt` | Confirm the intended pelvic-position relationship. |
| 10 | `e__big_toe_stretch` | `p__limited_ankle_dorsiflexion` | Hallux extension and ankle dorsiflexion are different limits; review before linking. |
| 11 | `e__big_toe_stretch` | `p__overpronation` | Description mentions compensatory pronation; confirm corrective intent. |
| 12 | `e__foot_inversion_stretch` | `p__overpronation` | Description directly mentions pronation-dominant mechanics; confirm inclusion. |
| 13 | `e__foot_inversion_stretch` | `p__limited_ankle_dorsiflexion` | Check whether ankle dorsiflexion is an intended target. |

The six exercise records are in `public/data/exercises.json`; the reverse lists are in `public/data/patterns.json`. Suggested disposition for each row: **add reverse link**, **remove forward link**, or **document an intentional one-way relationship and revise the symmetry rule** in `docs/DATA_SPEC.md`. Avoid an automatic bulk edit.

## 20 TypeScript errors

Reproduced with `npx tsc --noEmit --pretty false` after PR #11. The production build passes because it does not run this check. The table lists every compiler diagnostic; identical causes are kept separate so the count remains auditable.

| # | Location | Diagnostic | Likely cause / next action |
|---|----------|------------|----------------------------|
| 1 | `src/App.tsx:159` | TS2322 | Form language inferred as `string`; type the parsed route as `FormLang`. |
| 2 | `src/App.tsx:267` | TS2741 | `HomePage` requires `glossary`; pass `data.glossary`. |
| 3 | `src/components/AssessmentViewer.tsx:275` | TS2322 | The `{assessment.data && (...)}` JSX expression can evaluate to `unknown`; use an explicit boolean condition before rendering. |
| 4 | `src/components/ClientFormView.tsx:100` | TS2352 | Cast from arbitrary JSON to `Questionnaire`; validate the loaded form shape first. |
| 5 | `src/components/ClientFormView.tsx:102` | TS2352 | Cast from arbitrary JSON to `FunctionalScale`; validate the loaded scale shape first. |
| 6 | `src/components/HomePage.tsx:104` | TS2322 | Overview card union omits `glossary`; extend it to the actual card IDs. |
| 7 | `src/components/PhotoAnalysis.tsx:125` | TS2322 | `useFullscreen` expects a non-null ref; accept a nullable DOM ref in the hook contract. |
| 8 | `src/components/PhotoAnalysis.tsx:132` | TS2322 | `useExportShare` expects a non-null canvas ref; accept a nullable ref. |
| 9 | `src/components/ShareAssessment.tsx:298` | TS2774 | `navigator.share` is typed as always defined; use a capability test that reflects runtime support. |
| 10 | `src/components/VideoAnalysis.tsx:271` | TS2322 | Same `useFullscreen` nullable-ref contract as #7. |
| 11 | `src/components/ui/calendar.tsx:62` | TS2353 | `react-day-picker` v9 no longer accepts `IconLeft`; adapt custom navigation to its current component API. |
| 12 | `src/components/ui/calendar.tsx:62` | TS7031 | `className` becomes implicit `any` in the unsupported `IconLeft` component; resolves with #11. |
| 13 | `src/components/ui/calendar.tsx:65` | TS7031 | Same issue for `IconRight`; resolves with #11. |
| 14 | `src/components/ui/chart.tsx:251` | TS2353 | CSS custom properties are absent from `CSSProperties`; type the style with explicit custom-property keys. |
| 15 | `src/hooks/useDrawingState.ts:220` | TS2322 | Returned canvas ref may be null; match `DrawingState`'s ref contract to initialization. |
| 16 | `src/hooks/useDrawingState.ts:221` | TS2322 | Same mismatch for container ref. |
| 17 | `src/hooks/useDrawingState.ts:222` | TS2322 | Same mismatch for fullscreen ref. |
| 18 | `src/hooks/useDrawingState.ts:223` | TS2322 | Same mismatch for file input ref. |
| 19 | `src/utils/dataLoader.ts:247` | TS2352 | Cast from fetched JSON to `Questionnaire`; share a runtime guard with #4. |
| 20 | `src/utils/dataLoader.ts:275` | TS2352 | Cast from fetched JSON to `FunctionalScale`; share a runtime guard with #5. |

## Suggested implementation order

1. Add reusable form and scale guards, then use them in both loading paths (#4, #5, #19, #20). These errors represent the largest data-trust gap.
2. Align nullable ref contracts (#7, #8, #10, #15–18); the hooks already check `.current` before use.
3. Fix the route and homepage props (#1, #2, #6), then the `unknown` render condition (#3).
4. Update the calendar customization for `react-day-picker` v9 (#11–13) and resolve the CSS property and share feature checks (#9, #14).
5. Run `npx tsc --noEmit` as a CI gate only after the error count reaches zero; update `docs/ARCHITECTURE_SPEC.md` in the same change.
