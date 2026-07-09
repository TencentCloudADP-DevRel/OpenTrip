# Trip endpoints

Unless noted, success body is `{ "data": … }` and the tables describe the **payload inside `data`**.

## Trips

### `GET /api/trips`

- **Auth:** session  
- **Response:** `TripSummary[]` — trips the user may see (member of, plus
  legacy/demo). See [TripSummary](./dtos.md#tripsummary).

### `POST /api/trips`

- **Auth:** session  
- **Status:** `201`  
- **Body:**

| Field | Type | Rules |
| --- | --- | --- |
| `title` | string | trim, 1–120 |
| `currency` | string? | optional ISO-ish code, 1–8 chars |

- **Response:** full [`TripDto`](./dtos.md#tripdto-full-trip) (owner is first member).

### `GET /api/trips/:id`

- **Auth:** session + member (`404` if not)  
- **Response:** [`TripDto`](./dtos.md#tripdto-full-trip)

### `PATCH /api/trips/:id`

- **Auth:** session + edit  
- **Body:** `{ title: string }` (trim, 1–120)  
- **Response:** [`TripDto`](./dtos.md#tripdto-full-trip)

---

[← API index](./README.md) · [Route index](./routes.md) · [DTOs](./dtos.md)
