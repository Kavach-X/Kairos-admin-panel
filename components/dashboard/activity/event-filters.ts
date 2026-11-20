import type { EventIncidentStatus } from "@/lib/types";
import type { EventStatusCounts } from "@/lib/actions/event.actions";

/** Status tabs on the events page. Each maps to the statuses it lists (empty = all). */
export const EVENT_TABS = [
  { key: "all", label: "All", statuses: [] },
  { key: "confirmed", label: "Confirmed", statuses: ["CONFIRMED_ALERT"] },
  { key: "false-alarm", label: "AI false alarms", statuses: ["DISCARDED_FALSE_ALARM"] },
  { key: "dismissed", label: "Dismissed", statuses: ["DISMISSED_BY_USER"] },
  { key: "pipeline", label: "In pipeline", statuses: ["PENDING_UPLOAD", "RECORDED", "PROCESSING_AI"] },
] as const satisfies ReadonlyArray<{ key: string; label: string; statuses: readonly EventIncidentStatus[] }>;

export type EventTabKey = (typeof EVENT_TABS)[number]["key"];

export const EVENT_RANGES = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "24h", label: "Last 24 hours" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "custom", label: "Custom range…" },
] as const;

const ROLLING_HOURS: Partial<Record<EventRangeKey, number>> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };

// "Today" / "Yesterday" are calendar days in India time (fixed +05:30, no DST), the same zone the
// analytics charts use; the server renders the first page and cannot know the browser's zone.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function istMidnight(daysAgo: number) {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() - daysAgo) - IST_OFFSET_MS);
}

export type EventRangeKey = (typeof EVENT_RANGES)[number]["key"];

export interface EventFilters {
  tab: EventTabKey;
  range: EventRangeKey;
  /** Custom range bounds as ISO timestamps (only with range "custom"). */
  from?: string;
  to?: string;
  threat?: string;
  deviceId?: string;
  accountId?: string;
  q?: string;
}

export const DEFAULT_EVENT_FILTERS: EventFilters = { tab: "all", range: "all" };

const THREATS = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"];

const validIso = (v: string | undefined) => (v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : undefined);

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

/** URL search params → filters (unknown values fall back to defaults). */
export function parseEventFilters(sp: Params): EventFilters {
  const tab = one(sp.tab);
  const range = one(sp.range);
  const threat = one(sp.threat);
  const from = validIso(one(sp.from));
  const to = validIso(one(sp.to));
  const parsedRange = EVENT_RANGES.some((r) => r.key === range) ? (range as EventRangeKey) : DEFAULT_EVENT_FILTERS.range;
  // A custom range needs at least one bound; otherwise fall back to the default.
  const customOk = parsedRange === "custom" && Boolean(from || to);
  return {
    tab: EVENT_TABS.some((t) => t.key === tab) ? (tab as EventTabKey) : DEFAULT_EVENT_FILTERS.tab,
    range: parsedRange === "custom" && !customOk ? DEFAULT_EVENT_FILTERS.range : parsedRange,
    from: customOk ? from : undefined,
    to: customOk ? to : undefined,
    threat: threat && THREATS.includes(threat) ? threat : undefined,
    deviceId: one(sp.device),
    accountId: one(sp.customer),
    q: one(sp.q)?.trim() || undefined,
  };
}

/** Filters (+ selected event) → URL query string, omitting defaults. */
export function eventFiltersToQuery(f: EventFilters, selectedId?: string | null) {
  const p = new URLSearchParams();
  if (f.tab !== DEFAULT_EVENT_FILTERS.tab) p.set("tab", f.tab);
  if (f.range !== DEFAULT_EVENT_FILTERS.range) p.set("range", f.range);
  if (f.range === "custom" && f.from) p.set("from", f.from);
  if (f.range === "custom" && f.to) p.set("to", f.to);
  if (f.threat) p.set("threat", f.threat);
  if (f.deviceId) p.set("device", f.deviceId);
  if (f.accountId) p.set("customer", f.accountId);
  if (f.q) p.set("q", f.q);
  if (selectedId) p.set("event", selectedId);
  return p.toString();
}

/** Filters → getEventsAction params. The range start is computed at request time. */
export function eventFiltersToRequest(f: EventFilters) {
  const tab = EVENT_TABS.find((t) => t.key === f.tab) ?? EVENT_TABS[0];
  let startDate: string | undefined;
  let endDate: string | undefined;
  if (f.range === "custom") {
    startDate = f.from;
    endDate = f.to;
  } else if (f.range === "today") {
    startDate = istMidnight(0).toISOString();
  } else if (f.range === "yesterday") {
    startDate = istMidnight(1).toISOString();
    endDate = new Date(istMidnight(0).getTime() - 1).toISOString(); // backend bound is inclusive
  } else if (ROLLING_HOURS[f.range]) {
    startDate = new Date(Date.now() - ROLLING_HOURS[f.range]! * 60 * 60 * 1000).toISOString();
  }
  return {
    status: tab.statuses.length ? tab.statuses.join(",") : undefined,
    threatLevel: f.threat,
    deviceId: f.deviceId,
    accountId: f.accountId,
    search: f.q,
    startDate,
    endDate,
  };
}

/** Badge count for a tab from per-status counts (which ignore the status filter). */
export function tabCount(counts: EventStatusCounts | undefined, tab: (typeof EVENT_TABS)[number]) {
  if (!counts) return undefined;
  const statuses: readonly string[] = tab.statuses.length ? tab.statuses : Object.keys(counts);
  return statuses.reduce((sum, s) => sum + (counts[s as EventIncidentStatus] ?? 0), 0);
}
