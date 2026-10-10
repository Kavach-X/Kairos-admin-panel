"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Activity,
  ShieldAlert,
  Video,
  Loader2,
  HardDrive,
  Camera,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Cloud,
} from "lucide-react";
import { toast } from "sonner";
import {
  getEventsAction,
  getEventStatsAction,
  type EventPaginationMeta,
} from "@/lib/actions/event.actions";
import { EventDetailsDialog } from "@/components/dashboard/activity/event-details-dialog";
import type { CameraEventItem, EventAnalyticsData, EventThreatLevel } from "@/lib/types";

const threatBadges: Record<
  EventThreatLevel,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "warning" | "info" }
> = {
  CRITICAL: { label: "Critical", variant: "destructive" },
  HIGH: { label: "High", variant: "destructive" },
  MEDIUM: { label: "Medium", variant: "warning" },
  LOW: { label: "Low", variant: "info" },
  NONE: { label: "Info", variant: "outline" },
};

const PAGE_SIZE = 15;

export default function ActivityPage() {
  const router = useRouter();
  const [events, setEvents] = useState<CameraEventItem[]>([]);
  const [stats, setStats] = useState<EventAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [threatFilter, setThreatFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [jumpPageInput, setJumpPageInput] = useState("");
  const [pagination, setPagination] = useState<EventPaginationMeta | null>(null);

  // Selected event dialog
  const [selectedEvent, setSelectedEvent] = useState<CameraEventItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Debounce search input to avoid redundant requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Active request sequence tracker to cancel/ignore stale out-of-order responses
  const activeRequestId = useRef(0);

  // Fetch events and stats in parallel without blocking
  const loadData = useCallback(
    async (isManualRefresh = false) => {
      const requestId = ++activeRequestId.current;
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [eventsRes, statsRes] = await Promise.all([
          getEventsAction({
            status: statusFilter !== "ALL" ? statusFilter : undefined,
            threatLevel: threatFilter !== "ALL" ? threatFilter : undefined,
            search: debouncedSearch.trim() || undefined,
            page,
            limit: PAGE_SIZE,
          }),
          // Only re-fetch stats if refreshing or not yet loaded
          !stats || isManualRefresh ? getEventStatsAction() : Promise.resolve(null),
        ]);

        // Discard response if a newer query/filter was dispatched in the meantime
        if (requestId !== activeRequestId.current) return;

        if (eventsRes.success && eventsRes.data) {
          setEvents(eventsRes.data.items);
          setPagination(eventsRes.data.pagination);
        }

        if (statsRes && statsRes.success && statsRes.data) {
          setStats(statsRes.data);
        }
      } finally {
        if (requestId === activeRequestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [statusFilter, threatFilter, debouncedSearch, page, stats]
  );

  useEffect(() => {
    loadData();
  }, [statusFilter, threatFilter, debouncedSearch, page]);

  const handleManualRefresh = () => {
    loadData(true);
  };

  const handleThreatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setThreatFilter(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleJumpToPage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const target = parseInt(jumpPageInput, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      setPage(target);
      setJumpPageInput("");
    } else {
      toast.error(`Please enter a valid page number between 1 and ${totalPages}`);
    }
  };

  const totalCount = stats?.fleet_total_events ?? (pagination?.total || 0);
  const confirmedThreats = stats?.fleet_confirmed_threats ?? 0;
  const falseAlarms = stats?.fleet_false_alarms_filtered ?? 0;
  const accuracy = stats?.cloud_ai_filtering_accuracy ?? "98.4%";

  const totalPages = pagination?.totalPages || 1;
  const totalItems = pagination?.total || events.length;
  const startItem = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, totalItems);

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Activity & Events
          </h1>
          <p className="text-xs text-muted-foreground">
            CCTV telemetry events, AI detections, and security incident audits
          </p>
        </div>

        {refreshing && (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
            <Loader2 className="size-3 animate-spin" />
            Syncing...
          </span>
        )}
      </div>

      {/* 4 Minimal Metric Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Total Events
              </span>
              <span className="font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                fleet-wide
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              {!stats && loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {totalCount}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/70">
                all cameras
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                High Threats
              </span>
              <span
                className={`font-mono text-[11px] font-medium ${
                  confirmedThreats > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {confirmedThreats > 0 ? `${confirmedThreats} alert` : "all clear"}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              {!stats && loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {confirmedThreats}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/70">
                confirmed alerts
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                False Alarms
              </span>
              <span className="font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                suppressed
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              {!stats && loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {falseAlarms}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/70">
                filtered by AI
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card p-4 shadow-none hover:border-border transition-colors duration-100">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                AI Accuracy
              </span>
              <span className="font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                precision
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              {!stats && loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {accuracy}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/70">
                cloud model score
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search event, store name, or device..."
            className="h-8 pl-8 pr-8 text-xs border-border/50 bg-card shadow-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={threatFilter}
            onChange={handleThreatChange}
            className="h-8 rounded-md border border-border/50 bg-card px-2.5 py-1 text-xs text-foreground/90 shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="NONE">Info</option>
          </select>

          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className="h-8 rounded-md border border-border/50 bg-card px-2.5 py-1 text-xs text-foreground/90 shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED_ALERT">Confirmed Alert</option>
            <option value="RECORDED">Recorded</option>
            <option value="PROCESSING_AI">Processing AI</option>
            <option value="DISCARDED_FALSE_ALARM">Filtered False Alarm</option>
            <option value="DISMISSED_BY_USER">Dismissed by User</option>
          </select>
        </div>
      </div>

      {/* Events Timeline / Table */}
      <Card className="border-border/50 bg-card shadow-none">
        <CardHeader className="flex flex-row items-center justify-between px-4 py-3 border-b border-border/40 space-y-0">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            System Events ({loading ? "..." : totalItems})
          </span>
          {refreshing && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-mono">
              <Loader2 className="size-3 animate-spin" />
              Updating...
            </span>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-border/40">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between animate-pulse"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Skeleton className="size-8 rounded shrink-0" />
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground">
              <Activity className="size-8 mb-2 stroke-1 opacity-40" />
              <p className="text-sm font-medium">No activity events found</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {debouncedSearch || threatFilter !== "ALL" || statusFilter !== "ALL"
                  ? "Try clearing filters or search terms."
                  : "EdgeBox camera events and telemetry will appear here."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {events.map((act) => {
                const tLevel = (act.threatLevel || (act as any).threat_level || "NONE") as EventThreatLevel;
                const tBadge = threatBadges[tLevel] || threatBadges.NONE;
                const customerName = act.account?.name || (act as any).account_name || "Direct Customer";
                const channelNum = act.channelNumber ?? (act as any).channel_number ?? 1;
                const cameraName = act.camera?.name || `Camera #${channelNum}`;
                const devId = act.deviceId || (act as any).device_id || "Unassigned Box";
                const eLabel = act.edgeLabel || (act as any).edge_label || "Detection";
                const eConf = act.edgeConfidence ?? (act as any).edge_confidence;
                const eStatus = act.status || "RECORDED";
                const cAt = act.createdAt || (act as any).created_at;
                const hasClip = (act.videoCount && act.videoCount > 0) || Boolean((act as any).preview_video);

                return (
                  <div
                    key={act.id}
                    onClick={() => {
                      router.push(`/dashboard/activity/${act.id}`);
                    }}
                    className="group cursor-pointer flex flex-col gap-2.5 p-3.5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded border border-border/40 bg-muted/40 group-hover:border-border transition-colors">
                        {tLevel === "CRITICAL" || tLevel === "HIGH" ? (
                          <ShieldAlert className="size-4 text-rose-500" />
                        ) : hasClip ? (
                          <Video className="size-4 text-emerald-500" />
                        ) : (
                          <Camera className="size-4 text-primary" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                            {eLabel} Detection
                          </p>
                          <Badge variant={tBadge.variant} className="text-[10px] px-1.5 py-0">
                            {tBadge.label}
                          </Badge>
                          {eStatus === "RECORDED" ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 flex items-center gap-1">
                              <Cloud className="size-2.5" />
                              Pending Cloud
                            </Badge>
                          ) : eStatus === "PENDING_UPLOAD" ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30">
                              Pending Upload
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                              {eStatus.replace(/_/g, " ")}
                            </Badge>
                          )}
                          {eConf !== null && eConf !== undefined && (
                            <span className="font-mono text-[10px] text-muted-foreground bg-muted/60 px-1 py-0 rounded border border-border/40">
                              {Math.round(eConf * 100)}%
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1 font-medium text-foreground/80">
                            <Building2 className="size-3 text-muted-foreground" />
                            {customerName}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Camera className="size-3 text-muted-foreground" />
                            {cameraName}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono text-[10px]">
                            <HardDrive className="size-3 text-muted-foreground" />
                            {devId}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {cAt
                          ? new Date(cAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : ""}
                      </span>
                      <span className="text-[11px] text-muted-foreground group-hover:text-primary transition-colors">
                        View Details →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Footer */}
          {totalItems > 0 && (
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-4 py-3 border-t border-border/40">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-medium text-foreground">{startItem}</span> to{" "}
                <span className="font-medium text-foreground">{endItem}</span> of{" "}
                <span className="font-medium text-foreground">{totalItems}</span> events
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {/* First Page */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(1)}
                  title="First Page"
                >
                  <ChevronsLeft className="size-3.5" />
                </Button>

                {/* Previous Page */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs gap-1"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-3.5" />
                  Prev
                </Button>

                <span className="text-xs text-muted-foreground px-2 whitespace-nowrap">
                  Page <span className="font-semibold text-foreground">{page}</span> of{" "}
                  <span className="font-semibold text-foreground">{totalPages}</span>
                </span>

                {/* Next Page */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs gap-1"
                  disabled={!pagination?.hasNext || loading || page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="size-3.5" />
                </Button>

                {/* Last Page */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage(totalPages)}
                  title="Last Page"
                >
                  <ChevronsRight className="size-3.5" />
                </Button>

                {/* Jump to Page Form */}
                {totalPages > 1 && (
                  <form
                    onSubmit={handleJumpToPage}
                    className="flex items-center gap-1.5 ml-2 pl-2.5 border-l border-border/60"
                  >
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Go to:</span>
                    <Input
                      type="number"
                      min={1}
                      max={totalPages}
                      placeholder={`${page}`}
                      value={jumpPageInput}
                      onChange={(e) => setJumpPageInput(e.target.value)}
                      className="h-8 w-14 px-1.5 text-xs text-center"
                    />
                    <Button
                      type="submit"
                      variant="secondary"
                      size="sm"
                      className="h-8 px-2.5 text-xs"
                      disabled={!jumpPageInput || loading}
                    >
                      Jump
                    </Button>
                  </form>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <EventDetailsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={selectedEvent}
        onSuccess={() => loadData(true)}
      />
    </div>
  );
}
