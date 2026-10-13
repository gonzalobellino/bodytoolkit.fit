# Local validation (pre-push)

Run from this directory before pushing to `bodytoolkit.fit`:

```bash
npm ci
npm run build
npm run dev
```

Open http://127.0.0.1:5173/ (or the port Vite prints).

Optional secret scan:

```bash
docker run --rm -v "$(pwd):/repo" ghcr.io/gitleaks/gitleaks:latest detect --source /repo --log-opts="HEAD"
```

Push to GitHub only after explicit approval.
