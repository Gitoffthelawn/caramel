# Testing

How the suites are laid out, how to run each one locally, and which quality
rules are enforced by a failing check. The authoritative suite map is
`DESIGN.md` §5 (Testing map) + §Gates; this file is the operational companion —
it stays in sync with that table.

## Suite map

| Suite             | Location                                         | Runner                               | What it covers                                                       |
| ----------------- | ------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------- |
| App unit          | `apps/caramel-app/tests/unit/**/*.test.{ts,tsx}` | vitest (node env, jsdom per-file)    | env/schemas, `withRoute` pipeline, coupons repo/db, structural gates |
| Extension unit    | `apps/caramel-extension/tests/*.mjs`             | vitest + jsdom (`_load.mjs` harness) | content-script + popup + background behavior in one shared realm     |
| Coupons drift     | `apps/caramel-app/tests/drift/*.drift.ts`        | vitest (`vitest.drift.config.ts`)    | every registered coupons query run for real against a live DB        |
| E2E               | `apps/caramel-app/e2e/*.spec.ts`                 | Playwright (chromium)                | public pages, auth flows, extension-smoke, Argos visual regression   |
| Eval (LIVE, paid) | `apps/caramel-app/evals/**/*.eval.ts`            | vitest (`vitest.eval.config.ts`)     | cart-classifier against the LIVE model + production prompt           |

## Running locally

```bash
# Unit — app + extension (turbo). `--force` bypasses the turbo cache.
pnpm test
pnpm test --force
# One app unit file:
pnpm --filter caramel-app exec vitest run tests/unit/<file>.test.ts

# E2E — needs local Postgres up + migrations applied first:
#   pnpm dev:compose && pnpm --filter caramel-app db:migrate:deploy
pnpm --filter caramel-app test:e2e

# Coupons structural drift — needs a reachable COUPONS_DATABASE_URL. The public
# local setup has none, so it runs only where a real coupons DB exists (an
# internal local clone, or workflow_dispatch in CI) — DESIGN.md §2(j), §5.
pnpm --filter caramel-app check:coupons-schema

# Eval — LIVE OpenRouter calls, COSTS REAL MONEY. Needs OPENROUTER_API_KEY in
# apps/caramel-app/.env (loaded via Node's process.loadEnvFile). Red-proof
# variant (8 cases, still live): SCRAMBLE_EVAL=1 ... eval
pnpm --filter caramel-app eval
```

## Quality rules → enforcing check

Rules that matter carry a check that fails the build (CLAUDE.md "rules become
checks"), not just a note:

| Rule                                                          | Enforced by                                                                              |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| No `.only(` in any suite (it silently narrows a green run)    | `tests/unit/test-quality-guardrails.test.ts` (static) + Playwright `forbidOnly` (e2e CI) |
| No wall-clock sleeps in e2e (`waitForTimeout` / `setTimeout`) | `tests/unit/test-quality-guardrails.test.ts` — e2e specs wait on state, not the clock    |
| Eval `*.eval.ts` files never collected by the unit runner     | `tests/unit/eval-files-out-of-unit-glob.test.ts` + `vitest.config.ts` `exclude`          |
| Behavior-driven `describe`/`it` names (read as a spec line)   | convention (code review) — the existing suites model it                                  |
| Mocks announce themselves (a header/comment naming the mock)  | convention (code review); see e.g. `tests/unit/rateLimit.test.ts`                        |

Structural gates share the same fs-walk style and also live in
`tests/unit/`: `api-routes-use-withRoute.test.ts`, `prisma-schema-secrecy.test.ts`,
`no-raw-coupon-status.test.ts`, `repo-integrity.test.ts`.

## Local-run gotchas (repo truths)

- **E2E workers/retries.** `playwright.config.ts` applies `workers: 1,
retries: 2` and `forbidOnly` only under CI; locally it defaults to parallel
  workers + 0 retries and boots `pnpm dev` (reused if already running). For a
  stable run against a cold dev server, pass `--workers=1 --retries=2`.
- **No local coupons DB.** Coupon routes 500 with `{error}` and
  `/api/health/db` reports `coupons_db: "error"` locally — the expected honest
  degraded mode (DESIGN.md §2(j)), not a bug.
- **Windows EOL.** The byte-exact generated-constants test breaks on a fresh
  clone with `core.autocrlf=true` — run `git config core.autocrlf false` and
  re-checkout (no `.gitattributes` yet, NF-04).
- **`server-only` under vitest.** It throws in the test runtime; shimmed once
  in `tests/setup.ts`.
- **Unit env.** `vitest.config.ts` injects three dummy required vars
  (`DATABASE_URL`, `COUPONS_DATABASE_URL`, `BETTER_AUTH_SECRET`) so `env.ts`'s
  boot-time parse doesn't throw before any assertion runs.
- **Eval budget.** `openai/gpt-5-mini` is a reasoning model — its completion
  budget already accounts for hidden reasoning tokens (F-017); don't trim it.
