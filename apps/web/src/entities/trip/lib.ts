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
