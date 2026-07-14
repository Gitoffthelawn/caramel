# Caramel Local Development Guide

Caramel runs on **one root Docker Compose** (F-016). `pnpm dev` builds the app
image and boots the real service graph in prod-mode builds. This same
`docker-compose.yml` is the deployment unit production migrates onto (cutover
gated, human-run) — so what you run locally is what ships. Hot reload is
deliberately traded away for that parity (ratified 2026-07-09); use the
`pnpm dev:next` escape hatch below when you want framework hot reload.

## Quick start

```bash
pnpm install
cp apps/caramel-app/.env.example apps/caramel-app/.env   # fill in per the README secrets table
pnpm dev                                                  # docker compose up --build
```

`pnpm dev` (`docker compose up --build`):

- builds the `web` image from the root `Dockerfile` (Next.js standalone),
- boots **Postgres 18.4** and **web**,
- runs `prisma migrate deploy` automatically inside the web container at start
  (the entrypoint fail-hards if a migration fails),
- serves the app + API at **http://localhost:58000**.

There is no separate "apply migrations" step for the compose flow — the
container entrypoint does it. Stop everything with `Ctrl-C` (or
`docker compose down`); `docker compose down -v` also discards the local DB
volume.

## Services & ports

| Service    | Image           | Host port (default)        | Purpose                                             |
| ---------- | --------------- | -------------------------- | --------------------------------------------------- |
| `web`      | built locally   | `127.0.0.1:58000` → `3000` | Next.js app + API (`apps/caramel-app`)              |
| `postgres` | `postgres:18.4` | `127.0.0.1:58005` → `5432` | Auth DB (`caramel`) — owned + migrated by this repo |

No Redis service: rate limiting is in-memory single-instance by design (NF-13).
No coupons DB service: its schema is externally owned and deliberately absent
locally (see the degraded mode below).

### Deploy knobs (compose variables)

All optional — the defaults above apply when unset. Set them in your shell (or
the platform env) to override:

| Variable                                              | Overrides                                              |
| ----------------------------------------------------- | ------------------------------------------------------ |
| `BIND_HOST`                                           | Host bind address (default `127.0.0.1`, loopback-only) |
| `WEB_PORT` / `PG_PORT`                                | Host ports for web / postgres                          |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Postgres role + database name                          |

## Two env files — don't confuse them

| File                                | Committed?      | Contains                                                                     | Loaded by                                                                                            |
| ----------------------------------- | --------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `apps/caramel-app/.env`             | No (gitignored) | Real secrets, `DATABASE_URL`, `COUPONS_DATABASE_URL`                         | compose `env_file` (optional), Next.js's own `.env` loading, the Prisma CLI, `vitest.eval.config.ts` |
| `docker-compose.yml` `environment:` | Yes (tracked)   | **Topology only** — the in-container `DATABASE_URL` / `COUPONS_DATABASE_URL` | the `web` container at runtime (overrides the app `.env`'s localhost values)                         |

The compose `environment:` block points the in-container app at the `postgres`
**service** (`@postgres:5432`), overriding whatever `localhost:58005` value the
app `.env` ships. The app `.env`'s localhost values still serve the `pnpm
dev:next` escape hatch and host-side `prisma` / drift commands.

See the root [README.md](../README.md)'s **Getting Started** for how to create
`apps/caramel-app/.env` and what each variable is for — that table is the single
source of truth for secrets; this file doesn't repeat it.

## Escape hatches (run a package on the host)

`pnpm dev` is the source of truth. When you need framework hot reload or to run
one package directly:

```bash
# 1. Bring up ONLY Postgres (published on 127.0.0.1:58005, matching .env.example):
docker compose up postgres -d

# 2a. Web app on the host with hot reload (Next.js dev server on :58000):
pnpm dev:next            # = pnpm --filter caramel-app dev
#     First run / after new migrations, apply them against the compose Postgres:
pnpm --filter caramel-app db:migrate:deploy

# 2b. The browser extension in a web-ext Chromium instance:
pnpm dev:extension       # = pnpm --filter caramel-extension dev
```

`pnpm dev:next` reads `apps/caramel-app/.env` (whose `DATABASE_URL` points at
`localhost:58005`), so the single `docker compose up postgres -d` above is all
the infra it needs.

## Two-database topology

`caramel-app` talks to two separate Postgres databases:

| Database                       | Owner                                | Provisioned by this compose? | Migrated by                                                                |
| ------------------------------ | ------------------------------------ | ---------------------------- | -------------------------------------------------------------------------- |
| `caramel` (auth_db)            | This repo                            | Yes (the `postgres` service) | `prisma migrate` (entrypoint in-container, or `db:migrate:deploy` on host) |
| `caramel_coupons` (coupons_db) | External Python verification service | **No**                       | Not this repo's concern — read-only from here (`src/lib/couponsDb.ts`)     |

**`caramel_coupons` does not exist in local dev by default.** The compose never
provisions it — that's the expected, honest state for anyone without coupons-DB
access, not a bug to paper over (seeding a fake one would be a behaviour change,
and modelling its schema is forbidden by the secrecy forward-rule, DESIGN.md
§2(k)). If you have real access (a reachable read replica or tunnel — never
prod's primary directly), set `COUPONS_SOURCE_URL` in your gitignored
`apps/caramel-app/.env` and run:

```bash
pnpm --filter caramel-app coupons:clone-local
```

This `pg_dump`s `COUPONS_SOURCE_URL` into a local `caramel_coupons` on the same
compose Postgres (`scripts/internal/clone-coupons-local.sh`, itself gitignored
and env-driven — no schema/DDL/secret hardcoded in it). Without
`COUPONS_SOURCE_URL` access, stay in the degraded mode below — that's the
correct state, not something to work around.

### The honest degraded mode (DESIGN.md §2(j))

Following the documented setup verbatim, expect this, **not** an error in your
setup:

- `GET /api/health/db` (with `Authorization: Bearer $UPKUMA_HEALTH_SECRET`) →
  `503`, with `checks.coupons_db.status: "error"` and
  `checks.coupons_db.details: "database \"caramel_coupons\" does not exist"`.
  `checks.auth_db.status` reports `"ok"`.
- Any coupon-facing route (`GET /api/coupons`, `/api/coupons/stores`,
  `/api/coupons/filters`, `/api/extension/supported-stores`, the
  `/coupons/[store]` marketing page, …) → `500` with a `{"error": "..."}` body.
- Everything else — homepage, auth/signup/login, the marketing pages — works
  normally.

This isn't a boot failure: `COUPONS_DATABASE_URL` only has to be a non-empty
string to satisfy `src/lib/env.ts`'s startup validation. The Postgres
connection is lazy (the `postgres` client only connects on first query), so the
failure surfaces per-request, not at startup.

## Connecting

- Postgres (host): `postgresql://caramel:caramel_password@127.0.0.1:58005/caramel`
- Container-internal hostname: `postgres` (used by the `web` service).

`caramel` is the role the compose Postgres creates (`POSTGRES_USER: caramel`),
and it is exactly what `apps/caramel-app/.env.example` ships in
`DATABASE_URL`/`COUPONS_DATABASE_URL` — copy them as-is.

## Migrations

- **Compose flow:** applied automatically by the web container's entrypoint
  (`prisma migrate deploy`) on every `pnpm dev` / boot.
- `pnpm --filter caramel-app db:migrate:deploy` — apply committed migrations on
  the host (against the compose Postgres); the onboarding command for the
  `dev:next` escape hatch.
- `pnpm --filter caramel-app db:migrate` — `prisma migrate dev`; creates a
  shadow database and can prompt for a migration name. Only for authoring a
  **new** migration.
- `pnpm --filter caramel-app db:migrate:reset` — drops, recreates, reapplies.
  Destructive; a local-only escape hatch.

## Troubleshooting

- **Port already in use**: override the host port(s), e.g.
  `WEB_PORT=59000 PG_PORT=59005 pnpm dev`, or bind elsewhere with `BIND_HOST`.
- **Coupon routes return 500 / health check shows `coupons_db: error`**:
  expected in local dev — see the degraded mode above, not a bug in your setup.
- **`P1000: Authentication failed` connecting to `caramel`**: your `.env`'s
  `DATABASE_URL` still has placeholder credentials — see Connecting above.
- **`pnpm test` fails only on `coupon-constants.generated.test.ts`'s
  byte-identical check, on Windows, on a clone that predates `.gitattributes`**:
  `.gitattributes` pins `* text=auto eol=lf` (NF-04), so a fresh clone gets LF
  regardless of `core.autocrlf` and this failure can no longer happen there. A
  clone made before `.gitattributes` landed, with `core.autocrlf=true`, still
  has the committed (LF) generated file sitting as CRLF on disk while the
  test's live-generated value is LF. Renormalize:
  `git config core.autocrlf false && git checkout-index -a -f`
  (`git reset --hard` does NOT rewrite files whose conversion round-trips
  clean — `checkout-index` is the command that actually rewrites the working
  tree).
