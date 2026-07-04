# API

Hono routes under `apps/api/src/interfaces/http`. Reference:
[../reference/backend-sources.md](../reference/backend-sources.md).

## Conventions

- Base path: `/api`. Auth: `/api/auth/*` (Better Auth).
- JSON only. Success envelope: `{ "data": <payload> }`.
- Error envelope: `{ "error": { "code": string, "message": string } }`.
- Status codes: `200` ok, `400` validation, `401` unauthenticated,
  `404` not found, `500` unexpected.
- Business routes require an authenticated session; unauthenticated -> `401`.
- Input is validated with `zod` at the edge before reaching a use case.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Liveness probe `{ data: { status: "ok" } }` |
| GET | `/api/trips` | List trip summaries |
| GET | `/api/trips/:id` | Full trip (members, days, stops, expenses, budget) |
| POST | `/api/trips/:id/stops` | Insert a stop `{ day, index, name, time }` |
| POST | `/api/trips/:id/stops/:stopId/vote` | Toggle current-user vote |
| POST | `/api/trips/:id/stops/:stopId/comments` | Add a comment `{ text }` |
| POST | `/api/trips/:id/expenses` | Add expense `{ description, amount, payer, participants }` |

## Budget payload

`GET /api/trips/:id` includes a computed `budget`:

```json
{
  "total": 470200,
  "perPerson": 117550,
  "balances": [{ "memberId": "lynn", "paid": 91200, "share": 117550, "net": -26350 }],
  "settlements": [{ "from": "lynn", "to": "sam", "amount": 26350 }]
}
```

Amounts are integer JPY. The frontend formats them; it does not recompute
settlement.

## Health

`GET /api/health` is used by Docker healthchecks and manual verification. It
does not require auth.
