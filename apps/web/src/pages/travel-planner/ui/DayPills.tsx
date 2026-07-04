import { useTranslation } from "react-i18next";
import type { Trip } from "@/entities/trip";
import { cn } from "@/shared/lib";

export function DayPills({
  trip,
  day,
  onDayChange,
}: {
  trip: Trip;
  day: number;
  onDayChange: (day: number) => void;
}) {
  const { t } = useTranslation("planner");
  const pills = [
    { n: 0, label: t("days.all") },
    ...trip.days.map((d) => ({ n: d.number, label: t("days.day", { n: d.number }) })),
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {pills.map((p) => {
        const active = day === p.n;
        return (
          <button
            key={p.n}
            type="button"
            aria-pressed={active}
            onClick={() => onDayChange(p.n)}
            className={cn(
              "h-7 flex-none rounded-full border px-3 text-xs font-medium transition-colors duration-150 active:scale-[0.96]",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
