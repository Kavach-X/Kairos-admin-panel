// Number / duration / day formatters shared by client charts and server-rendered overview tiles.
// No "use client": a server component calling a function exported from a client module gets a
// client reference, not the function.

const compactFmt = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const fullFmt = new Intl.NumberFormat("en");

export const formatCompact = (n: number) => (n < 1000 ? fullFmt.format(n) : compactFmt.format(n));
export const formatNumber = (n: number) => fullFmt.format(n);

export const formatPct = (part: number, whole: number) =>
  whole > 0 ? `${((part / whole) * 100).toFixed(part / whole >= 0.1 ? 0 : 1)}%` : "–";

export function formatDuration(sec: number | null | undefined) {
  if (sec === null || sec === undefined) return "–";
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`;
  return `${Math.floor(sec / 3600)}h ${Math.round((sec % 3600) / 60)}m`;
}

/** "2026-11-20" → local Date at midnight (no UTC shift). */
export const parseDay = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const formatDay = (day: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  parseDay(day).toLocaleDateString("en-IN", opts);
