import { useTranslation } from "react-i18next";
import type { Trip } from "@/entities/trip";
import { findDay } from "@/entities/trip";
import { formatMoney } from "@/shared/lib";
import { cn } from "@/shared/lib";
import { DayPills } from "./DayPills";
import { StopDetail } from "./StopDetail";

export interface SidebarProps {
  trip: Trip;
  numbers: Map<string, number>;
  day: number;
  onDayChange: (day: number) => void;
  selectedStopId: string | null;
  onSelectStop: (id: string) => void;
  onCloseDetail: () => void;
  currentUserId: string;
  onToggleVote: (stopId: string) => void;
  onComment: (stopId: string, text: string) => void;
}

export function Sidebar(props: SidebarProps) {
  const { t } = useTranslation("planner");
  const { trip, numbers, day, selectedStopId } = props;

  const selectedStop = selectedStopId
    ? trip.stops.find((s) => s.id === selectedStopId)
    : undefined;

  const visibleDays = day === 0 ? trip.days : trip.days.filter((d) => d.number === day);
  const visibleCount =
    day === 0
      ? trip.stops.length
      : trip.stops.filter((s) => s.day === day).length;

  return (
    <aside className="hidden w-[340px] flex-none flex-col border-r border-border bg-sidebar md:flex">
      {selectedStop ? (
        <StopDetail
          trip={trip}
          stop={selectedStop}
          currentUserId={props.currentUserId}
          onClose={props.onCloseDetail}
          onToggleVote={props.onToggleVote}
          onComment={props.onComment}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 border-b border-border p-4">
            <DayPills trip={trip} day={day} onDayChange={props.onDayChange} />
            <span className="text-xs text-muted-foreground tabular-nums">
              {t("itinerary.count", { count: visibleCount })}
            </span>
          </div>

          <div className="flex-1 overflow-auto">
            {visibleDays.map((d) => {
              const dayStops = trip.stops.filter((s) => s.day === d.number);
              return (
                <div key={d.number}>
                  <div className="sticky top-0 z-[1] flex items-center gap-2 bg-sidebar/95 px-4 py-2 backdrop-blur-sm">
                    <span
                      className="size-2.5 flex-none rounded-full"
                      style={{ background: d.color }}
                    />
                    <span className="text-xs font-semibold text-foreground">
                      {t("days.groupLabel", { n: d.number, date: d.dateLabel })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {findDay(trip, d.number)?.city}
                    </span>
                  </div>
                  {dayStops.map((s) => {
                    const voted = s.votes.includes(props.currentUserId);
                    const selected = s.id === selectedStopId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => props.onSelectStop(s.id)}
                        className={cn(
                          "flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors duration-100",
                          selected ? "bg-brand-muted" : "hover:bg-accent",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-6 flex-none items-center justify-center text-[11px] font-semibold text-white",
                            s.transit ? "rounded-[7px]" : "rounded-full",
                          )}
                          style={{ background: d.color }}
                        >
                          {numbers.get(s.id)}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-medium">
                            {s.name}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {s.area}
                            {s.cost
                              ? ` · ${formatMoney(s.cost, trip.currency)} pp`
                              : ""}
                          </span>
                        </span>
                        <span className="flex flex-none items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex h-[22px] items-center gap-1 rounded-sm px-1.5 text-[11px] tabular-nums",
                              voted
                                ? "bg-brand-muted text-corn-600"
                                : "bg-secondary text-muted-foreground",
                            )}
                          >
                            ▲ {s.votes.length}
                          </span>
                          {s.comments.length ? (
                            <span className="inline-flex h-[22px] items-center gap-1 rounded-sm bg-secondary px-1.5 text-[11px] text-muted-foreground tabular-nums">
                              💬 {s.comments.length}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}
    </aside>
  );
}
