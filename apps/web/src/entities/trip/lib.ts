import type { Stop } from "@/entities/stop";
import type { Trip, TripDay } from "./model";

/** Sequential per-day stop numbers, matching the prototype `numsForStops`. */
export function stopNumbers(stops: readonly Stop[]): Map<string, number> {
  const counts = new Map<number, number>();
  const nums = new Map<string, number>();
  for (const stop of stops) {
    const next = (counts.get(stop.day) ?? 0) + 1;
    counts.set(stop.day, next);
    nums.set(stop.id, next);
  }
  return nums;
}

/** Stops for a given day (0 = all days), preserving order. */
export function stopsForDay(stops: readonly Stop[], day: number): Stop[] {
  if (day === 0) return [...stops];
  return stops.filter((s) => s.day === day);
}

export function dayColor(trip: Trip, day: number): string {
  return trip.days.find((d) => d.number === day)?.color ?? "#3f6fc9";
}

export function findDay(trip: Trip, day: number): TripDay | undefined {
  return trip.days.find((d) => d.number === day);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Human calendar date for a given itinerary day, localized to `locale`.
 * Derived from the trip's ISO `startDate` offset by (number - 1) days; falls
 * back to the day's stored `dateLabel` when the trip has no machine date. */
export function dayDateLabel(
  trip: Trip,
  day: TripDay,
  locale: string,
): string {
  if (!ISO_DATE.test(trip.startDate)) return day.dateLabel;
  const [y, m, d] = trip.startDate.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const dt = new Date(Date.UTC(y, m - 1, d + (day.number - 1)));
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(dt);
}
