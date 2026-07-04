import { useTranslation } from "react-i18next";
import type { TripSummary } from "@/entities/trip";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { Avatar } from "@/shared/ui/avatar";
import { cn, formatRelativeTime } from "@/shared/lib";

/** Max avatars shown before collapsing the rest into a "+N" chip. */
const MAX_AVATARS = 4;

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
  const { t, i18n } = useTranslation("trips");

  const shown = trip.members.slice(0, MAX_AVATARS);
  const overflow = trip.members.length - shown.length;
  const when = trip.createdAt
    ? formatRelativeTime(trip.createdAt, i18n.language)
    : "";

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
        {(trip.startLabel || trip.endLabel) && (
          <p className="font-mono text-sm text-muted-foreground tabular-nums">
            {t("card.dates", { start: trip.startLabel, end: trip.endLabel })}
          </p>
        )}
        <div className="flex items-center gap-2.5">
          {shown.length > 0 ? (
            <div className="flex flex-none items-center">
              {shown.map((m, i) => (
                <Avatar
                  key={m.id}
                  initials={m.initials}
                  name={m.name}
                  bg={m.avatarBg}
                  fg={m.avatarFg}
                  size={24}
                  stackIndex={i}
                  zIndex={shown.length - i}
                />
              ))}
              {overflow > 0 ? (
                <span
                  className="-ml-[7px] inline-flex size-6 flex-none items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-card"
                  title={t("card.moreMembers", { count: overflow })}
                >
                  +{overflow}
                </span>
              ) : null}
            </div>
          ) : null}
          {trip.creatorName ? (
            <p className="min-w-0 truncate text-xs text-muted-foreground">
              {t("card.createdBy", { name: trip.creatorName, when })}
            </p>
          ) : null}
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
