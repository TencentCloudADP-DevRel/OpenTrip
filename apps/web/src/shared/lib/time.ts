/** Localized "time ago" label for an ISO timestamp.
 *
 * Uses `Intl.RelativeTimeFormat` for recent instants (seconds → days) and falls
 * back to an absolute localized date for anything older than a week. */
export function formatRelativeTime(iso: string, locale: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";

  const diffMs = then - Date.now();
  const absSec = Math.abs(diffMs) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (absSec < 60) return rtf.format(Math.round(diffMs / 1000), "second");
  const absMin = absSec / 60;
  if (absMin < 60) return rtf.format(Math.round(diffMs / 60000), "minute");
  const absHour = absMin / 60;
  if (absHour < 24) return rtf.format(Math.round(diffMs / 3600000), "hour");
  const absDay = absHour / 24;
  if (absDay < 7) return rtf.format(Math.round(diffMs / 86400000), "day");

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(then);
}
