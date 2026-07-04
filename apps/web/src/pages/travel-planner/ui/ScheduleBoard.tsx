import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Trip } from "@/entities/trip";
import { dayDateLabel } from "@/entities/trip";
import { categoryMeta, type StopCategory } from "@/entities/stop";
import type { PlaceResult } from "@/shared/api";
import { cn, formatMoney } from "@/shared/lib";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { PlaceSearch } from "./PlaceSearch";

interface DayOption {
  value: number;
  label: string;
  count: number;
}

const CATEGORY_OPTIONS: StopCategory[] = [
  "Sight",
  "Food",
  "Stay",
  "Shopping",
  "Activity",
  "Walk",
  "Park",
  "Transit",
  "Plan",
];

function CategoryIcon({ category }: { category: StopCategory }) {
  const meta = categoryMeta(category);
  return (
    <span
      className="flex size-5 flex-none items-center justify-center rounded"
      style={{ background: meta.bg, color: meta.fg }}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-3"
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
  );
}

/** Half-hourly time options for the schedule time picker. */
const TIME_OPTIONS: { label: string; value: string }[] = Array.from(
  { length: 48 },
  (_, i) => {
    const hh = String(Math.floor(i / 2)).padStart(2, "0");
    const mm = i % 2 ? "30" : "00";
    const value = `${hh}:${mm}`;
    return { label: value, value };
  },
);

export interface ComposeDraft {
  day: number;
  index: number;
  name: string;
  time: string;
  lat?: number;
  lng?: number;
  area?: string;
  category?: StopCategory;
  cost?: number;
  note?: string;
}

interface ScheduleBoardProps {
  trip: Trip;
  /** The active insert draft, lifted to the page so it survives a tab switch
   * during map picking. */
  compose: ComposeDraft | null;
  biasLat?: number;
  biasLng?: number;
  onOpen: (day: number, index: number) => void;
  onChange: (patch: Partial<ComposeDraft>) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onPickOnMap: () => void;
  onSelectStop: (id: string) => void;
  /** Append a new empty day to the itinerary. */
  onAddDay: () => void;
  addingDay?: boolean;
}

export function ScheduleBoard({
  trip,
  compose,
  biasLat,
  biasLng,
  onOpen,
  onChange,
  onConfirm,
  onCancel,
  onPickOnMap,
  onSelectStop,
  onAddDay,
  addingDay = false,
}: ScheduleBoardProps) {
  const { t, i18n } = useTranslation("planner");
  const locale = i18n.language;

  const dayOptions: DayOption[] = trip.days.map((d) => {
    const date = dayDateLabel(trip, d, locale);
    return {
      value: d.number,
      label: date
        ? `${t("days.day", { n: d.number })} · ${date}`
        : t("days.day", { n: d.number }),
      count: trip.stops.filter((s) => s.day === d.number).length,
    };
  });

  const insertSlot = (day: number, index: number) =>
    compose?.day === day && compose.index === index ? (
      <InsertComposer
        key={`compose-${day}-${index}`}
        compose={compose}
        biasLat={biasLat}
        biasLng={biasLng}
        dayOptions={dayOptions}
        currency={trip.currency}
        onChange={onChange}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onPickOnMap={onPickOnMap}
      />
    ) : (
      <InsertTrigger
        label={t("schedule.insert")}
        onClick={() => onOpen(day, index)}
      />
    );

  return (
    <div className="flex gap-4 overflow-x-auto p-4 md:p-6">
      {trip.days.map((d) => {
        const dayStops = trip.stops.filter((s) => s.day === d.number);
        const date = dayDateLabel(trip, d, locale);
        const headerMeta = [date, d.city].filter(Boolean).join(" · ");
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
              {headerMeta ? (
                <span className="text-xs text-muted-foreground">
                  {headerMeta}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              {insertSlot(d.number, 0)}
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
                    {insertSlot(d.number, idx + 1)}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="flex w-56 flex-none flex-col gap-2">
        <div className="h-[18px]" aria-hidden="true" />
        <button
          type="button"
          onClick={onAddDay}
          disabled={addingDay}
          className="group flex flex-1 min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground transition-colors duration-150 hover:border-border-strong hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-60"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-accent text-corn-600 transition-colors group-hover:bg-brand-muted">
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </span>
          {t("days.add")}
        </button>
      </div>
    </div>
  );
}

function InsertTrigger({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-6 items-center justify-center rounded-md text-xs text-muted-foreground/60 transition-colors hover:bg-accent hover:text-corn-600"
      aria-label={label}
    >
      <span className="opacity-0 transition-opacity group-hover:opacity-100">
        + {label}
      </span>
    </button>
  );
}

function InsertComposer({
  compose,
  biasLat,
  biasLng,
  dayOptions,
  currency,
  onChange,
  onConfirm,
  onCancel,
  onPickOnMap,
}: {
  compose: ComposeDraft;
  biasLat?: number;
  biasLng?: number;
  dayOptions: DayOption[];
  currency: string;
  onChange: (patch: Partial<ComposeDraft>) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onPickOnMap: () => void;
}) {
  const { t } = useTranslation("planner");
  const { t: tc } = useTranslation("common");
  const located = compose.lat != null && compose.lng != null;
  const hasOptions =
    compose.category != null || compose.cost != null || !!compose.note;
  const [expanded, setExpanded] = useState(hasOptions);

  return (
    <div className="wf-enter flex flex-col gap-2 rounded-lg border border-border bg-card p-2">
      <PlaceSearch
        autoFocus
        value={compose.name}
        biasLat={biasLat}
        biasLng={biasLng}
        placeholder={t("schedule.namePlaceholder")}
        onValueChange={(name) =>
          onChange({ name, lat: undefined, lng: undefined, area: undefined })
        }
        onSelectPlace={(p: PlaceResult) =>
          onChange({
            name: p.label,
            lat: p.lat,
            lng: p.lng,
            area: p.secondary || undefined,
          })
        }
        onPickOnMap={onPickOnMap}
        onSubmit={onConfirm}
        onCancel={onCancel}
      />
      <div className="flex items-center gap-2">
        <Select
          items={dayOptions}
          value={compose.day}
          onValueChange={(value) => {
            const opt = dayOptions.find((o) => o.value === value);
            onChange({ day: value as number, index: opt?.count ?? 0 });
          }}
        >
          <SelectTrigger className="flex-1" aria-label={t("schedule.datePlaceholder")}>
            <SelectValue placeholder={t("schedule.datePlaceholder")} />
          </SelectTrigger>
          <SelectPopup>
            {dayOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <Select
          items={TIME_OPTIONS}
          value={compose.time || null}
          onValueChange={(value) => onChange({ time: (value as string) ?? "" })}
        >
          <SelectTrigger className="w-28" aria-label={t("schedule.timePlaceholder")}>
            <SelectValue placeholder={t("schedule.timePlaceholder")} />
          </SelectTrigger>
          <SelectPopup>
            {TIME_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-fit items-center gap-1 rounded-md text-xs font-medium text-muted-foreground transition-colors duration-100 hover:text-foreground"
      >
        <svg
          viewBox="0 0 24 24"
          className={cn(
            "size-3.5 transition-transform duration-150",
            expanded && "rotate-90",
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
        {t("schedule.moreOptions")}
      </button>

      {expanded ? (
        <div className="flex flex-col gap-2">
          <Select
            items={CATEGORY_OPTIONS.map((c) => ({
              value: c,
              label: t(`category.${c}`),
            }))}
            value={compose.category ?? null}
            onValueChange={(value) =>
              onChange({ category: (value as StopCategory) ?? undefined })
            }
          >
            <SelectTrigger aria-label={t("schedule.categoryPlaceholder")}>
              <SelectValue placeholder={t("schedule.categoryPlaceholder")}>
                {(value: StopCategory | null) =>
                  value ? (
                    <span className="flex items-center gap-2">
                      <CategoryIcon category={value} />
                      {t(`category.${value}`)}
                    </span>
                  ) : null
                }
              </SelectValue>
            </SelectTrigger>
            <SelectPopup>
              {CATEGORY_OPTIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  <span className="flex items-center gap-2">
                    <CategoryIcon category={c} />
                    {t(`category.${c}`)}
                  </span>
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>

          <Input
            type="number"
            min={0}
            inputMode="decimal"
            value={compose.cost ?? ""}
            onChange={(e) =>
              onChange({
                cost: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            placeholder={t("schedule.costPlaceholder", { currency })}
          />

          <Textarea
            value={compose.note ?? ""}
            onChange={(e) => onChange({ note: e.target.value })}
            placeholder={t("schedule.notePlaceholder")}
            rows={3}
          />
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Button variant="brand" size="sm" onClick={onConfirm}>
          {t("schedule.add")}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {tc("actions.cancel")}
        </Button>
        {located ? (
          <span
            className="ml-auto flex items-center gap-1 text-xs font-medium text-corn-600"
            title={compose.area}
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
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {t("pick.located")}
          </span>
        ) : null}
      </div>
    </div>
  );
}
