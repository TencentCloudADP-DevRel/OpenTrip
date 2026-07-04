import { Suspense, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18n from "@/shared/i18n";
import { Spinner } from "@/shared/ui/spinner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <Suspense
          fallback={
            <div className="flex min-h-dvh items-center justify-center">
              <Spinner className="size-6" />
            </div>
          }
        >
          {children}
        </Suspense>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
