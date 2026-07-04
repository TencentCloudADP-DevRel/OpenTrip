import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { fetchTrips } from "@/shared/api";
import { queryKeys } from "@/shared/config";
import { AppHeader } from "@/widgets/app-header";
import { Spinner } from "@/shared/ui/spinner";
import { useRouter } from "@/app/router";
import { TripCard } from "./ui/TripCard";

export function TripsPage() {
  const { t } = useTranslation("trips");
  const { navigate } = useRouter();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.trips,
    queryFn: fetchTrips,
  });

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-8 flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-[-0.02em]">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        {isPending ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-6" />
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((trip, i) => (
              <TripCard
                key={trip.id}
                trip={trip}
                index={i}
                onOpen={() => navigate(`/trips/${trip.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation("common");
  return (
    <div className="flex flex-col items-center gap-3 py-16">
      <p className="text-sm text-muted-foreground">{t("state.error")}</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-sm text-corn-600 hover:underline"
      >
        {t("state.retry")}
      </button>
    </div>
  );
}
