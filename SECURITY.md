# Security policy

## Reporting a vulnerability

Email the maintainer via the contact address on [bodytoolkit.fit](https://bodytoolkit.fit) or open a **private** GitHub security advisory on this repository once it is public.

Please do not open public issues for undisclosed security problems.

## What must never be committed

- `.env`, `.env.local`, or any file containing API keys, OAuth tokens, or private keys
- TLS private keys (`*.key`, `conf/certs/*.key`)
- Customer or client personal data exports

Use [`.env.example`](.env.example) for variable names only. Production values stay in Vercel (or your host) environment settings.

## Automated checks

Pull requests run build and secret scanning (see `.github/workflows/ci.yml`).

## Scope

This repository is the public web application. Private backoffice tooling is not published here.
