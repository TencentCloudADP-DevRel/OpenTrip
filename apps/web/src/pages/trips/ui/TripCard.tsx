import { useTranslation } from "react-i18next";
import type { TripSummary } from "@/entities/trip";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib";

const STATUS_VARIANT = {
  active: "brand",
  planning: "warning",
  settled: "success",
} as const;

export function TripCard({
  trip,
  index,
  onOpen,
}: {
  trip: TripSummary;
  index: number;
  onOpen: () => void;
}) {
  const { t } = useTranslation("trips");

  return (
    <Card
      className="wf-enter group cursor-pointer overflow-hidden p-0 transition-[box-shadow,transform] duration-150 ease-[var(--ease-out)] hover:shadow-md active:scale-[0.99]"
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div
        className="h-24 w-full"
        style={{
          background: `linear-gradient(135deg, ${trip.coverColor}, color-mix(in srgb, ${trip.coverColor} 55%, #141a30))`,
        }}
      />
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-[-0.01em]">
            {trip.title}
          </h2>
          <Badge variant={STATUS_VARIANT[trip.status]}>
            {t(`status.${trip.status}`)}
          </Badge>
        </div>
        <p className="font-mono text-sm text-muted-foreground tabular-nums">
          {t("card.dates", { start: trip.startLabel, end: trip.endLabel })}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {t("card.members", { count: trip.memberCount })}
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            {t("card.stops", { count: trip.stopCount })}
          </span>
        </div>
        <span
          className={cn(
            "mt-1 text-sm font-medium text-corn-600 transition-transform duration-150",
            "group-hover:translate-x-0.5",
          )}
        >
          {t("card.open")} →
        </span>
      </div>
    </Card>
  );
}
