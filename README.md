# Corrective Exercise Toolkit (Body Toolkit)

Evidence-based movement toolkit for coaches and trainers: patterns, assessments, corrective exercises, and **client-side** video analysis with optional AI pose overlay.

**Live demo:** [bodytoolkit.fit](https://bodytoolkit.fit)

## Highlights

- Progressive Web App (React 19, TypeScript, Vite, Tailwind CSS v4)
- Field tools: video/photo analysis, gait, symmetry, dual-video sync, movement comparison
- Static content catalog (`public/data/*.json`) — exercises, patterns, assessments
- Spec-driven development: see [`docs/`](docs/README.md)
- Privacy-first video: processing stays in the browser; optional Vercel serverless only for contact/forms email

Content and Instagram carousel backoffice tooling live in a **separate private repository** (`bodytoolkit.backoffice`).

## Quick start

```bash
npm install
npm run dev
```

Open `https://localhost:5173` or `https://umbrel.local:5173` if you add local dev certs ([`conf/certs/README.md`](conf/certs/README.md)). HTTP on port 5173 works without certs.

```bash
npm run build
npm run preview
```

Copy [`.env.example`](.env.example) for local overrides. Production secrets (Resend, etc.) belong in Vercel project settings, not in git.

## Documentation

| Doc | Purpose |
|-----|---------|
| [Architecture](docs/ARCHITECTURE_SPEC.md) | Stack, structure, deployment |
| [UX](docs/UX_SPEC.md) | Layout and interaction rules |
| [Data](docs/DATA_SPEC.md) | JSON schemas and catalog |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Changes that affect behavior should update the relevant spec under `docs/` first.

## License

MIT — see [LICENSE](LICENSE).

## Security

See [SECURITY.md](SECURITY.md).
