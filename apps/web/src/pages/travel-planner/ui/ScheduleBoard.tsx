import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useTranslation } from "react-i18next";
import type { Trip, TripDay } from "@/entities/trip";
import { dayDateLabel } from "@/entities/trip";
import { CategoryIcon, type Stop, type StopCategory } from "@/entities/stop";
import type { PlaceResult, UpdateTripDayInput } from "@/shared/api";
import { cn, CURRENCIES } from "@/shared/lib";
import { Button } from "@/shared/ui/button";
import {
  ContextMenu,
  ContextMenuGroup,
  ContextMenuGroupLabel,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/shared/ui/context-menu";
import {
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogViewport,
} from "@/shared/ui/dialog";
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
import { StopCard } from "./StopCard";

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
  /** ISO currency code for `cost`. Defaults to the user's preferred currency. */
  costCurrency?: string;
  note?: string;
}

interface ScheduleBoardProps {
  trip: Trip;
  /** The active insert draft, lifted to the page so it survives a tab switch
   * during map picking. */
  compose: ComposeDraft | null;
  /** Currency preselected for a new stop cost (user preference, else trip). */
  defaultCurrency: string;
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
  /** Update display metadata for an itinerary day. */
  onUpdateDay: (dayNumber: number, patch: UpdateTripDayInput) => void;
  /** Persist a new day order (sequence of current day numbers). */
  onReorderDays: (order: number[]) => void;
  addingDay?: boolean;
  updatingDayNumber?: number;
}

export function ScheduleBoard({
  trip,
  compose,
  defaultCurrency,
  biasLat,
  biasLng,
  onOpen,
  onChange,
  onConfirm,
  onCancel,
  onPickOnMap,
  onSelectStop,
  onAddDay,
  onUpdateDay,
  onReorderDays,
  addingDay = false,
  updatingDayNumber,
}: ScheduleBoardProps) {
  const { t, i18n } = useTranslation("planner");
  const locale = i18n.language;
  const dayNumbers = trip.days.map((d) => d.number);
  const drag = useDayReorderDrag(dayNumbers, onReorderDays);
  const [editingDayNumber, setEditingDayNumber] = useState<number | null>(null);
  const editingDay = trip.days.find((d) => d.number === editingDayNumber) ?? null;
  const editingDayStops = editingDay
    ? trip.stops.filter((s) => s.day === editingDay.number)
    : [];
  const editingSuggestedCity = editingDay
    ? inferDayLocation(editingDayStops)
    : "";
  const locationOptions = buildLocationOptions(trip);

  const insertSlot = (day: number, index: number) =>
    compose?.day === day && compose.index === index ? (
      <InsertComposer
        key={`compose-${day}-${index}`}
        compose={compose}
        biasLat={biasLat}
        biasLng={biasLng}
        defaultCurrency={defaultCurrency}
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
    <div className="h-full min-h-0 overflow-auto p-[62px_22px_20px]">
      <div
        ref={drag.gridRef}
        className={cn(
          "relative grid min-w-[1180px] gap-3.5",
          drag.active && "select-none",
        )}
        style={{
          gridTemplateColumns: `repeat(${trip.days.length + 1}, minmax(228px, 1fr))`,
        }}
      >
        {drag.lineX != null ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0 bottom-0 z-40 w-0.5 -translate-x-1/2 rounded-full bg-brand"
            style={{ left: drag.lineX }}
          />
        ) : null}
        {trip.days.map((d, dayIndex) => {
          const dayStops = trip.stops.filter((s) => s.day === d.number);
          const date = dayDateLabel(trip, d, locale);
          const headerMeta = [date, d.city].filter(Boolean).join(" · ");
          const suggestedCity = inferDayLocation(dayStops);
          const isDragged = drag.draggedNumber === d.number;
          return (
            <div
              key={d.number}
              ref={drag.registerColumn(dayIndex)}
              className={cn(
                "relative flex min-w-[228px] flex-col gap-2.5",
                isDragged &&
                  "z-30 opacity-90 shadow-[var(--shadow-lg)] transition-none",
              )}
              style={drag.columnStyle(d.number)}
            >
              <DayHeader
                day={d}
                headerMeta={headerMeta}
                suggestedCity={suggestedCity}
                saving={updatingDayNumber === d.number}
                dragging={isDragged}
                dragHandleProps={drag.handleProps(dayIndex, d.number)}
                onEdit={() => setEditingDayNumber(d.number)}
                onUseSuggestedCity={() =>
                  onUpdateDay(d.number, { city: suggestedCity })
                }
              />

              <div className="flex flex-col">
                {insertSlot(d.number, 0)}
                {dayStops.map((s, idx) => (
                  <div key={s.id} className="flex flex-col">
                    <StopCard
                      trip={trip}
                      stop={s}
                      color={d.color}
                      onSelect={onSelectStop}
                    />
                    {insertSlot(d.number, idx + 1)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="flex min-w-[228px] flex-col gap-2.5">
          <button
            type="button"
            onClick={onAddDay}
            disabled={addingDay}
            className="group flex h-[62px] items-center gap-1.5 rounded-xl border border-dashed border-border bg-card p-2.5 text-muted-foreground shadow-xs transition-[border-color,background-color,color,scale] duration-[var(--dur-base)] ease-[var(--ease-out)] hover:border-border-strong hover:bg-accent hover:text-foreground active:scale-[var(--press-scale)] disabled:pointer-events-none disabled:opacity-60"
          >
            <span className="flex size-2.5 flex-none items-center justify-center rounded-full bg-accent text-corn-600 transition-[background-color] group-hover:bg-brand-muted">
              <svg
                viewBox="0 0 24 24"
                className="size-2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </span>
            <span className="font-heading text-base font-semibold">
              {t("days.add")}
            </span>
          </button>
        </div>
      </div>

      <DayEditorDialog
        trip={trip}
        day={editingDay}
        suggestedCity={editingSuggestedCity}
        locationOptions={locationOptions}
        saving={
          editingDay != null && updatingDayNumber === editingDay.number
        }
        onOpenChange={(open) => {
          if (!open) setEditingDayNumber(null);
        }}
        onSubmit={(dayNumber, patch) => {
          onUpdateDay(dayNumber, patch);
          setEditingDayNumber(null);
        }}
      />
    </div>
  );
}

/** Props spread onto a day-header card to make it the reorder drag handle. */
interface DayDragHandleProps {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void;
}

/** Snapshot of a day column's horizontal extent, in grid-content coordinates. */
interface ColumnRect {
  left: number;
  right: number;
}

interface DragState {
  dayNumber: number;
  index: number;
  dx: number;
  dy: number;
  /** Post-removal insertion index into the remaining columns (0..N-1). */
  targetIndex: number;
}

/** Pointer distance (px) before a press on a day header becomes a drag, so a
 * plain click or right-click still reaches the context menu. */
const DRAG_THRESHOLD = 4;

/** Drag-to-reorder for day columns. Dragging a day header lifts the whole
 * column (header + stops move together) and shows a vertical line at the
 * insertion point; dropping commits the new order via `onReorderDays`. */
function useDayReorderDrag(
  dayNumbers: number[],
  onReorderDays: (order: number[]) => void,
) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const columnEls = useRef(new Map<number, HTMLDivElement>());
  const rects = useRef<ColumnRect[]>([]);
  const pending = useRef<{
    index: number;
    dayNumber: number;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const registerColumn = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      if (el) columnEls.current.set(index, el);
      else columnEls.current.delete(index);
    },
    [],
  );

  const snapshotRects = useCallback((): ColumnRect[] => {
    const grid = gridRef.current;
    if (!grid) return [];
    const gridLeft = grid.getBoundingClientRect().left;
    return dayNumbers.map((_, i) => {
      const el = columnEls.current.get(i);
      const r = el?.getBoundingClientRect();
      return r
        ? { left: r.left - gridLeft, right: r.right - gridLeft }
        : { left: 0, right: 0 };
    });
  }, [dayNumbers]);

  const computeTargetIndex = useCallback(
    (index: number, dx: number): number => {
      const list = rects.current;
      const dragged = list[index];
      if (!dragged) return index;
      const draggedCenter = (dragged.left + dragged.right) / 2 + dx;
      let count = 0;
      list.forEach((r, i) => {
        if (i === index) return;
        if ((r.left + r.right) / 2 < draggedCenter) count += 1;
      });
      return count;
    },
    [],
  );

  const reset = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    pending.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDrag(null);
  }, []);

  const handleProps = useCallback(
    (index: number, dayNumber: number): DayDragHandleProps => ({
      onPointerDown: (e) => {
        if (e.button !== 0) return;
        pending.current = {
          index,
          dayNumber,
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove: (e) => {
        const p = pending.current;
        if (!p || p.pointerId !== e.pointerId) return;
        const dx = e.clientX - p.startX;
        const dy = e.clientY - p.startY;
        if (
          drag == null &&
          Math.hypot(dx, dy) < DRAG_THRESHOLD
        ) {
          return;
        }
        if (drag == null) rects.current = snapshotRects();
        setDrag({
          dayNumber: p.dayNumber,
          index: p.index,
          dx,
          dy,
          targetIndex: computeTargetIndex(p.index, dx),
        });
      },
      onPointerUp: (e) => {
        const p = pending.current;
        if (drag && p) {
          const order = nextOrder(dayNumbers, drag.index, drag.targetIndex);
          if (!sameOrder(order, dayNumbers)) onReorderDays(order);
        }
        reset(e);
      },
      onPointerCancel: reset,
    }),
    [
      drag,
      dayNumbers,
      snapshotRects,
      computeTargetIndex,
      onReorderDays,
      reset,
    ],
  );

  const columnStyle = useCallback(
    (dayNumber: number): CSSProperties | undefined =>
      drag && drag.dayNumber === dayNumber
        ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` }
        : undefined,
    [drag],
  );

  const lineX = (() => {
    if (!drag) return null;
    const order = nextOrder(dayNumbers, drag.index, drag.targetIndex);
    if (sameOrder(order, dayNumbers)) return null;
    return insertionLineX(rects.current, drag.index, drag.targetIndex);
  })();

  return {
    gridRef,
    registerColumn,
    handleProps,
    columnStyle,
    draggedNumber: drag?.dayNumber ?? null,
    active: drag != null,
    lineX,
  };
}

/** New day-number order after moving `index` to post-removal `targetIndex`. */
function nextOrder(
  numbers: number[],
  index: number,
  targetIndex: number,
): number[] {
  const rest = numbers.filter((_, i) => i !== index);
  rest.splice(targetIndex, 0, numbers[index]!);
  return rest;
}

function sameOrder(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((n, i) => n === b[i]);
}

/** Pixel x (grid-content coords) of the insertion line between the columns
 * that stay in place. Returns null when there is nothing to show. */
function insertionLineX(
  rects: ColumnRect[],
  draggedIndex: number,
  targetIndex: number,
): number | null {
  const remaining = rects.filter((_, i) => i !== draggedIndex);
  if (remaining.length === 0) return null;
  const gap =
    rects.length > 1 ? Math.max(0, rects[1]!.left - rects[0]!.right) : 14;
  if (targetIndex <= 0) return remaining[0]!.left - gap / 2;
  if (targetIndex >= remaining.length) {
    return remaining[remaining.length - 1]!.right + gap / 2;
  }
  return (remaining[targetIndex - 1]!.right + remaining[targetIndex]!.left) / 2;
}

function DayHeader({
  day,
  headerMeta,
  suggestedCity,
  saving,
  dragging,
  dragHandleProps,
  onEdit,
  onUseSuggestedCity,
}: {
  day: TripDay;
  headerMeta: string;
  suggestedCity: string;
  saving: boolean;
  dragging: boolean;
  dragHandleProps: DayDragHandleProps;
  onEdit: () => void;
  onUseSuggestedCity: () => void;
}) {
  const { t } = useTranslation("planner");
  return (
    <ContextMenu>
      <ContextMenuTrigger className="block">
        <div
          {...dragHandleProps}
          aria-label={t("schedule.reorderAria", { n: day.number })}
          className={cn(
            "flex touch-none flex-col gap-0.5 rounded-xl border border-border bg-card p-2.5 shadow-xs",
            dragging ? "cursor-grabbing" : "cursor-grab",
          )}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="size-2.5 flex-none rounded-full"
              style={{ background: day.color }}
            />
            <span className="font-heading text-base font-semibold text-balance">
              {t("days.day", { n: day.number })}
            </span>
          </div>
          {headerMeta ? (
            <span className="pl-4 font-mono text-[11px] text-muted-foreground tabular-nums">
              {headerMeta}
            </span>
          ) : null}
        </div>
      </ContextMenuTrigger>
      <ContextMenuPopup>
        <ContextMenuGroup>
          <ContextMenuGroupLabel>
            {t("schedule.dayMenu.label", { n: day.number })}
          </ContextMenuGroupLabel>
          <ContextMenuItem closeOnClick onClick={onEdit}>
            {t("schedule.dayMenu.edit")}
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem
            closeOnClick
            disabled={!suggestedCity || saving}
            onClick={onUseSuggestedCity}
          >
            {t("schedule.dayMenu.useGeneratedLocation")}
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuPopup>
    </ContextMenu>
  );
}

function DayEditorDialog({
  trip,
  day,
  suggestedCity,
  locationOptions,
  saving,
  onOpenChange,
  onSubmit,
}: {
  trip: Trip;
  day: TripDay | null;
  suggestedCity: string;
  locationOptions: string[];
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (dayNumber: number, patch: UpdateTripDayInput) => void;
}) {
  const { t } = useTranslation("planner");
  const { t: tc } = useTranslation("common");
  const [date, setDate] = useState("");
  const [city, setCity] = useState("");
  const cityOptions = includeOption(locationOptions, city, suggestedCity);

  useEffect(() => {
    setDate(day ? dayIsoValue(trip, day) : "");
    setCity(day?.city ?? "");
  }, [day, trip]);

  const submit = () => {
    if (!day) return;
    onSubmit(day.number, {
      date,
      dateLabel: "",
      city,
    });
  };

  return (
    <Dialog open={day != null} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-[opacity] duration-[var(--dur-slow)] data-[ending-style]:opacity-0" />
        <DialogViewport className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 md:p-6">
          <DialogPopup className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-border),var(--shadow-lg)] outline-none transition-[opacity,scale] duration-[var(--dur-slow)] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
            <DialogHeader>
              <DialogTitle className="m-0 font-heading text-xl font-semibold text-foreground">
                {day ? t("schedule.dayDialog.title", { n: day.number }) : ""}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {t("schedule.dayDialog.description")}
              </DialogDescription>
            </DialogHeader>

            <DialogPanel className="flex flex-col gap-4 pb-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                {t("schedule.dayDialog.date")}
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                {t("schedule.dayDialog.cityLabel")}
                <Select
                  items={cityOptions.map((value) => ({ value, label: value }))}
                  value={city || null}
                  onValueChange={(value) => setCity((value as string) ?? "")}
                >
                  <SelectTrigger aria-label={t("schedule.dayDialog.cityLabel")}>
                    <SelectValue
                      placeholder={t("schedule.dayDialog.cityPlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectPopup>
                    {cityOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </label>

              {suggestedCity ? (
                <button
                  type="button"
                  onClick={() => setCity(suggestedCity)}
                  className="w-fit rounded-md px-1.5 py-1 text-left text-xs font-medium text-corn-600 transition-[background-color,color,scale] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-accent hover:text-corn-700 active:scale-[var(--press-scale)]"
                >
                  {t("schedule.dayDialog.useGenerated", {
                    location: suggestedCity,
                  })}
                </button>
              ) : null}
            </DialogPanel>

            <DialogFooter>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                {tc("actions.cancel")}
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={saving}
                onClick={submit}
              >
                {t("schedule.dayDialog.save")}
              </Button>
            </DialogFooter>
          </DialogPopup>
        </DialogViewport>
      </DialogPortal>
    </Dialog>
  );
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function dayIsoValue(trip: Trip, day: TripDay): string {
  if (ISO_DATE.test(day.date)) return day.date;
  if (!ISO_DATE.test(trip.startDate)) return "";
  return addDaysIso(trip.startDate, day.number - 1);
}

function addDaysIso(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, "0"),
    String(next.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function buildLocationOptions(trip: Trip): string[] {
  const values = [
    ...trip.days.map((day) => day.city),
    ...trip.days.map((day) =>
      inferDayLocation(trip.stops.filter((stop) => stop.day === day.number)),
    ),
    ...trip.stops.map((stop) => cityFromCoordinates(stop.lat, stop.lng) ?? ""),
    ...trip.stops.map((stop) => normalizeKnownPlace(stop.area) ?? ""),
  ];
  return uniqueOptions(values);
}

function includeOption(options: string[], ...values: string[]): string[] {
  return uniqueOptions([...values, ...options]);
}

function uniqueOptions(values: readonly string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index);
}

function inferDayLocation(stops: readonly Stop[]): string {
  if (stops.length === 0) return "";

  const dominantCity = mostFrequent(
    stops
      .filter((stop) => !stop.transit)
      .map((stop) => cityFromCoordinates(stop.lat, stop.lng))
      .filter((city): city is string => city != null),
  );

  const routeParts = stops
    .map((stop) => splitRouteArea(stop.area))
    .find((parts): parts is [string, string] => parts != null);
  if (routeParts) {
    const [origin, destination] = routeParts;
    const routeDestination =
      dominantCity || normalizeKnownPlace(destination) || destination;
    if (origin && routeDestination && origin !== routeDestination) {
      return `${origin} → ${routeDestination}`;
    }
  }

  if (dominantCity) return dominantCity;

  return (
    mostFrequent(
      stops
        .map((stop) => normalizeAreaLabel(stop.area))
        .filter((area) => area.length > 0),
    ) ?? ""
  );
}

function cityFromCoordinates(lat: number, lng: number): string | null {
  if (lat >= 35.5 && lat <= 35.85 && lng >= 139.45 && lng <= 140.0) {
    return "Tokyo";
  }
  if (lat >= 34.85 && lat <= 35.15 && lng >= 135.55 && lng <= 135.9) {
    return "Kyoto";
  }
  if (lat >= 34.55 && lat <= 34.85 && lng >= 135.35 && lng <= 135.65) {
    return "Osaka";
  }
  return null;
}

function splitRouteArea(area: string): [string, string] | null {
  const [rawOrigin, rawDestination] = area.split(/\s*(?:→|->)\s*/);
  if (!rawOrigin || !rawDestination) return null;
  const origin = normalizeKnownPlace(rawOrigin) || normalizeAreaLabel(rawOrigin);
  const destination =
    normalizeKnownPlace(rawDestination) || normalizeAreaLabel(rawDestination);
  return origin && destination ? [origin, destination] : null;
}

function normalizeKnownPlace(value: string): string | null {
  const normalized = value.toLowerCase();
  if (normalized.includes("tokyo")) return "Tokyo";
  if (normalized.includes("kyoto")) return "Kyoto";
  if (normalized.includes("osaka") || normalized.includes("umeda")) {
    return "Osaka";
  }
  return null;
}

function normalizeAreaLabel(value: string): string {
  return value
    .replace(/\b(?:sta\.?|station)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mostFrequent(values: readonly string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )[0]![0];
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
      className="flex h-4 items-center opacity-0 transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100"
      aria-label={label}
    >
      <span className="h-0.5 flex-1 rounded-[1px] bg-corn-300" />
      <span className="mx-1 flex size-[18px] flex-none items-center justify-center rounded-full bg-brand text-white shadow-xs">
        <svg
          viewBox="0 0 24 24"
          className="size-[11px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      </span>
      <span className="h-0.5 flex-1 rounded-[1px] bg-corn-300" />
    </button>
  );
}

function InsertComposer({
  compose,
  biasLat,
  biasLng,
  defaultCurrency,
  onChange,
  onConfirm,
  onCancel,
  onPickOnMap,
}: {
  compose: ComposeDraft;
  biasLat?: number;
  biasLng?: number;
  defaultCurrency: string;
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
    // Concentric radius: rounded-lg (10px) fields + 10px padding = 20px shell.
    // `my-2` gives the open composer breathing room from the cards above and
    // below (the collapsed insert triggers are flush by design).
    <div className="wf-enter my-2 flex flex-col gap-2 rounded-[20px] border border-corn-300 bg-card p-2.5 shadow-sm">
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
      <Select
        items={TIME_OPTIONS}
        value={compose.time || null}
        onValueChange={(value) => onChange({ time: (value as string) ?? "" })}
      >
        <SelectTrigger
          className="rounded-lg tabular-nums"
          aria-label={t("schedule.timePlaceholder")}
        >
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

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="relative flex h-8 w-fit items-center gap-1 rounded-md pl-1.5 pr-2 text-xs font-medium text-muted-foreground transition-[color,scale] duration-[var(--dur-fast)] ease-[var(--ease-out)] after:absolute after:-inset-1 after:content-[''] hover:text-foreground active:scale-[var(--press-scale)]"
      >
        <svg
          viewBox="0 0 24 24"
          className={cn(
            "size-3.5 transition-[rotate] duration-150",
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
        <div className="wf-enter flex flex-col gap-2">
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
            <SelectTrigger
              className="rounded-lg"
              aria-label={t("schedule.categoryPlaceholder")}
            >
              <SelectValue placeholder={t("schedule.categoryPlaceholder")}>
                {(value: StopCategory | null) =>
                  value ? (
                    <span className="flex items-center gap-2">
                      <CategoryIcon category={value} />
                      {t(`category.${value}`)}
                    </span>
                  ) : (
                    t("schedule.categoryPlaceholder")
                  )
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

          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              inputMode="decimal"
              value={compose.cost ?? ""}
              onChange={(e) =>
                onChange({
                  cost:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
              placeholder={t("schedule.costPlaceholder")}
              className="min-w-0 flex-1 rounded-lg tabular-nums"
            />
            <Select
              items={CURRENCIES.map((c) => ({ value: c, label: c }))}
              value={compose.costCurrency ?? defaultCurrency}
              onValueChange={(value) =>
                onChange({ costCurrency: (value as string) ?? defaultCurrency })
              }
            >
              <SelectTrigger
                className="w-[92px] flex-none rounded-lg tabular-nums"
                aria-label={t("schedule.currencyLabel")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>

          <Textarea
            value={compose.note ?? ""}
            onChange={(e) => onChange({ note: e.target.value })}
            placeholder={t("schedule.notePlaceholder")}
            rows={3}
            className="rounded-lg"
          />

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
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="flex-1"
        >
          {tc("actions.cancel")}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onConfirm}
          className="flex-1"
        >
          {t("schedule.add")}
        </Button>
      </div>
    </div>
  );
}
