# Frontend layers

Responsibilities and boundaries per FSD layer in `apps/web/src`.

## app

Application setup: providers (i18n, React Query, router), global style imports,
and the root render. No business logic. Files: `app/providers`, `app/styles`,
`app/router.tsx`, `app/App.tsx`.

## pages

Route-level compositions. A page reads routing/session data and composes
widgets and features. Two pages:

- `pages/trips` — the trips home grid.
- `pages/travel-planner` — the single-trip workspace. Because this is one large
  prototype surface, its map/schedule/budget/sidebar blocks live as
  **page-private widgets** under `pages/travel-planner/ui`.

Pages may hold page-specific state and data fetching (Pages First).

## widgets

Reusable composite blocks used by more than one page. Kept minimal in this
iteration; most planner blocks stay page-private until reuse emerges.

## features

Reusable, self-contained user scenarios (e.g. `features/auth` sign-in form).
UI + model + api for that scenario.

## entities

Reusable domain data and mapping with no transport logic. `entities/trip`,
`entities/stop`, `entities/expense`, `entities/member` hold TypeScript types and
pure helpers (formatting, grouping, balance math mirrored for display).

## shared

Framework-agnostic reused code:

- `shared/ui` — cossUI primitives + the map wrapper.
- `shared/api` — typed API client.
- `shared/auth` — Better Auth React client.
- `shared/i18n` — i18next setup and locale resources.
- `shared/lib` — utilities (class names, formatters).
- `shared/config` — env access, route/query keys.

## Import rule

Downward only. `entities` must not import `features`; slices on the same layer
must not import each other. Enforced by review and the alias structure.
