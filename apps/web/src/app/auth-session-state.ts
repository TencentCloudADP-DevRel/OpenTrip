export interface SessionStatus {
  isAuthenticated: boolean;
  sessionBusy: boolean;
}

export function resolveInitialSession(
  wasResolved: boolean,
  status: SessionStatus,
): boolean {
  return wasResolved || status.isAuthenticated || !status.sessionBusy;
}

export function bridgeRefreshFailed(
  exchangeCompleted: boolean,
  status: SessionStatus,
): boolean {
  return exchangeCompleted && !status.sessionBusy && !status.isAuthenticated;
}
