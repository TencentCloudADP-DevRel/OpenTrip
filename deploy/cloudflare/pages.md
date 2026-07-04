# Pages (frontend)

The SPA is a static build (`apps/web/dist`) deployed to Cloudflare Pages.

## Build

The API origin is baked in at build time via `VITE_API_BASE_URL`:

```bash
VITE_API_BASE_URL="https://wayfare-api.<subdomain>.workers.dev" \
  pnpm --filter @wayfare/web build
```

## Deploy

```bash
wrangler pages deploy apps/web/dist --project-name wayfare-web
```

## SPA routing

The app uses history-based client routing. Add a `_redirects` file (already in
`apps/web/public`) so deep links resolve to `index.html`:

```
/*  /index.html  200
```

## CORS / auth

- Set the Worker var `TRUSTED_ORIGINS` to the Pages origin
  (e.g. `https://wayfare-web.pages.dev`).
- Set `BETTER_AUTH_URL` to the Worker origin.
- The SPA sends credentials; the API's CORS is configured from
  `TRUSTED_ORIGINS`.
