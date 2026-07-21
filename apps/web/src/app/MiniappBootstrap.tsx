import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { exchangeMiniappWebviewCode } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import { bridgeRefreshFailed } from "./auth-session-state";

const initialBridgeState = readAndClearBridgeState();
let exchangeAttempt:
  | { code: string; promise: Promise<void> }
  | undefined;

export function MiniappBootstrap({
  isAuthenticated,
  sessionBusy,
  initialSessionResolved,
  refreshSession,
  onComplete,
}: {
  isAuthenticated: boolean;
  sessionBusy: boolean;
  initialSessionResolved: boolean;
  refreshSession: () => Promise<void>;
  onComplete: (path: string) => void;
}) {
  const { t } = useTranslation("common");
  const [failed, setFailed] = useState(false);
  const [exchangeCompleted, setExchangeCompleted] = useState(false);
  const connectingRef = useRef(false);

  const connect = useCallback(async () => {
    if (
      connectingRef.current ||
      !initialSessionResolved ||
      isAuthenticated
    ) {
      return;
    }
    connectingRef.current = true;
    setFailed(false);
    setExchangeCompleted(false);
    try {
      if (!initialBridgeState.code) {
        setFailed(true);
        return;
      }
      await exchangeOnce(initialBridgeState.code);
      // Reuse the single reactive session owner mounted in AppContent. A
      // direct getSession call here would leave useSession unhydrated and let
      // the auth gate briefly render the signed-out UI.
      await refreshSession();
      setExchangeCompleted(true);
    } catch {
      setFailed(true);
    } finally {
      connectingRef.current = false;
    }
  }, [initialSessionResolved, isAuthenticated, refreshSession]);

  useEffect(() => {
    if (isAuthenticated) {
      onComplete(initialBridgeState.path);
      return;
    }
    void connect();
  }, [connect, isAuthenticated, onComplete]);

  useEffect(() => {
    // A completed refetch with no session means the browser rejected or lost
    // the cookie set by the bridge exchange.
    if (
      bridgeRefreshFailed(exchangeCompleted, {
        isAuthenticated,
        sessionBusy,
      })
    ) {
      setFailed(true);
    }
  }, [exchangeCompleted, isAuthenticated, sessionBusy]);

  const retry = useCallback(() => {
    connectingRef.current = false;
    void connect();
  }, [connect]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
      {failed ? (
        <div className="flex max-w-sm flex-col items-center gap-4">
          <h1 className="text-xl font-semibold">
            {t("miniappBridge.errorTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("miniappBridge.errorDescription")}
          </p>
          <Button variant="brand" onClick={retry}>
            {t("state.retry")}
          </Button>
        </div>
      ) : (
        <Spinner className="size-6" aria-label={t("miniappBridge.connecting")} />
      )}
    </main>
  );
}

function exchangeOnce(code: string): Promise<void> {
  if (!exchangeAttempt || exchangeAttempt.code !== code) {
    const promise = exchangeMiniappWebviewCode(code).catch((error) => {
      exchangeAttempt = undefined;
      throw error;
    });
    exchangeAttempt = { code, promise };
  }
  return exchangeAttempt.promise;
}

/**
 * Reads the one-time bridge code and the target PWA path from the fragment
 * the native shell composed, then strips the fragment before any further
 * request can leak it.
 */
function readAndClearBridgeState(): { code: string | null; path: string } {
  if (typeof window === "undefined" || window.location.pathname !== "/miniapp") {
    return { code: null, path: "/" };
  }
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const code = params.get("code")?.trim() || null;
  const path = sanitizeInternalPath(params.get("path"));
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}`,
  );
  return { code, path };
}

function sanitizeInternalPath(path: string | null): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}
