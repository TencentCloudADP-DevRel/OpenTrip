import { createContext, useContext, type ReactNode } from "react";

const MINIAPP_CONTAINER_KEY = "opentrip.container.wechat";

const EmbeddedEnvironmentContext = createContext(false);

export function detectMiniappContainer(): boolean {
  const isBootstrapPath = window.location.pathname === "/miniapp";
  if (isBootstrapPath) {
    try {
      window.sessionStorage.setItem(MINIAPP_CONTAINER_KEY, "1");
    } catch {
      // The current page still identifies the container when storage is blocked.
    }
    return true;
  }
  try {
    return window.sessionStorage.getItem(MINIAPP_CONTAINER_KEY) === "1";
  } catch {
    return false;
  }
}

export function EmbeddedEnvironmentProvider({
  embedded,
  children,
}: {
  embedded: boolean;
  children: ReactNode;
}) {
  return (
    <EmbeddedEnvironmentContext.Provider value={embedded}>
      {children}
    </EmbeddedEnvironmentContext.Provider>
  );
}

export function useIsMiniappEmbedded(): boolean {
  return useContext(EmbeddedEnvironmentContext);
}
