# Prefect — Changelog

> All changes to this project must be documented here.
> Format: `[YYYY-MM-DD] — File(s) — Description`

---

## [2026-06-25] — Response 3: HTML Entry, CSS Tokens, React Bootstrap, App Shell, SPA Redirect

### Added

- `apps/web/index.html`
  - `lang="en"` + `data-theme="light"` on `<html>` (WCAG 3.1.1; theme set before JS to prevent flash)
  - Single Fontshare CDN request: Cabinet Grotesk (400,500,700,800) + Satoshi (400,500,700)
  - Inline `<style>` for `.skip-link` — painted before any bundle loads, revealed only on `:focus` (WCAG 2.4.1)
  - `<script type="module" src="/src/main.tsx">` with leading slash (Vite root-relative)

- `apps/web/src/index.css`
  - `@import "tailwindcss"` — Tailwind v4 syntax (NOT v3 directives)
  - Full Nexus design token set: surfaces, text levels, primary teal, semantic colors, radius, spacing, fluid type scale, fonts, motion, shadows, layout widths
  - `[data-theme="dark"]` block with complete dark mode overrides
  - `@media (prefers-color-scheme: dark) { :root:not([data-theme]) }` system-preference fallback
  - **shadcn/ui CSS variable bridge** in both light and dark: maps `--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`, `--popover` to Nexus tokens so shadcn components and custom components share one token system
  - Full base reset + `.page-shell` utility class for all route-level `<main>` elements

- `apps/web/src/main.tsx`
  - React 19 `createRoot` from `react-dom/client`
  - Hard error thrown if `#root` is missing (fails fast with a clear message)
  - `<StrictMode>` + `<BrowserRouter>` wrapping `<App />`
  - `index.css` imported before render to prevent FOUC

- `apps/web/src/App.tsx`
  - `useTheme()` hook: reads system preference on mount, writes `data-theme` attribute on `<html>` via `useEffect`, exposes `toggle` via `useCallback`
  - `Nav` component: sticky header, wordmark with Layers icon, `NavLink` active-state classes, theme toggle button with correct `aria-label`
  - Flat `<Routes>`: `/` BrowsePage, `/submit` SubmitPage, `/s/:id` DetailPage, `*` NotFoundPage
  - All stub pages render `<main id="main-content" className="page-shell">` — correct skip-link target
  - Footer with `role="contentinfo"`

- `apps/web/public/_redirects`
  - `/* /index.html 200` — Cloudflare Pages SPA routing; without this, direct `/s/:id` URLs return CF 404

### Architecture Notes
- `data-theme="light"` pre-set in HTML prevents dark flash on light-preference users before JS runs
- `useTheme` uses in-memory React state only (no localStorage — blocked in sandboxed iframes)
- shadcn bridge vars are set in both `:root/[data-theme="light"]` AND `[data-theme="dark"]` AND the system-pref fallback block

---

## [2026-06-25] — Response 2: Types, Generators, API Client

### Added
- `apps/web/src/types/index.ts` — `ARTIFACT_TYPES as const`, derived `ArtifactType` union, `ARTIFACT_LABELS`, `Submission`, `SubmissionInput`, `GeneratedArtifact`, response shapes
- `apps/web/src/lib/generators.ts` — `generateMarkdown`, `generateJSON`, `generatePlainText`, `generateAll`, `downloadArtifact` (with URL revocation), `copyToClipboard` (returns boolean)
- `apps/web/src/lib/api.ts` — `ApiError` class, `request<T>` wrapper, `createSubmission`, `listSubmissions`, `getSubmission`, `healthCheck` — all with optional `AbortSignal`

---

## [2026-06-25] — Response 1: Initial Scaffold

### Added
- `changelog.md`, `apps/web/package.json`, `workers/api/package.json`, `workers/api/wrangler.toml`
- `workers/api/src/index.ts` — Full Hono API (POST/GET submissions, health)
- `apps/web/vite.config.ts`, `apps/web/tsconfig.json`

### Upcoming (Next Response)
- `apps/web/src/pages/SubmitPage.tsx` — full submission form with validation, username input, type selector, tag input, content editor, live preview
- `apps/web/src/pages/BrowsePage.tsx` — paginated grid of submissions with type filter tabs
- `apps/web/src/pages/DetailPage.tsx` — single artifact view with Markdown/JSON/text export panel
