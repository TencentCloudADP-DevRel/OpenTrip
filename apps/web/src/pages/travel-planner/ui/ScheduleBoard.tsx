import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Trip } from "@/entities/trip";
import { categoryMeta } from "@/entities/stop";
import type { InsertStopInput } from "@/shared/api";
import { formatMoney } from "@/shared/lib";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

interface InsertAt {
  day: number;
  index: number;
}

export function ScheduleBoard({
  trip,
  onInsert,
  onSelectStop,
}: {
  trip: Trip;
  onInsert: (input: InsertStopInput) => void;
  onSelectStop: (id: string) => void;
}) {
  const { t } = useTranslation("planner");
  const { t: tc } = useTranslation("common");
  const [insertAt, setInsertAt] = useState<InsertAt | null>(null);
  const [name, setName] = useState("");
  const [time, setTime] = useState("");

  const open = (day: number, index: number) => {
    setInsertAt({ day, index });
    setName("");
    setTime("");
  };

  const confirm = () => {
    if (!insertAt) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    onInsert({ day: insertAt.day, index: insertAt.index, name: trimmed, time: time.trim() });
    setInsertAt(null);
  };

  const InsertRow = ({ day, index }: InsertAt) => {
    const active = insertAt?.day === day && insertAt.index === index;
    if (active) {
      return (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirm();
              if (e.key === "Escape") setInsertAt(null);
            }}
            placeholder={t("schedule.namePlaceholder")}
          />
          <div className="flex gap-2">
            <Input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirm();
                if (e.key === "Escape") setInsertAt(null);
              }}
              placeholder={t("schedule.timePlaceholder")}
              className="w-24"
            />
            <Button variant="brand" size="sm" onClick={confirm}>
              {t("schedule.add")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setInsertAt(null)}>
              {tc("actions.cancel")}
            </Button>
          </div>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => open(day, index)}
        className="group flex h-6 items-center justify-center rounded-md text-xs text-muted-foreground/60 transition-colors hover:bg-accent hover:text-corn-600"
        aria-label={t("schedule.insert")}
      >
        <span className="opacity-0 transition-opacity group-hover:opacity-100">
          + {t("schedule.insert")}
        </span>
      </button>
    );
  };

  return (
    <div className="flex gap-4 overflow-x-auto p-4 md:p-6">
      {trip.days.map((d) => {
        const dayStops = trip.stops.filter((s) => s.day === d.number);
        return (
          <div key={d.number} className="flex w-72 flex-none flex-col gap-2">
            <div className="flex items-center gap-2">
              <span
                className="size-2.5 flex-none rounded-full"
                style={{ background: d.color }}
              />
              <span className="text-sm font-semibold">
                {t("days.day", { n: d.number })}
              </span>
              <span className="text-xs text-muted-foreground">
                {d.dateLabel} · {d.city}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <InsertRow day={d.number} index={0} />
              {dayStops.map((s, idx) => {
                const meta = categoryMeta(s.category);
                return (
                  <div key={s.id} className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelectStop(s.id)}
                      className="flex flex-col gap-1 rounded-lg border border-border bg-card p-2.5 text-left shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-sm"
                      style={{ borderLeft: `3px solid ${d.color}` }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="flex size-[22px] flex-none items-center justify-center rounded-md"
                          style={{ background: meta.bg, color: meta.fg }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="size-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d={meta.path} />
                          </svg>
                        </span>
                        <span className="font-mono text-xs text-muted-foreground tabular-nums">
                          {s.time} · {s.duration}
                        </span>
                      </div>
                      <span className="text-sm font-medium">{s.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.category}
                        {s.cost ? ` · ${formatMoney(s.cost, trip.currency)} pp` : ""}
                        {s.votes.length
                          ? ` · ${t("schedule.voteCount", { count: s.votes.length })}`
                          : ""}
                      </span>
                    </button>
                    <InsertRow day={d.number} index={idx + 1} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
