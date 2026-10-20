# Revamp · Fix · Secure — Notes

**Project:** TanStack Ekraf Dashboard (TanStack Start + Better Auth, in-memory, no database)
**Branch:** `feat/revamp-fix-secure`

This document covers what changed for each task, **what I broke and how I fixed it**, and — for every
security enhancement — the attack it prevents.

---

## 0 · TL;DR

| Task | Status | Evidence |
|---|---|---|
| A · UI revamp (≥3 pages) | Done | Sidebar shell, revamped Home / Login / Dashboard, modal CRUD, image input, responsive, loading/empty/error states |
| B · Fix errors | Done | `bun run lint` exit 0 (Biome clean), `bunx tsc --noEmit` exit 0, `bun run build` exit 0, all routes manually tested |
| C · Security (≥2, one per column) | Done | 4+ enhancements across both columns, plus all listed bonuses |

---

## 1 · What I broke and how I fixed it

While converting product create/edit/delete from dedicated pages into modals on the list page, I
introduced a **silent table-sorting regression**: clicking a column header flipped the sort arrow but
the rows never reordered. The root cause was that TanStack Table **v9** no longer applies sorting
implicitly — the sorting *state* was tracked, but I had not registered the `sortedRowModel` capability,
so the table rendered the raw, unsorted `data`. I fixed it by adding `createSortedRowModel()` (and the
`sortFns` registry) to the `tableFeatures({...})` call, after which sorting applied again. I also
briefly left a **stale route tree** after deleting the `/demo` and `/about` routes (TanStack Router's
generated `routeTree.gen.ts` still referenced them, producing broken links and type errors); running
`bunx tsr generate` regenerated it cleanly. Finally, the new shared sanitizer tripped Biome's
`noControlCharactersInRegex` because I had written the control-character range literally; I replaced it
with the Unicode property escape `/\p{Cc}/gu`, which is both correct and lint-clean.

---

## 2 · Task A — UI Revamp

**Pages revamped (≥3):** Home (`/`), Login (`/login`), Dashboard (`/dashboard`), plus a full rebuild of
Products (`/products`) and Users (`/users`) and the one-time Setup page.

- **Sidebar shell** — the `_admin` pathless layout route renders `DashboardShell`: a sidebar with
  `lucide-react` icons per item (Dashboard / Products / Users), a collapsible desktop rail, and a
  slide-in **hamburger drawer** on mobile. Sign-out lives in the sidebar footer.
- **Modal-driven CRUD** — `ProductFormModal` and `UserRoleModal` are built on the shadcn `ui/dialog.tsx`
  primitive, with inline validation messages, `aria-invalid` wiring, a spinner/disabled submit state,
  and a working Cancel. Deletes go through a reusable `ConfirmDialog` that names the target and warns
  the action is permanent.
- **Login page** — a centered, on-brand card (logo mark, title, subtitle, subtle border/shadow) that
  works in dark mode via the existing `ThemeToggle`. Wrong credentials surface a clear inline alert;
  already-signed-in users are redirected to `/dashboard` in `beforeLoad`.
- **Removed scaffold & demo routes** — deleted `src/routes/about.tsx` and `src/routes/demo/`
  (`/demo/better-auth`), deleted the old page-based `products/*` and `users/*` routes, and regenerated
  `routeTree.gen.ts`. `Header`, `Footer`, `__root.tsx`, and the Better-Auth header widget no longer
  link to any dead route; the admin/login areas render bare chrome (no marketing header/footer).
- **Product image input** — the product modal accepts a **file upload or URL** with a live preview.
  The client downscales/rejects anything over **512×512 px** (and 512 KB) before saving, and the server
  re-validates the bytes and real PNG/JPEG/WebP dimensions (see §4).
- **Responsive** — no desktop-only tables: each data page renders a sortable table at `md+` and a
  stacked card list below `md`. Verified rendering at ~912 px width.
- **Consistent design** — shared `PageHeader`, `island-shell`/token-based colors, and the existing
  Tailwind + shadcn `ui/` components only (no framework swap).
- **States** — every data page has explicit loading (skeletons/spinners), empty, and error states, and
  query failures render an inline error with a retry affordance.

## 3 · Task B — Fix Errors

- **`bun run lint` passes (exit 0).** Fixed the scaffold lint debt: `styles.css` import ordering and
  `background` shorthand, `slider.tsx` array-index key, and the static theme `<script>` in
  `__root.tsx` (`dangerouslySetInnerHTML`) with a scoped Biome ignore. My own files lint clean.
- **Product form inputs rejected keystrokes.** The modal form was reading form state without
  subscribing to field changes, so each keystroke was swallowed and the input snapped back. Rewrote the
  fields to use TanStack Form's `form.Field` **render-prop subscription**, so every keystroke updates
  state and persists. Verified by typing into all four fields ("Hi" → "Hi there").
- **`bun run build` succeeds (exit 0).** Only harmless Rolldown `[MODULE_LEVEL_DIRECTIVE]` warnings from
  `@radix-ui/*`'s `"use client"` banners remain (third-party, non-blocking).
- **All routes manually tested:** `/`, `/login`, `/setup` render publicly; `/dashboard`, `/products`,
  `/users` 307-redirect to `/login` when signed out; `/demo/better-auth` and `/about` now 404; `/setup`
  is idempotent; wrong password → 401 → inline error; correct password → `/dashboard`.

## 4 · Task C — Security Enhancements

> Rule applied everywhere: **the client is untrusted.** Validate and authorize again on the server.

### Auth / access control column

1. **Authorization on every mutation.** `createProduct`, `updateProduct`, `deleteProduct`,
   `updateUserRole`, `deleteUser`, and the protected reads (`getUsers`, `getAuditLog`) all call
   `requireAdmin()` / `requireAuth()`, which resolve the session server-side from the request headers.
   *Prevents:* a signed-out or non-admin user calling the server-function endpoints directly (e.g. with
   `curl` or devtools) to read or mutate data — the guard is on the server, not just in the route UI.
2. **Self-role-demotion and self-deletion are blocked** (server rejects with 400; the UI additionally
   disables the controls and explains why).
   *Prevents:* an admin accidentally locking themselves out or quietly losing privileges — and the
   confusing state where the UI still shows admin chrome while every write is rejected.
3. **Login rate limiting.** Better Auth's built-in limiter throttles `/sign-in/email` and
   `/sign-up/email` to **10 requests / 60 s per IP** (300/min overall), returning HTTP 429.
   *Prevents:* credential brute-forcing and credential-stuffing floods against the sign-in endpoint.
4. **Last-administrator protection.** Demoting or deleting the only remaining admin is rejected.
   *Prevents:* a permanent lockout where no account can administer the app.

### App hardening column

5. **Server-side Zod validation on every server function.** Each server function declares a `.validator()`
   schema (string lengths, coerced numbers with min/max, enums, image rule) that runs before the handler.
   *Prevents:* tampered or malformed payloads bypassing client checks — e.g. negative prices, oversized
   fields, or arbitrary role strings — from reaching storage.
6. **No `dangerouslySetInnerHTML` with user content.** The only remaining use is the static, build-time
   theme-restore script in `__root.tsx` (Biome-ignored, no interpolation). All user-entered text is
   rendered as text.
   *Prevents:* stored XSS via product names/descriptions.
7. **No secrets in code or git.** `BETTER_AUTH_SECRET` and the optional seed credentials come only from
   the environment (`.env.local`, gitignored via `*.local`; the seed email/password read from
   `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`). `.env.example` ships placeholders with the seed values
   commented out.
   *Prevents:* leaking the session-signing secret or the default admin password through the repository.
8. **Hardened session cookies.** `httpOnly: true`, `sameSite: "lax"`, an explicit `path`, `secure` +
   `__Secure-` prefix in production, plus a **1-day session timeout** with hourly refresh.
   *Prevents:* session theft via JS (`document.cookie`) and cross-site request forgery, and limits the
   blast radius of a stolen cookie.

### Bonus items included

- **Field sanitization** — `sanitizeText` strips Unicode control characters and `<`/`>` and collapses
  whitespace before storing product fields (defence-in-depth against stored XSS). *Prevents:* markup
  injection if a value is ever rendered as HTML.
- **Admin audit log** — `logAudit` records actor, action, target, detail, and time for every admin
  write (bounded to the most recent 200 entries), exposed admin-only via `getAuditLog`.
  *Prevents:* untraceable privileged actions and gives an after-the-fact investigation trail.
- **Strict image validation** — `validateImageValue` accepts only `http(s)` URLs or base64 **raster**
  data URLs (PNG/JPEG/WebP/GIF), capped at 512 KB and 512×512 px, with real header-byte dimension
  parsing. SVG is rejected. *Prevents:* script-bearing SVG payloads and oversized inline blobs.
- **CSRF/origin checks left enabled** — `disableCSRFCheck: false` and `disableOriginCheck: false` in the
  Better Auth config. *Prevents:* cross-site form submissions authenticated by the victim's cookie.
- **Password length policy** — 8–128 characters enforced by Better Auth. *Prevents:* trivially short
  passwords.

---

## 5 · How to run & verify

```bash
bun install
cp .env.example .env.local     # set BETTER_AUTH_URL + BETTER_AUTH_SECRET
bun dev                        # http://localhost:3000
```

1. Visit `/setup` → **Seed Admin Account** (creates `admin@example.com` / `admin12345` + 3 sample
   products; safe to run twice).
2. Sign in at `/login`.
3. Explore `/dashboard`, `/products` (sort, create/edit/delete via modals, image upload), `/users`
   (change role, blocked self-role/self-delete, delete confirm).

Checks: `bun run lint` (Biome clean), `bunx tsc --noEmit` (clean), `bun run build` (passes).

---

## 6 · Known limitations (out of scope by design)

- **No persistent database** — data is in memory and resets on restart/redeploy; rate-limit counters and
  the audit log are likewise per-process.
- **Seeding signs the caller in** — Better Auth's sign-up `Set-Cookie` is forwarded by the server
  function response; convenient for local setup, but a non-issue only because `/setup` is a one-time
  dev tool.
- The seed credentials intentionally default to `admin@example.com` / `admin12345` for local use; set
  `SEED_ADMIN_*` (or disable `/setup`) before deploying anywhere real.
