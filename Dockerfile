# syntax=docker/dockerfile:1
# ──────────────────────────────────────────────────────────────────────────
# caramel-app production image — one-root-compose (F-016).
# Context = repo root. Multi-stage turbo-prune build. Local, CI and prod all
# build + run this exact file (as one platform compose service), so behaviour
# is identical everywhere. next.config.mjs emits `output: 'standalone'`.
# ──────────────────────────────────────────────────────────────────────────

# ---- base: pinned node + the EXACT pnpm from package.json packageManager ----
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# Heavy/optional postinstalls that the app build does not need (and which would
# fail or bloat the image in a network-restricted layer).
ENV HUSKY=0
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# ---- pruner: reduce the monorepo to the caramel-app subgraph ----
FROM base AS pruner
WORKDIR /app
COPY . .
# Pinned turbo (never floating) — deterministic prune.
RUN pnpm dlx turbo@2.5.4 prune caramel-app --docker

# ---- builder: install pruned deps, generate the Prisma client, build ----
FROM base AS builder
WORKDIR /app
# Lockfile + package.json layer first so `pnpm install` caches across source edits.
COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
# Full pruned source.
COPY --from=pruner /app/out/full/ ./

# Build-time NEXT_PUBLIC_* — every var env.client.ts reads. Defaults are
# LOCAL-SAFE or EMPTY only; NEVER a production identifier (public repo). Deploy
# platforms pass real values via --build-arg. env.client.ts never throws on a
# missing/empty public var, so empty defaults are safe.
ARG NEXT_PUBLIC_BASE_URL=http://localhost:58000
ARG NEXT_PUBLIC_SENTRY_DSN=
ARG NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=
ARG NEXT_PUBLIC_API_ENCRYPTION_ENABLED=
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=$NEXT_PUBLIC_GOOGLE_ANALYTICS_ID
ENV NEXT_PUBLIC_API_ENCRYPTION_ENABLED=$NEXT_PUBLIC_API_ENCRYPTION_ENABLED
# Prod build: next.config.mjs only wraps Sentry when NODE_ENV=production.
ENV NODE_ENV=production
# Build-time-only placeholders: next build's page-data collection imports
# route modules, and env.ts eagerly zod-parses at import. These THREE keys are
# the schema's required set; the values are never read by the running
# container (the runner stage inherits no builder env — runtime env comes from
# compose environment/env_file, and instrumentation.ts re-validates the REAL
# env at boot, so fail-fast is intact). The .invalid TLD is reserved and
# unresolvable, so any accidental build-time DB connection fails loudly
# instead of silently reaching a real database.
ENV DATABASE_URL=postgresql://build-placeholder:build-placeholder@db.build-placeholder.invalid:5432/build_placeholder
ENV COUPONS_DATABASE_URL=postgresql://build-placeholder:build-placeholder@db.build-placeholder.invalid:5432/build_placeholder
ENV BETTER_AUTH_SECRET=build-placeholder-not-a-secret
# caramel-app's `build` script is `npx prisma generate && next build`, so the
# Prisma client is generated here explicitly (musl engine, same platform as the
# runner) before the standalone trace.
RUN pnpm exec turbo run build --filter=caramel-app

# Stage a self-contained Prisma CLI + engines for the runner's boot-time
# `migrate deploy`. prisma is a caramel-app devDependency, so pnpm links it
# under the WORKSPACE's node_modules (apps/caramel-app/node_modules), NOT the
# monorepo root — and those links point into the virtual store, so `cp -RL`
# dereferences to real files that survive the cross-stage COPY.
RUN mkdir -p /prisma-cli/node_modules \
  && cp -RL apps/caramel-app/node_modules/prisma /prisma-cli/node_modules/prisma \
  && cp -RL apps/caramel-app/node_modules/@prisma /prisma-cli/node_modules/@prisma

# ---- runner: minimal standalone server; migrate then serve ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Standalone server bundle (real, traced node_modules incl. @prisma/client +
# query engine). outputFileTracingRoot = monorepo root, so the app lands under
# apps/caramel-app/ inside the standalone tree.
COPY --from=builder --chown=nextjs:nodejs /app/apps/caramel-app/.next/standalone ./
# Static assets + public are not part of the standalone bundle.
COPY --from=builder --chown=nextjs:nodejs /app/apps/caramel-app/.next/static ./apps/caramel-app/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/caramel-app/public ./apps/caramel-app/public
# Prisma schema + migrations for `migrate deploy`.
COPY --from=builder --chown=nextjs:nodejs /app/apps/caramel-app/prisma ./apps/caramel-app/prisma
# Prisma CLI + engines (merged into the traced node_modules).
COPY --from=builder --chown=nextjs:nodejs /prisma-cli/node_modules ./node_modules
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
