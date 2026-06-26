# Prefect — Changelog

> All changes to this project must be documented here.
> Format: `[YYYY-MM-DD] — File(s) — Description`

---

## [2026-06-25] — Response 4: Pages + CSS

### Added

- `apps/web/src/pages/SubmitPage.tsx`
  - Full submission form: username (pattern-validated), type selector (all `ARTIFACT_TYPES`), title + char-count, description, monospace content editor, `TagInput` component (Enter/comma to add, × to remove, 8 tag max)
  - Client-side validation: `validate()` produces typed `Errors` record; `aria-invalid` + `aria-describedby` wired to each field error message for full screen-reader support
  - Preview flow: on valid submit → `generateAll()` runs client-side → preview panel appears to the right (single column on mobile, 50/50 grid on ≥1024px)
  - Preview panel: tab bar (Markdown / JSON / Plain Text), syntax-highlighted `<pre>`, Copy (with "✓ Copied" feedback) + Download + Confirm & Submit actions
  - Post-submit: "done" splash → `setTimeout` redirect to `/s/:id` via `useNavigate`
  - All interactive elements have min-height 44px (WCAG 2.5.5)

- `apps/web/src/pages/BrowsePage.tsx`
  - Paginated, filterable grid of all submissions
  - `filter-bar` tab row: All + one button per `ARTIFACT_TYPE`; changing filter resets pagination, aborts in-flight request via `AbortController`
  - 8× `SkeletonCard` shimmer while loading first page
  - `ArtifactCard`: type badge, relative date, title, 2-line clamped description, author + tags in footer; entire card is a `<Link>` with descriptive `aria-label`
  - Empty state with document SVG + CTA to `/submit`
  - "Load more" cursor pagination (appends to existing items)
  - Error banner with Retry button

- `apps/web/src/pages/DetailPage.tsx`
  - Loads single submission via `getSubmission(id)` on mount; AbortController cleanup in `useEffect` return
  - Loading: inline skeleton matching header + content block proportions
  - Error / not-found: empty state with alert SVG + link back to browse
  - Breadcrumb nav (`Browse / [title]`) with `aria-current="page"`
  - Hero header: type badge, formatted date, h1 title, description, author, tag list
  - Raw content viewer: scrollable monospace `<pre>` block
  - `ExportPanel`: same preview tabs + Copy + Download as SubmitPage; artifacts generated from submission data via `generateAll()`

- `apps/web/src/pages/NotFoundPage.tsx`
  - Minimal 404 empty state with sad-face SVG and link home

- `apps/web/src/styles/pages.css`
  - Full component stylesheet: buttons (primary, ghost), form fields (input/select/textarea), tag chips, submit layout (1→2 col), preview/export panel, browse grid, artifact cards, skeleton shimmer, detail page, empty state, breadcrumb, filter bar
  - All sizing via CSS token variables (no hardcoded px outside `min()` expressions)
  - Responsive: mobile-first, breakpoints at 640px and 1024px
  - `@media (prefers-reduced-motion: reduce)` disables shimmer animation
  - WCAG touch targets enforced via `.btn` and field `min-height: 44px`

### Updated
- `changelog.md` — this entry

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
