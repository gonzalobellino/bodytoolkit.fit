# Contributing

Thank you for your interest in the Corrective Exercise Toolkit.

## Spec-driven workflow

1. Read the relevant spec in [`docs/`](docs/README.md) before changing behavior.
2. For new features or UX changes, update the spec (or add a short ADR under `docs/adr/`) in the same pull request when practical.
3. Keep user-facing UI copy in **English** unless the spec defines bilingual form content.

## Development

```bash
npm install
npm run dev
npm run build
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
