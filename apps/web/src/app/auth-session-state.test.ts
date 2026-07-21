import { describe, expect, it } from "vitest";
import {
  bridgeRefreshFailed,
  resolveInitialSession,
} from "./auth-session-state";

describe("resolveInitialSession", () => {
  it("keeps the auth gate blocked throughout the initial fetch", () => {
    expect(
      resolveInitialSession(false, {
        isAuthenticated: false,
        sessionBusy: true,
      }),
    ).toBe(false);
  });

  it("resolves after an authenticated or signed-out result", () => {
    expect(
      resolveInitialSession(false, {
        isAuthenticated: true,
        sessionBusy: true,
      }),
    ).toBe(true);
    expect(
      resolveInitialSession(false, {
        isAuthenticated: false,
        sessionBusy: false,
      }),
    ).toBe(true);
  });

  it("stays resolved during later signed-out refetches", () => {
    expect(
      resolveInitialSession(true, {
        isAuthenticated: false,
        sessionBusy: true,
      }),
    ).toBe(true);
  });
});

describe("bridgeRefreshFailed", () => {
  it("fails only after the bridge refetch settles without a session", () => {
    expect(
      bridgeRefreshFailed(true, {
        isAuthenticated: false,
        sessionBusy: false,
      }),
    ).toBe(true);
    expect(
      bridgeRefreshFailed(true, {
        isAuthenticated: false,
        sessionBusy: true,
      }),
    ).toBe(false);
    expect(
      bridgeRefreshFailed(true, {
        isAuthenticated: true,
        sessionBusy: false,
      }),
    ).toBe(false);
  });
});
