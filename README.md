# TanStack Ekraf Dashboard

A secure admin dashboard for an Ekraf (creative-economy) catalogue: **login → product CRUD →
user/role management**, built with TanStack Start + Better Auth.

> **No database by design.** Data lives in memory for the life of the server process and resets on
> every restart / redeploy / cold start. See [Seeding](#seeding) below.

## Stack

| Choice | Value |
|---|---|
| Framework | TanStack Start (React 19) |
| Router | TanStack Router (file-based, `src/routes`, `routeTree.gen.ts`) |
| Forms | TanStack React Form (`form.Field` render props) |
| Table | TanStack React Table v9 (`useTable`, `tableFeatures`, `sortedRowModel`) |
| Query | TanStack Query (`useQuery`) + SSR Query integration |
| Auth | Better Auth (`emailAndPassword`, `tanstackStartCookies`) |
| Styling | Tailwind CSS + shadcn UI |
| Database | none (Better Auth `memoryAdapter`) |
| Tooling | bun · Biome · Vercel (Nitro output) |

## Getting started

```bash
bun install
cp .env.example .env.local      # fill BETTER_AUTH_URL + BETTER_AUTH_SECRET
bun dev                         # http://localhost:3000
```

Required environment variables (see `.env.example`):

| Variable | Purpose | Required |
|---|---|---|
| `BETTER_AUTH_URL` | Public base URL of the app | Yes (dev: `http://localhost:3000`) |
| `BETTER_AUTH_SECRET` | Session/token signing secret (`bun x @better-auth/cli secret`) | Yes |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Override the one-time seed account | No (dev fallbacks) |

### Seeding

There is no persistent database. To create the administrator account and sample products:

1. Visit `/setup` and click **Seed Admin Account** (idempotent — safe to run twice).
2. Sign in at `/login` with `admin@example.com` / `admin12345` (or your `SEED_ADMIN_*` values).
3. Explore `/dashboard`, `/products`, and `/users`.

## Routes

| Route | Access | Description |
|---|---|---|
| `/` | public | Home / marketing page |
| `/login` | public | Sign in (redirects to `/dashboard` if already signed in) |
| `/setup` | public | One-time admin + sample-data seed |
| `/dashboard` | auth | Protected overview |
| `/products` | auth | Catalogue list; create/edit/delete via modals |
| `/users` | admin | User list; role changes and deletion via modals |
| `/api/auth/$` | public | Better Auth HTTP handler |

Admin pages live under the pathless `_admin` layout route (`src/routes/_admin/route.tsx`), which
enforces the session guard and renders the `DashboardShell` sidebar.

## Scripts

```bash
bun dev                # dev server on :3000
bun run lint           # Biome check
bun run format         # Biome format --write
bun run build          # production build (must pass)
bunx tsr generate      # regenerate routeTree.gen.ts after route changes
```

## Security

Every mutation is authorized server-side, every server function validates its input with Zod, login is
rate-limited, sessions use `httpOnly` / `sameSite=lax` cookies with a 1-day timeout, and admin writes
are recorded in an audit log. See [`NOTES.md`](./NOTES.md) for the full list and the attack each
control prevents.

## Deployment (Vercel)

1. Push the repo and import it in Vercel (TanStack Start is auto-detected; `vercel.json` is included).
2. Add `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET` under **Settings > Environment Variables**.
3. Deploy, then run `/setup` once against the deployment to recreate the admin + sample data.

Because the app is stateless, in-memory data is **per serverless instance**. For real production use,
add a persistent Better Auth adapter (Drizzle/Prisma/Kysely/Mongo) and a `DATABASE_URL`.
