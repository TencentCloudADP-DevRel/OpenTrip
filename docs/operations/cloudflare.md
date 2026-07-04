# Cloudflare deployment

Pages (frontend) + Workers (API) + Hyperdrive (external PostgreSQL). Config
lives in [deploy/cloudflare](../../deploy/cloudflare/README.md). Reference:
[../reference/deployment-sources.md](../reference/deployment-sources.md).

## Prerequisites

- `wrangler` v4+ (`pnpm add -D wrangler` or use `npx wrangler`).
- `wrangler login`.
- An external PostgreSQL reachable from Cloudflare.

## 1. Hyperdrive

```bash
wrangler hyperdrive create wayfare-db \
  --connection-string "postgres://USER:PASSWORD@HOST:5432/DBNAME"
```

Copy the returned id into `deploy/cloudflare/wrangler.api.jsonc` under the
`hyperdrive` binding (`binding: "HYPERDRIVE"`). Details:
[deploy/cloudflare/hyperdrive.md](../../deploy/cloudflare/hyperdrive.md).

## 2. Migrate + seed

Run migrations against the same database (from a machine that can reach it):

```bash
DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/DBNAME" pnpm db:migrate
DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/DBNAME" pnpm db:seed
```

## 3. API (Workers)

```bash
cd deploy/cloudflare
wrangler secret put BETTER_AUTH_SECRET --config wrangler.api.jsonc
wrangler secret put BETTER_AUTH_URL --config wrangler.api.jsonc
wrangler check --config wrangler.api.jsonc
wrangler types --config wrangler.api.jsonc
wrangler deploy --config wrangler.api.jsonc
```

`wrangler.api.jsonc` sets `compatibility_flags: ["nodejs_compat_v2"]`, the
`HYPERDRIVE` binding, `observability.enabled`, and non-secret `vars`.

## 4. Frontend (Pages)

```bash
VITE_API_BASE_URL="https://<api-worker-domain>" pnpm --filter @wayfare/web build
wrangler pages deploy apps/web/dist --project-name wayfare-web
```

See [deploy/cloudflare/pages.md](../../deploy/cloudflare/pages.md).

## Secrets

Only key names are committed, in
[deploy/cloudflare/secrets.example.json](../../deploy/cloudflare/secrets.example.json).
Set real values with `wrangler secret put`. Set `TRUSTED_ORIGINS` (as a var) to
the Pages origin so auth CSRF checks pass.

## Rollback

```bash
wrangler rollback --config wrangler.api.jsonc
```

Pages: redeploy a previous build, or promote a prior deployment in the
dashboard.
