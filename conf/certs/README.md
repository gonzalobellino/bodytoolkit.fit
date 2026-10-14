# Local HTTPS certificates (optional)

The Vite dev server uses HTTPS when `umbrel.local.crt` and `umbrel.local.key` exist in this folder. They are **not** committed to the public repository.

Generate your own (example with [mkcert](https://github.com/FiloSottile/mkcert)):

```bash
mkcert -install
mkcert -cert-file umbrel.local.crt -key-file umbrel.local.key umbrel.local localhost 127.0.0.1
```

Without certs, the app still runs on HTTP at `http://localhost:5173` (camera APIs may require HTTPS or localhost).
