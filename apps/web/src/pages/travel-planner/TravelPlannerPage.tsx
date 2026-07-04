import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { fetchTrip } from "@/shared/api";
import { queryKeys } from "@/shared/config";
import { stopNumbers } from "@/entities/trip";
import { useRouter } from "@/app/router";
import { useSession } from "@/shared/auth";
import { AppHeader } from "@/widgets/app-header";
import { Spinner } from "@/shared/ui/spinner";
import { Tabs } from "@/shared/ui/tabs";
import { useTripActions } from "./model/useTripActions";
import { Sidebar } from "./ui/Sidebar";
import { TripMapView } from "./ui/TripMapView";
import { ScheduleBoard } from "./ui/ScheduleBoard";
import { BudgetBoard } from "./ui/BudgetBoard";
import { FloatingMembers } from "./ui/FloatingMembers";

type Tab = "map" | "schedule" | "budget";

export function TravelPlannerPage({ tripId }: { tripId: string }) {
  const { t } = useTranslation("planner");
  const { t: tc } = useTranslation("common");
  const { navigate } = useRouter();
  const { data: session } = useSession();
  const currentUserId =
    (session?.user as { memberId?: string } | undefined)?.memberId ?? "lynn";

  const [tab, setTab] = useState<Tab>("map");
  const [day, setDay] = useState(0);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  const { data: trip, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.trip(tripId),
    queryFn: () => fetchTrip(tripId),
  });
  const actions = useTripActions(tripId);

  const numbers = useMemo(
    () => (trip ? stopNumbers(trip.stops) : new Map<string, number>()),
    [trip],
  );

  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (isError || !trip) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <AppHeader onBack={() => navigate("/")} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
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
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader
        onBack={() => navigate("/")}
        center={
          <span className="font-heading text-base font-semibold">
            {trip.title}
          </span>
        }
      />

      <div className="flex flex-1 overflow-hidden">
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

        <main className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5 md:px-6">
            <Tabs
              items={tabItems}
              value={tab}
              onValueChange={(v) => setTab(v as Tab)}
              aria-label={t("tabs.map")}
            />
          </div>

          <div className="relative min-h-0 flex-1 overflow-auto">
            {tab === "map" ? (
              <TripMapView
                trip={trip}
                numbers={numbers}
                day={day}
                activeStopId={selectedStopId}
                onSelectStop={selectStop}
              />
            ) : tab === "schedule" ? (
              <ScheduleBoard
                trip={trip}
                onInsert={(input) => actions.stop.mutate(input)}
                onSelectStop={(id) => {
                  setTab("map");
                  setDay(0);
                  selectStop(id);
                }}
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
