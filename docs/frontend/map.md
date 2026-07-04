# Map (mapcn / MapLibre)

Reference: [../reference/frontend-sources.md](../reference/frontend-sources.md).
The wrapper lives at `apps/web/src/shared/ui/map` and reproduces the prototype's
`trip-map.js` behavior with a mapcn-style React API on top of `maplibre-gl`.

## Component API

```tsx
<TripMap
  stops={stops}         // MapStop[]
  day={day}             // 0 = all days, or 1..N
  activeStopId={id}     // focused stop
  showLegend
  onSelectStop={(id) => ...}
/>
```

`MapStop`: `{ id, name, lat, lng, day, color, num, transit }`.

## Behavior

- **Basemap**: CARTO positron GL style (free, light).
- **Markers**: circular numbered pins colored by day; `transit` stops render as
  rounded squares. Hover scales up; the active stop scales further with a
  cornflower ring.
- **Routes**: one line per day (white casing + colored line) connecting that
  day's stops in order.
- **Focus**: selecting a stop flies to it and opens a name popup.
- **Fit**: when no stop is active, the map fits bounds to the visible stops.
- **Day filter**: `day = 0` shows all; otherwise only that day's stops/routes.
- **Selection event**: clicking a marker calls `onSelectStop(id)`.

## Loading and failure

- `maplibre-gl` is loaded with the app bundle; its CSS is imported once.
- If the style/tiles fail (e.g. offline), the container shows a muted
  "Map unavailable offline" message instead of a blank canvas — no silent
  fallback that hides the failure.

## Data source

The planner passes stops from the trip API, colored per day. Coordinates and
day colors match the seed data described in
[../backend/domain.md](../backend/domain.md).
