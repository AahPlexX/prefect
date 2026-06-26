# Prefect — Changelog

> All changes to this project must be documented here.
> Format: `[YYYY-MM-DD] — File(s) — Description`

---

## [2026-06-25] — Initial Scaffold

### Added
- `changelog.md` — project changelog (this file; does not count against 3-file response limit)
- `apps/web/package.json` — Vite + React + TypeScript + shadcn/ui + Tailwind CSS v4 web app manifest
- `workers/api/package.json` — Cloudflare Worker API package manifest (Hono + TypeScript)
- `workers/api/wrangler.toml` — Cloudflare Wrangler config for Worker deployment with KV namespace bindings

### Architecture Decision
- **Frontend**: Vite + React 19 + TypeScript + shadcn/ui + Tailwind CSS v4 — deployed to Cloudflare Pages
- **Backend**: Cloudflare Worker (Hono framework) — handles submission POST/GET endpoints with no auth required
- **Storage**: Cloudflare KV — persists `.skills`, `.agents`, and future artifact types keyed by slug
- **Generators**: Client-side parsing utilities that produce copy-paste text, downloadable `.md`/`.json`/`.txt` artifacts from user submissions
- **Identity**: Username-only (no accounts, no sessions) — stored as submission metadata

### Upcoming (Next Response)
- `workers/api/src/index.ts` — full Hono API: POST /submissions, GET /submissions, GET /submissions/:id
- `apps/web/vite.config.ts` — Vite config with path aliases and Cloudflare Pages adapter
- `apps/web/tsconfig.json` — TypeScript project config
