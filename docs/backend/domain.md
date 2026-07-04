# Domain model

Reference: [../reference/handoff.md](../reference/handoff.md) for the source
data and behaviors.

## Aggregate: Trip

`Trip` is the aggregate root. It owns members, days, stops, and expenses, and
enforces all invariants. External code references a trip by id and mutates it
only through aggregate methods.

### Contained entities / value objects

- **TripMember** — `{ id, name, shortName, initials, avatarBg, avatarFg,
  isCurrentUser }`.
- **TripDay** — `{ number, dateLabel, city, color }`.
- **Stop** (entity) — `{ id, day, time, duration, name, area, category,
  lat, lng, cost, createdBy, transit, votes: MemberId[], comments: Comment[],
  order }`.
- **Comment** (value object) — `{ author, timeLabel, text }`.
- **Expense** (entity) — `{ id, description, payer, amount, participants,
  whenLabel }`.
- **Money** (value object) — integer minor units + currency (JPY); formats as
  `¥` + grouped integer.
- **SettlementPlan** (value object) — the computed transfers.

## Business rules

- **toggleVote(stopId, memberId)** — add the member to the stop's votes if
  absent, else remove. Idempotent per member.
- **addComment(stopId, memberId, text)** — trimmed non-empty text is appended
  as a `Comment`; empty text is rejected.
- **insertStop(day, index, draft)** — inserts a stop at a position within a
  day. Coordinates interpolate from neighbors, or fall back to the day center.
  Ordering is preserved across the whole trip.
- **addExpense(draft)** — requires a positive amount, a payer, and >= 1
  participant; split is equal across participants.
- **balances()** — for each member, `paid - fairShare` where `fairShare` sums
  `amount / participants.length` over expenses they participate in.
- **settlement()** — greedy match: sort debtors and creditors by magnitude and
  transfer `min(debt, credit)` until cleared, producing the minimal transfer
  set. Matches the prototype algorithm.

## Repository ports

Defined in `domain/trip/ports`:

- `TripRepository` — `findSummaries()`, `findById(id)`, `save(trip)`.

One repository per aggregate. Adapters live in `infrastructure/persistence`.

## Determinism

Money math uses integers (JPY has no minor unit here); no floating-point money
is persisted. Settlement rounding matches the prototype (`Math.round`).
