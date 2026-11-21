"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- list rows arrive in mixed camelCase/snake_case shapes */

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, ArrowUp, Camera, ChartColumn, Download, HardDrive, Loader2, Search, Video, X, Building2, Keyboard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getEventsAction, type EventStatusCounts } from "@/lib/actions/event.actions";
import type { AnalyticsFilterOptions, CameraEventDetail, CameraEventItem, EventIncidentStatus } from "@/lib/types";
import { EventRangePicker } from "./event-range-picker";
import { ExportEventsDialog } from "./export-events-dialog";
import {
  EVENT_TABS,
  eventFiltersToQuery,
  eventFiltersToRequest,
  tabCount,
  type EventFilters,
} from "./event-filters";
import { EventStatusBadge, ThreatBadge, dayHeading, formatEventTime } from "./event-badges";
import { EventQuickView, prefetchEventDetail } from "./event-quick-view";
import { useNow } from "@/components/dashboard/use-now";

const PAGE_SIZE = 30;
// The new-events check only asks for events after the newest one shown, up to this many.
const NEW_CHECK_LIMIT = 20;
const POLL_MS = 20_000;

export interface ActivityInitialData {
  events: CameraEventItem[];
  nextCursor: string | null;
  statusCounts?: EventStatusCounts;
  error?: string;
}

const createdAtOf = (e: any): string => e.createdAt || e.created_at;
const thumbOf = (e: any): string | undefined => {
  const t = e.cover_thumbnail ?? e.thumbnails?.[0];
  return t?.view_url || t?.viewUrl || t?.thumbnailUrl || t?.thumbnail_url;
};

/** The split view (list + review pane) only exists on wide screens; narrow screens open the full page. */
function useWide() {
  const [wide, setWide] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return wide;
}

const isTypingTarget = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

export function ActivityPageClient({
  initial,
  initialFilters,
  initialSelectedId,
  options,
}: {
  initial: ActivityInitialData;
  initialFilters: EventFilters;
  initialSelectedId?: string;
  options: AnalyticsFilterOptions;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const wide = useWide();
  const nowMs = useNow();
  const now = nowMs === null ? null : new Date(nowMs);

  const [filters, setFilters] = React.useState<EventFilters>(initialFilters);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState(initialFilters.q ?? "");
  const [events, setEvents] = React.useState<CameraEventItem[]>(initial.events);
  const [nextCursor, setNextCursor] = React.useState<string | null>(initial.nextCursor);
  const [counts, setCounts] = React.useState<EventStatusCounts | undefined>(initial.statusCounts);
  const [error, setError] = React.useState<string | undefined>(initial.error);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [newCount, setNewCount] = React.useState(0);
  const [chosenId, setSelectedId] = React.useState<string | null>(initialSelectedId ?? null);
  const [reviewOpen, setReviewOpen] = React.useState(false);

  // Wide screens always show something in the review pane: the chosen event, else the newest.
  // A chosen event that is not in the current list (deep link, filtered out) stays open.
  const selectedId = chosenId ?? (wide ? (events[0]?.id ?? null) : null);

  const searchRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const requestId = React.useRef(0);

  // Filters and the selected event live in the URL (shareable, survives reload) without a server round trip.
  React.useEffect(() => {
    const qs = eventFiltersToQuery(filters, chosenId);
    window.history.replaceState(window.history.state, "", qs ? `${pathname}?${qs}` : pathname);
  }, [filters, chosenId, pathname]);

  const loadFirstPage = React.useCallback(async (f: EventFilters) => {
    const id = ++requestId.current;
    setLoading(true);
    const res = await getEventsAction({ ...eventFiltersToRequest(f), limit: PAGE_SIZE, includeCounts: true });
    if (id !== requestId.current) return; // a newer filter change superseded this one
    if (res.success && res.data) {
      setEvents(res.data.items);
      setNextCursor(res.data.nextCursor);
      setCounts(res.data.statusCounts);
      setError(undefined);
    } else {
      setError(res.error || "Failed to load events");
    }
    setNewCount(0);
    setLoading(false);
    listRef.current?.scrollTo({ top: 0 });
  }, []);

  const applyFilters = (next: EventFilters) => {
    setFilters(next);
    loadFirstPage(next);
  };

  // Debounced search box → filters.q
  React.useEffect(() => {
    const q = searchInput.trim() || undefined;
    if (q === filters.q) return;
    const t = setTimeout(() => applyFilters({ ...filters, q }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed text should trigger this
  }, [searchInput]);

  const loadMore = React.useCallback(async () => {
    if (!nextCursor || loadingMore || loading) return;
    const id = requestId.current;
    setLoadingMore(true);
    const res = await getEventsAction({ ...eventFiltersToRequest(filters), limit: PAGE_SIZE, cursor: nextCursor });
    if (id === requestId.current && res.success && res.data) {
      const seen = new Set(events.map((e) => e.id));
      setEvents((prev) => [...prev, ...res.data!.items.filter((e) => !seen.has(e.id))]);
      setNextCursor(res.data.nextCursor);
    }
    setLoadingMore(false);
  }, [nextCursor, loadingMore, loading, filters, events]);

  // Infinite scroll: fetch the next keyset page when the sentinel nears the bottom of the list.
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), {
      root: wide ? listRef.current : null,
      rootMargin: "400px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, wide]);

  // Poll for newer events under the same filters; show a banner instead of shifting the list under the reader.
  // One steady timer per filter set: the latest list and loading state are read through refs, and each check
  // asks only for events after the newest one shown (a small query, not a full page).
  const pollState = React.useRef({ events, loading });
  React.useEffect(() => {
    pollState.current = { events, loading };
  }, [events, loading]);
  React.useEffect(() => {
    const tick = async () => {
      const { events: shown, loading: busy } = pollState.current;
      if (document.visibilityState !== "visible" || busy) return;
      const request = eventFiltersToRequest(filters);
      // A range that ended in the past can't get new events.
      if (request.endDate && new Date(request.endDate).getTime() < Date.now()) return;
      const newest = shown[0] ? createdAtOf(shown[0]) : null;
      const res = await getEventsAction({ ...request, ...(newest ? { startDate: newest } : {}), limit: NEW_CHECK_LIMIT });
      if (!res.success || !res.data) return;
      const known = new Set(shown.map((e) => e.id));
      setNewCount(res.data.items.filter((e) => !known.has(e.id) && (!newest || createdAtOf(e) > newest)).length);
    };
    const t = setInterval(tick, POLL_MS);
    return () => clearInterval(t);
  }, [filters]);

  const selectedIndex = events.findIndex((e) => e.id === selectedId);

  // Warm the next event's details so J is instant.
  React.useEffect(() => {
    if (wide && selectedIndex >= 0) prefetchEventDetail(events[selectedIndex + 1]?.id);
  }, [wide, selectedIndex, events]);

  const select = (id: string) => {
    if (!wide) {
      router.push(`/dashboard/activity/${encodeURIComponent(id)}`);
      return;
    }
    setSelectedId(id);
    document.getElementById(`event-row-${id}`)?.scrollIntoView({ block: "nearest" });
  };

  // Keyboard triage: J/K or arrows move, R reviews, Enter opens the full page, / searches.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const move = (delta: number) => {
        const next = events[Math.min(events.length - 1, Math.max(0, (selectedIndex < 0 ? -1 : selectedIndex) + delta))];
        if (next) {
          e.preventDefault();
          setSelectedId(next.id);
          document.getElementById(`event-row-${next.id}`)?.scrollIntoView({ block: "nearest" });
          if (events.indexOf(next) >= events.length - 5) loadMore();
        }
      };
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (!wide) {
        return;
      } else if (e.key === "j" || e.key === "ArrowDown") move(1);
      else if (e.key === "k" || e.key === "ArrowUp") move(-1);
      else if (e.key === "r" && selectedId) {
        e.preventDefault();
        setReviewOpen(true);
      } else if (e.key === "Enter" && selectedId) {
        e.preventDefault();
        router.push(`/dashboard/activity/${encodeURIComponent(selectedId)}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [events, selectedIndex, selectedId, wide, router, loadMore]);

  // After a review: patch the row and the tab counts locally, then move on to the next event.
  const onReviewed = (fresh: CameraEventDetail) => {
    const before = events.find((e) => e.id === fresh.id)?.status as EventIncidentStatus | undefined;
    setEvents((prev) => prev.map((e) => (e.id === fresh.id ? { ...e, status: fresh.status, threatLevel: fresh.threatLevel } : e)));
    if (before && before !== fresh.status) {
      setCounts((c) => c && { ...c, [before]: Math.max(0, (c[before] ?? 0) - 1), [fresh.status]: (c[fresh.status] ?? 0) + 1 });
    }
    const next = events[selectedIndex + 1];
    if (next) setSelectedId(next.id);
  };

  const activeFilterCount = [filters.threat, filters.deviceId, filters.accountId, filters.q].filter(Boolean).length + (filters.range !== "all" ? 1 : 0);
  const deviceOptions = [
    { value: "", label: "All devices" },
    ...options.devices
      .filter((d) => !filters.accountId || d.accountId === filters.accountId)
      .map((d) => ({ value: d.deviceId, label: d.deviceId, subLabel: d.accountName ?? "Unassigned" })),
  ];
  const customerOptions = [{ value: "", label: "All customers" }, ...options.customers.map((c) => ({ value: c.id, label: c.name }))];

  // Day separator before the first event of each day.
  const headings = events.map((ev, i) => {
    if (!now) return null;
    const h = dayHeading(createdAtOf(ev), now);
    return i === 0 || h !== dayHeading(createdAtOf(events[i - 1]), now) ? h : null;
  });

  // On wide screens the page is exactly the viewport below the app header (8rem = header + inset
  // margin + main padding): only the list and the review pane scroll, never the page as well.
  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-8rem)] lg:min-h-[30rem]">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Events</h1>
          <p className="text-xs text-muted-foreground">Camera detections, AI verdicts and operator reviews</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="hidden items-center gap-1.5 text-muted-foreground lg:flex" title="Keyboard shortcuts">
            <Keyboard className="size-3.5" />
            <kbd className="rounded border border-border px-1 font-mono text-[10px]">J</kbd>
            <kbd className="rounded border border-border px-1 font-mono text-[10px]">K</kbd> move ·
            <kbd className="rounded border border-border px-1 font-mono text-[10px]">R</kbd> review ·
            <kbd className="rounded border border-border px-1 font-mono text-[10px]">↵</kbd> open ·
            <kbd className="rounded border border-border px-1 font-mono text-[10px]">/</kbd> search
          </span>
          <Link href="/dashboard/analytics" className="flex items-center gap-1 font-medium text-primary hover:underline">
            <ChartColumn className="size-3.5" />
            Analytics
          </Link>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setExportOpen(true)}>
            <Download className="size-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      {/* The underline is an inset shadow, not a border the tabs overlap: nothing overflows vertically,
          so the horizontal scroll (narrow screens) never brings a vertical scrollbar with it. */}
      <div
        className="flex shrink-0 gap-1 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--border)] [scrollbar-width:none]"
        role="tablist"
        aria-label="Event status"
      >
        {EVENT_TABS.map((t) => {
          const n = tabCount(counts, t);
          const active = filters.tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => applyFilters({ ...filters, tab: t.key })}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs transition-colors ${
                active ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {n !== undefined && (
                <span className={`rounded-full px-1.5 font-mono text-[10px] ${active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {n.toLocaleString("en-IN")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder="Search label, device or event ID  ( / )"
            className="h-8 border-border/50 bg-card pl-8 pr-8 text-xs shadow-none"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Escape") return;
              e.currentTarget.blur();
              setSearchInput("");
            }}
          />
          {searchInput && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <EventRangePicker filters={filters} onChange={(range, from, to) => applyFilters({ ...filters, range, from, to })} />
        <select
          aria-label="Severity"
          value={filters.threat ?? ""}
          onChange={(e) => applyFilters({ ...filters, threat: e.target.value || undefined })}
          className="h-8 rounded-md border border-border/50 bg-card px-2.5 text-xs text-foreground/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">All severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
          <option value="NONE">Info</option>
        </select>
        <SearchableSelect
          className="w-44"
          options={customerOptions}
          value={filters.accountId ?? ""}
          onValueChange={(v) => {
            const keepDevice = options.devices.some((d) => d.deviceId === filters.deviceId && d.accountId === v);
            applyFilters({ ...filters, accountId: v || undefined, deviceId: keepDevice ? filters.deviceId : undefined });
          }}
          placeholder="All customers"
          searchPlaceholder="Search customers..."
        />
        <SearchableSelect
          className="w-48"
          options={deviceOptions}
          value={filters.deviceId ?? ""}
          onValueChange={(v) => applyFilters({ ...filters, deviceId: v || undefined })}
          placeholder="All devices"
          searchPlaceholder="Search devices..."
        />
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs text-muted-foreground"
            onClick={() => {
              setSearchInput("");
              applyFilters({ tab: filters.tab, range: "all", from: undefined, to: undefined });
            }}
          >
            <X className="size-3.5" />
            Clear filters
          </Button>
        )}
        {loading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label="Loading" />}
      </div>

      {/* List + review pane */}
      <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(340px,420px)_1fr] lg:grid-rows-[minmax(0,1fr)]">
        <div className="relative flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/60 bg-card">
          {newCount > 0 && (
            <button
              onClick={() => loadFirstPage(filters)}
              className="absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground shadow-md hover:bg-primary/90"
            >
              <ArrowUp className="size-3" />
              {newCount >= NEW_CHECK_LIMIT ? `${NEW_CHECK_LIMIT}+` : newCount} new {newCount === 1 ? "event" : "events"}
            </button>
          )}

          <div
            ref={listRef}
            className={`lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain transition-opacity ${loading ? "opacity-60" : ""}`}
            aria-busy={loading}
          >
            {error && events.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                <p className="text-sm font-medium text-foreground">Couldn&apos;t load events</p>
                <p className="text-xs text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" className="mt-1 h-8 text-xs" onClick={() => loadFirstPage(filters)}>
                  Retry
                </Button>
              </div>
            ) : events.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground">
                <Activity className="mb-2 size-8 stroke-1 opacity-40" />
                <p className="text-sm font-medium">No events found</p>
                <p className="mt-0.5 text-xs text-muted-foreground/70">
                  {activeFilterCount > 0 || filters.tab !== "all" ? "Try another tab or clear the filters." : "Camera events will appear here."}
                </p>
              </div>
            ) : (
              <ul>
                {events.map((ev: any, i) => {
                  const created = createdAtOf(ev);
                  const heading = headings[i];
                  const thumb = thumbOf(ev);
                  const selected = wide && ev.id === selectedId;
                  const hasClip = (ev.videoCount ?? ev.video_count ?? 0) > 0;
                  return (
                    <React.Fragment key={ev.id}>
                      {heading && (
                        <li className="sticky top-0 z-[1] border-b border-border/40 bg-muted/70 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground backdrop-blur">
                          {heading}
                        </li>
                      )}
                      <li
                        id={`event-row-${ev.id}`}
                        role="button"
                        tabIndex={0}
                        aria-current={selected || undefined}
                        onClick={() => select(ev.id)}
                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget === e.target && select(ev.id)}
                        onMouseEnter={() => wide && prefetchEventDetail(ev.id)}
                        className={`flex cursor-pointer gap-3 border-b border-l-2 border-b-border/30 px-3 py-2.5 outline-none transition-colors focus-visible:bg-muted/40 ${
                          selected ? "border-l-primary bg-primary/5" : "border-l-transparent hover:bg-muted/30"
                        }`}
                      >
                        <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded border border-border/40 bg-muted/50">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element -- signed R2 URL, not optimizable
                            <img
                              src={thumb}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.visibility = "hidden";
                              }}
                            />
                          ) : (
                            <Camera className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/60" />
                          )}
                          {hasClip && (
                            <Video className="absolute bottom-0.5 right-0.5 size-3 rounded-sm bg-black/60 p-[1px] text-white" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-medium text-foreground">
                              {ev.edgeLabel || ev.edge_label || "Detection"}
                            </span>
                            <span
                              className="shrink-0 text-[10px] text-muted-foreground"
                              title={now ? new Date(created).toLocaleString() : undefined}
                            >
                              {now ? formatEventTime(created, now) : ""}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            <ThreatBadge level={ev.threatLevel || ev.threat_level} />
                            <EventStatusBadge status={ev.status} />
                          </div>
                          <div className="flex items-center gap-2 truncate text-[11px] text-muted-foreground">
                            <span className="flex min-w-0 items-center gap-1 truncate">
                              <Building2 className="size-3 shrink-0" />
                              <span className="truncate">{ev.account?.name || "—"}</span>
                            </span>
                            <span className="flex shrink-0 items-center gap-1 font-mono text-[10px]">
                              <HardDrive className="size-3" />
                              {ev.deviceId || ev.device_id}
                            </span>
                          </div>
                        </div>
                      </li>
                    </React.Fragment>
                  );
                })}
                {loading && events.length === 0 &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <li key={i} className="flex gap-3 border-b border-border/30 px-3 py-2.5">
                      <Skeleton className="h-11 w-16" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </li>
                  ))}
              </ul>
            )}
            <div ref={sentinelRef} className="flex justify-center py-3 text-[11px] text-muted-foreground">
              {loadingMore ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : nextCursor ? (
                <button onClick={loadMore} className="hover:text-foreground">
                  Load more
                </button>
              ) : events.length > 0 ? (
                <span>End of list</span>
              ) : null}
            </div>
          </div>
        </div>

        {wide && (
          <div className="min-h-0 overflow-y-auto overscroll-contain rounded-lg border border-border/60 bg-card">
            {selectedId ? (
              <EventQuickView
                eventId={selectedId}
                reviewOpen={reviewOpen}
                onReviewOpenChange={setReviewOpen}
                onReviewed={onReviewed}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Select an event to review it here
              </div>
            )}
          </div>
        )}
      </div>

      <ExportEventsDialog open={exportOpen} onOpenChange={setExportOpen} initialFilters={filters} />
    </div>
  );
}
