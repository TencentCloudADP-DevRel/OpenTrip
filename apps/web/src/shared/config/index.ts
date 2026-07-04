/** Runtime configuration derived from Vite env. */
export const config = {
  /** API origin. Empty string means same-origin (dev proxy / prod reverse proxy). */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
} as const;

/** React Query keys, centralized to avoid string drift. */
export const queryKeys = {
  trips: ["trips"] as const,
  trip: (id: string) => ["trips", id] as const,
  session: ["session"] as const,
};
