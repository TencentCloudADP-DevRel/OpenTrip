import { AppProviders } from "./providers";
import { RouterProvider, useRouter, matchTripId } from "./router";
import { useSession } from "@/shared/auth";
import { Spinner } from "@/shared/ui/spinner";
import { AuthPage } from "@/pages/auth";
import { TripsPage } from "@/pages/trips";
import { TravelPlannerPage } from "@/pages/travel-planner";

function Routes() {
  const { path } = useRouter();
  const tripId = matchTripId(path);
  if (tripId) return <TravelPlannerPage tripId={tripId} />;
  return <TripsPage />;
}

function Gate() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (!session) return <AuthPage />;

  return (
    <RouterProvider>
      <Routes />
    </RouterProvider>
  );
}

export function App() {
  return (
    <AppProviders>
      <Gate />
    </AppProviders>
  );
}
