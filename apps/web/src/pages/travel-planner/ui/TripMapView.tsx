import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Trip } from "@/entities/trip";
import { dayColor } from "@/entities/trip";
import { TripMap, type MapStop } from "@/shared/ui/map";

export function TripMapView({
  trip,
  numbers,
  day,
  activeStopId,
  onSelectStop,
}: {
  trip: Trip;
  numbers: Map<string, number>;
  day: number;
  activeStopId: string | null;
  onSelectStop: (id: string) => void;
}) {
  const { t } = useTranslation("planner");
  const { t: tc } = useTranslation("common");

  const stops = useMemo<MapStop[]>(
    () =>
      trip.stops.map((s) => ({
        id: s.id,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        day: s.day,
        color: dayColor(trip, s.day),
        num: numbers.get(s.id) ?? 0,
        transit: s.transit,
      })),
    [trip, numbers],
  );

  return (
    <div className="relative size-full">
      <TripMap
        stops={stops}
        day={day}
        activeStopId={activeStopId}
        onSelectStop={onSelectStop}
        unavailableLabel={tc("state.error")}
      />
      {day === 0 ? (
        <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 rounded-xl border border-border bg-card/90 p-3 shadow-md backdrop-blur-sm">
          {trip.days.map((d) => (
            <div key={d.number} className="flex items-center gap-2 text-xs">
              <span
                className="size-2.5 flex-none rounded-full"
                style={{ background: d.color }}
              />
              <span className="font-medium">
                {t("days.day", { n: d.number })}
              </span>
              <span className="text-muted-foreground">{d.city}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
