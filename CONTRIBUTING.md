# Contributing

Thank you for your interest in the Corrective Exercise Toolkit.

## Spec-driven workflow

1. Read the relevant spec in [`docs/`](docs/README.md) before changing behavior.
2. For behavior changes, update the relevant spec in the same pull request. Add an ADR under `docs/adr/` for a lasting architectural decision.
3. Keep user-facing UI copy in **English** unless the spec defines bilingual form content.

## Development

```bash
npm install
npm run dev
npm run build
npm run check:specs
npm run check:data
npm run lint
```

## Commits and pull requests

- Do not push to `main`. Open a branch, then a pull request.
- Merge only after the repository owner explicitly authorizes that merge.
- Use clear, English commit messages focused on **why**.
- One logical change per PR when possible.
- Do not commit secrets or local cert private keys (see [`conf/certs/README.md`](conf/certs/README.md)).

## Code style

Follow existing patterns in `src/`. Prefer small, focused diffs over drive-by refactors.
