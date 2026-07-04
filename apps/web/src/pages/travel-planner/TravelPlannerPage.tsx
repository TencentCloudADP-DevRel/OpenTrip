import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTrip, renameTrip, reversePlace } from "@/shared/api";
import { queryKeys } from "@/shared/config";
import { stopNumbers } from "@/entities/trip";
import { useRouter } from "@/app/router";
import { useSession } from "@/shared/auth";
import { AppSidebar } from "@/widgets/app-sidebar";
import { Spinner } from "@/shared/ui/spinner";
import { Tabs } from "@/shared/ui/tabs";
import { useTripActions } from "./model/useTripActions";
import { Sidebar } from "./ui/Sidebar";
import { TripMapView } from "./ui/TripMapView";
import { ScheduleBoard, type ComposeDraft } from "./ui/ScheduleBoard";
import { BudgetBoard } from "./ui/BudgetBoard";
import { FloatingMembers } from "./ui/FloatingMembers";

type Tab = "map" | "schedule" | "budget";

export function TravelPlannerPage({ tripId }: { tripId: string }) {
  const { t } = useTranslation("planner");
  const { t: tc } = useTranslation("common");
  const { navigate } = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "lynn";

  const { i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>("map");
  const [day, setDay] = useState(0);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [compose, setCompose] = useState<ComposeDraft | null>(null);
  const [picking, setPicking] = useState(false);

  const queryClient = useQueryClient();
  const { data: trip, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.trip(tripId),
    queryFn: () => fetchTrip(tripId),
  });
  const actions = useTripActions(tripId);

  const rename = useMutation({
    mutationFn: (title: string) => renameTrip(tripId, title),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.trips });
    },
  });

  const numbers = useMemo(
    () => (trip ? stopNumbers(trip.stops) : new Map<string, number>()),
    [trip],
  );

  // Bias place search toward the trip's existing footprint for local relevance.
  const bias = useMemo(() => {
    const first = trip?.stops?.[0];
    return first ? { lat: first.lat, lng: first.lng } : undefined;
  }, [trip]);

  const openCompose = (d: number, index: number) =>
    setCompose({ day: d, index, name: "", time: "" });
  const patchCompose = (patch: Partial<ComposeDraft>) =>
    setCompose((c) => (c ? { ...c, ...patch } : c));
  const cancelCompose = () => {
    setCompose(null);
    setPicking(false);
  };
  const confirmCompose = () => {
    setCompose((c) => {
      const name = c?.name.trim();
      if (c && name) {
        actions.stop.mutate({
          day: c.day,
          index: c.index,
          name,
          time: c.time.trim(),
          lat: c.lat,
          lng: c.lng,
          area: c.area,
          category: c.category,
          cost: c.cost,
          note: c.note?.trim() || undefined,
        });
      }
      return null;
    });
    setPicking(false);
  };
  const startPickOnMap = () => {
    if (!compose) return;
    setPicking(true);
    setTab("map");
  };
  const handleMapPick = async (lng: number, lat: number) => {
    setPicking(false);
    setTab("schedule");
    let name: string | undefined;
    let area: string | undefined;
    try {
      const place = await reversePlace(lat, lng, i18n.resolvedLanguage ?? "en");
      if (place) {
        name = place.label;
        area = place.secondary || undefined;
      }
    } catch {
      // Reverse geocoding is best-effort; keep any name the user already typed.
    }
    setCompose((c) =>
      c ? { ...c, lat, lng, name: c.name.trim() || name || c.name, area } : c,
    );
  };
  // Right-click "Add a stop here": open the composer pre-filled at the clicked point.
  const addStopAt = async (lng: number, lat: number) => {
    if (!trip) return;
    const targetDay = day > 0 ? day : (trip.days[0]?.number ?? 1);
    const index = trip.stops.filter((s) => s.day === targetDay).length;
    setCompose({ day: targetDay, index, name: "", time: "", lat, lng });
    setPicking(false);
    setTab("schedule");
    try {
      const place = await reversePlace(lat, lng, i18n.resolvedLanguage ?? "en");
      if (place) {
        setCompose((c) =>
          c
            ? {
                ...c,
                name: c.name.trim() || place.label,
                area: place.secondary || undefined,
              }
            : c,
        );
      }
    } catch {
      // Reverse geocoding is best-effort; the user can still type a name.
    }
  };

  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (isError || !trip) {
    return (
      <div className="flex h-dvh bg-sidebar">
        <AppSidebar top={<BackButton onBack={() => navigate("/")} />} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-l-2xl border border-r-0 border-border bg-background">
          <p className="text-sm text-muted-foreground">{tc("state.error")}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-sm text-corn-600 hover:underline"
          >
            {tc("state.retry")}
          </button>
        </div>
      </div>
    );
  }

  const tabItems = [
    { value: "map", label: t("tabs.map") },
    { value: "schedule", label: t("tabs.schedule") },
    { value: "budget", label: t("tabs.budget") },
  ];

  const selectStop = (id: string) => {
    setSelectedStopId(id);
  };

  return (
    <div className="flex h-dvh bg-sidebar">
      <AppSidebar
        top={
          <div className="flex flex-col gap-3">
            <BackButton
              onBack={() => navigate("/")}
              title={trip.title}
              onRename={(title) => rename.mutate(title)}
            />
            <Tabs
              items={tabItems}
              value={tab}
              onValueChange={(v) => setTab(v as Tab)}
              aria-label={t("tabs.map")}
              className="flex w-full"
            />
          </div>
        }
      >
        <Sidebar
          trip={trip}
          numbers={numbers}
          day={day}
          onDayChange={(d) => {
            setDay(d);
            setSelectedStopId(null);
          }}
          selectedStopId={selectedStopId}
          onSelectStop={selectStop}
          onCloseDetail={() => setSelectedStopId(null)}
          currentUserId={currentUserId}
          onToggleVote={(stopId) => actions.vote.mutate(stopId)}
          onComment={(stopId, text) =>
            actions.comment.mutate({ stopId, text })
          }
        />
      </AppSidebar>

      <div className="flex min-w-0 flex-1 overflow-hidden rounded-l-2xl border border-r-0 border-border bg-background shadow-[-8px_0_24px_-16px_rgba(15,23,42,0.25)]">
        <main className="relative flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1 overflow-auto">
            {tab === "map" ? (
              <TripMapView
                trip={trip}
                numbers={numbers}
                day={day}
                activeStopId={selectedStopId}
                onSelectStop={selectStop}
                picking={picking}
                onPick={handleMapPick}
                onAddStopHere={addStopAt}
                onCancelPick={() => {
                  setPicking(false);
                  setTab("schedule");
                }}
              />
            ) : tab === "schedule" ? (
              <ScheduleBoard
                trip={trip}
                compose={compose}
                biasLat={bias?.lat}
                biasLng={bias?.lng}
                onOpen={openCompose}
                onChange={patchCompose}
                onConfirm={confirmCompose}
                onCancel={cancelCompose}
                onPickOnMap={startPickOnMap}
                onSelectStop={(id) => {
                  setTab("map");
                  setDay(0);
                  selectStop(id);
                }}
                onAddDay={() => actions.day.mutate()}
                addingDay={actions.day.isPending}
              />
            ) : (
              <BudgetBoard
                trip={trip}
                currentUserId={currentUserId}
                onAddExpense={(input) => actions.expense.mutate(input)}
              />
            )}
          </div>

          <FloatingMembers members={trip.members} />
        </main>
      </div>
    </div>
  );
}

function BackButton({
  onBack,
  title,
  onRename,
}: {
  onBack: () => void;
  title?: string;
  onRename?: (title: string) => void;
}) {
  const { t } = useTranslation("common");
  const { t: tp } = useTranslation("planner");
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title ?? "");

  useEffect(() => setValue(title ?? ""), [title]);

  const commit = () => {
    setEditing(false);
    const next = value.trim();
    if (next && next !== title) onRename?.(next);
    else setValue(title ?? "");
  };

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-1 rounded-md text-xs font-medium text-muted-foreground transition-colors duration-100 hover:text-foreground"
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
          <path d="m15 18-6-6 6-6" />
        </svg>
        {t("actions.back")}
      </button>
      {title == null ? null : editing ? (
        <input
          autoFocus
          value={value}
          maxLength={120}
          aria-label={tp("header.renameAria")}
          placeholder={tp("header.renamePlaceholder")}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              setValue(title);
              setEditing(false);
            }
          }}
          className="w-full rounded-md border border-ring bg-background px-1.5 py-0.5 font-heading text-base font-semibold outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => onRename && setEditing(true)}
          title={onRename ? tp("header.renameAria") : title}
          className="truncate rounded-md px-1.5 py-0.5 text-left font-heading text-base font-semibold transition-colors duration-100 hover:bg-accent"
        >
          {title}
        </button>
      )}
    </div>
  );
}
