# Caramel Local Development Guide

## Port Range
Caramel uses the 58000-58010 range by default:
- Web App: `PORT=58000`
- Postgres: `PG_PORT=58005`
- Redis: `REDIS_PORT=58006`
- (Reserved) Worker: `WORKER_PORT=58002`
- (Reserved) Socket: `SOCKET_PORT=58003`
- (Reserved) Typesense: `TYPESENSE_PORT=58007`

Adjust values in `.env.ports` if you have conflicts.

## Workflow
1. Start infra only (no host ports):
```bash
pnpm compose
```
2. Start infra with exposed ports (DB tools etc.):
```bash
pnpm dev:compose
```
3. Run workspace apps in parallel:
```bash
pnpm dev
```

## Connecting
- Postgres (host): `postgresql://caramel:caramel_password@127.0.0.1:58005/caramel`
- Redis (host): `redis://127.0.0.1:58006`

Container-internal hostnames: `postgres`, `redis`.

## Troubleshooting
If ports are busy: modify `.env.ports` and run `pnpm compose:down && pnpm dev:compose`.
