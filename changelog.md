# Prefect — Changelog

> All changes to this project must be documented here.
> Format: `[YYYY-MM-DD] — File(s) — Description`

---

## [2026-06-25] — Response 2: Types, Generators, API Client

### Added

- `apps/web/src/types/index.ts`
  - `ARTIFACT_TYPES` exported as `as const` array — single source of truth for the union type
  - `ArtifactType` derived from the array (no manual union that could drift)
  - `ARTIFACT_LABELS` map for human-readable display strings
  - `Submission`, `SubmissionInput` interfaces mirroring the Worker exactly
  - `GeneratedArtifact` interface: `{ filename, content, mimeType }` — return type for all generators
  - `SubmissionsListResponse`, `SubmissionResponse` — typed API response shapes

- `apps/web/src/lib/generators.ts`
  - `generateMarkdown(s)` — full Markdown document with header block, fenced content; triple-backtick sequences escaped to prevent fence breakage
  - `generateJSON(s)` — pretty-printed `JSON.stringify` of the full Submission
  - `generatePlainText(s)` — separator-delimited plain text export
  - `generateAll(s)` — returns all three formats in one call
  - `downloadArtifact(artifact)` — Blob + object URL download; URL revoked after 100ms to prevent memory leaks
  - `copyToClipboard(artifact)` — async Clipboard API with try/catch; returns `boolean` so UI can show fallback

- `apps/web/src/lib/api.ts`
  - `ApiError` class with `status: number` — distinguishes network errors (status 0) from HTTP errors
  - `request<T>()` — internal fetch wrapper; catches network throws, checks `response.ok`, normalizes error messages
  - `createSubmission(input, signal?)` — POST /api/submissions
  - `listSubmissions(params?)` — GET /api/submissions with type/limit/cursor query params
  - `getSubmission(id, signal?)` — GET /api/submissions/:id
  - `healthCheck(signal?)` — GET /api/health
  - All functions accept optional `AbortSignal` for request cancellation

### Architecture Notes
- `generators.ts` has zero imports from `api.ts` — no circular dependency possible
- Base URL is always `/api` (relative) — works in Vite dev proxy and Cloudflare Pages production
- `ARTIFACT_TYPES as const` + derived union is the canonical DRY pattern for this codebase

---

## [2026-06-25] — Response 1: Initial Scaffold

### Added
- `changelog.md` — project changelog
- `apps/web/package.json` — Vite + React + TypeScript + shadcn/ui + Tailwind CSS v4
- `workers/api/package.json` — Cloudflare Worker (Hono + TypeScript)
- `workers/api/wrangler.toml` — Wrangler config with KV namespace bindings
- `workers/api/src/index.ts` — Full Hono API
- `apps/web/vite.config.ts` — Vite config with aliases, Tailwind v4 plugin, dev proxy
- `apps/web/tsconfig.json` — Strict TypeScript 5.7

### Architecture
- Frontend: Vite + React 19 + TypeScript + shadcn/ui + Tailwind CSS v4 → Cloudflare Pages
- Backend: Cloudflare Worker (Hono) → no auth, username-only identity
- Storage: Cloudflare KV, dual-indexed by `id:` and `type:`
- KV namespace IDs: placeholder until `wrangler kv:namespace create` is run

### Upcoming (Next Response)
- `apps/web/index.html` — Vite HTML entry point
- `apps/web/src/main.tsx` — React + router bootstrap
- `apps/web/src/App.tsx` — Root component with route definitions
