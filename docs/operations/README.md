# Operations

## Local development

```bash
make install          # once
make dev              # start web + api together
```

`make dev` creates `apps/api/.env` from `apps/api/.env.example` if missing, then
runs both dev servers in parallel:

- **web** — Vite on http://localhost:5173 (proxies `/api` to the API).
- **api** — Hono via `tsx watch` on http://localhost:8787 (loads `apps/api/.env`).

A reachable PostgreSQL is required for API calls; the quickest option is the
Docker Postgres:

```bash
docker compose -f deploy/docker/compose.yaml up -d postgres
pnpm db:migrate && pnpm db:seed
```

Run a single side with `make dev-web` or `make dev-api`.

## Local verification

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm docs:check
```

`make check` runs typecheck + lint + test + build. Dev servers are intentionally
not part of automated verification.

## Environment variables

| Variable | Used by | Notes |
| --- | --- | --- |
| `DATABASE_URL` | api (Node/Docker) | Postgres connection string |
| `BETTER_AUTH_SECRET` | api | >= 32 chars |
| `BETTER_AUTH_URL` | api | public API base URL |
| `TRUSTED_ORIGINS` | api | comma-separated web origins |
| `VITE_API_BASE_URL` | web build | API origin for the SPA |

On Cloudflare, `DATABASE_URL` is replaced by the Hyperdrive binding; secrets are
set with `wrangler secret`.

## Common commands

| Command | Purpose |
| --- | --- |
| `pnpm db:migrate` | apply SQL migrations |
| `pnpm db:seed` | load prototype seed data |
| `make help` | list Make targets |

## Deployment

- Cloudflare (Pages + Workers + Hyperdrive): [cloudflare.md](cloudflare.md).
- Docker Compose (postgres + api + web): [docker.md](docker.md).

## Logs and backup

- Cloudflare: Workers Logs (observability enabled in `wrangler.api.jsonc`),
  `wrangler tail` for live logs.
- Docker: `docker compose logs -f api`; Postgres backup via `pg_dump` (see
  [docker.md](docker.md)).
