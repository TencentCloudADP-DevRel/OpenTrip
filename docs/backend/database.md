# Database

PostgreSQL. Reference: [../reference/backend-sources.md](../reference/backend-sources.md).

## Connection

A single `pg.Pool` (`infrastructure/persistence/pool.ts`) backs both Better Auth
and the repositories.

- **Node/Docker**: pool from `DATABASE_URL`.
- **Cloudflare Workers**: pool from the Hyperdrive binding's `connectionString`
  (`env.HYPERDRIVE.connectionString`), with `nodejs_compat_v2` enabled.

## Migrations

Plain SQL files in `apps/api/migrations`, applied in filename order by
`pnpm --filter @wayfare/api migrate` (a small runner using `pg`). A
`schema_migrations` table records applied files.

- `0001_auth.sql` — Better Auth tables (`user`, `session`, `account`,
  `verification`).
- `0002_trips.sql` — business tables.

## Business schema

- `trips` — `id`, `title`, `start_date`, `end_date`, `status`, `currency`,
  `owner_id`. New trips store `start_date` as an ISO `YYYY-MM-DD` date so day
  calendar dates can be derived on the client; seed trips use descriptive labels.
- `trip_members` — `id`, `trip_id`, `name`, `short_name`, `initials`,
  `avatar_bg`, `avatar_fg`, `is_current_user`.
- `trip_days` — `trip_id`, `number`, `date_label`, `city`, `color`. `date_label`
  may be empty for date-derived trips; `POST /api/trips/:id/days` appends a row.
- `stops` — `id`, `trip_id`, `day`, `time`, `duration`, `name`, `area`,
  `category`, `lat`, `lng`, `cost`, `created_by`, `transit`, `note`,
  `sort_order`. `note` (added in `0004_stop_note.sql`) holds optional Markdown.
- `stop_votes` — `stop_id`, `member_id` (unique together).
- `stop_comments` — `id`, `stop_id`, `author_id`, `text`, `time_label`,
  `created_at`.
- `expenses` — `id`, `trip_id`, `description`, `payer_id`, `amount`,
  `when_label`, `created_at`.
- `expense_participants` — `expense_id`, `member_id` (unique together).

Amounts are stored as integers (JPY). `lat`/`lng` are `double precision`.

## Seed

`pnpm --filter @wayfare/api seed` loads the prototype dataset (4 members,
5 days, 22 stops, 8 expenses) into a demo trip owned by the demo user. Safe to
re-run (idempotent upserts by stable ids).

## Better Auth tables

Created by `0001_auth.sql` so the same schema applies to Docker Postgres and
Hyperdrive-fronted Postgres. If Better Auth options change, regenerate the SQL
with the Better Auth CLI and add a new migration — do not edit applied files.
See [auth.md](auth.md).
