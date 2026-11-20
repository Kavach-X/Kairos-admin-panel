import { Skeleton } from "@/components/ui/skeleton";
import { SURFACE } from "@/components/dashboard/detail-header";

/*
 * Skeletons are built from the same pieces as the real pages (SURFACE cards, tile, panel, tab bar,
 * detail header) and each bar sits in a box with the real line height, so nothing jumps when data lands.
 */

/** A placeholder bar inside a box the height of the text line it stands in for. */
function Line({ box = "h-4", bar = "h-3", className = "" }: { box?: string; bar?: string; className?: string }) {
  return (
    <div className={`flex items-center ${box}`}>
      <Skeleton className={`${bar} ${className}`} />
    </div>
  );
}

/** Matches StatTile: label, big value, footer. */
export function TileSkeleton() {
  return (
    <div className={`${SURFACE} space-y-1.5 p-4`}>
      <Line className="w-20" />
      <Line box="h-8" bar="h-6" className="w-16" />
      <Line className="w-28" />
    </div>
  );
}

export function TileRowSkeleton({ count = 4 }: { count?: number }) {
  const cols = count === 3 ? "lg:grid-cols-3" : count === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4";
  return (
    <div className={`grid grid-cols-2 gap-3 ${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <TileSkeleton key={i} />
      ))}
    </div>
  );
}

/** Matches CardShell: header strip, then either a block (charts) or text lines. */
export function PanelSkeleton({
  body,
  lines = 0,
  subtitle = false,
  className = "",
}: {
  /** Height class of a single block in the body, e.g. "h-52". */
  body?: string;
  lines?: number;
  subtitle?: boolean;
  className?: string;
}) {
  return (
    <div className={`${SURFACE} ${className}`}>
      <div className="border-b border-border/40 px-4 py-3">
        <Line bar="h-2.5" className="w-24" />
        {subtitle && <Line bar="h-2.5" className="mt-0.5 w-44" />}
      </div>
      <div className="space-y-2 p-4">
        {body && <Skeleton className={`w-full ${body}`} />}
        {Array.from({ length: lines }).map((_, i) => (
          <Line key={i} className={i % 3 === 2 ? "w-2/3" : "w-full"} />
        ))}
      </div>
    </div>
  );
}

/** Matches StatusTabs: px-3 py-2 buttons with a 2px underline slot, over a 1px rule. */
export function TabsSkeleton({ widths }: { widths: number[] }) {
  return (
    <div className="flex gap-1 shadow-[inset_0_-1px_0_var(--border)]">
      {widths.map((w, i) => (
        <div key={i} className="flex h-4 box-content items-center border-b-2 border-transparent px-3 py-2">
          <Skeleton className="h-3" style={{ width: w }} />
        </div>
      ))}
    </div>
  );
}

/** Matches DetailHeader: breadcrumb, title + badges, meta line, actions. */
export function DetailHeaderSkeleton({ actions = 1, titleWidth = "w-48" }: { actions?: number; titleWidth?: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1.5">
        <Line className="w-32" />
        <div className="flex items-center gap-2">
          <Line box="h-7" bar="h-5" className={titleWidth} />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Line className="w-80 max-w-full" />
      </div>
      {actions > 0 && (
        <div className="flex gap-2">
          {Array.from({ length: actions }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
      )}
    </div>
  );
}

function PageHeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="flex items-center justify-between pb-1">
      <div>
        <Line box="h-7" bar="h-5" className="w-40" />
        <Line className="w-72 max-w-full" />
      </div>
      {action && <Skeleton className="h-8 w-28" />}
    </div>
  );
}

function TableSkeleton({ columns, rows }: { columns: number; rows: number }) {
  return (
    <div className={`${SURFACE} overflow-hidden`}>
      <div className="flex gap-6 border-b border-border/40 bg-muted/30 px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-6 border-b border-border/30 px-4 py-3.5 last:border-0">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className={`h-3 flex-1 ${c === 0 ? "max-w-32" : ""}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** List pages (users, bank details): header, search, rows. */
export function ListPageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <PageHeaderSkeleton />
      <Skeleton className="h-8 w-full sm:w-72" />
      <TableSkeleton columns={5} rows={rows} />
    </div>
  );
}

/** Vendor profile / account: header, tiles and two columns of panels. */
export function DetailPageSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <DetailHeaderSkeleton />
      <TileRowSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        <PanelSkeleton lines={5} />
        <PanelSkeleton lines={5} />
      </div>
    </div>
  );
}

/** Events page: header, status tabs, filter row, then the list + review pane split (same sizes as the page). */
export function EventsPageSkeleton() {
  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-8rem)] lg:min-h-[30rem]" aria-busy="true">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="hidden h-3 w-72 lg:block" />
      </div>
      <TabsSkeleton widths={[56, 90, 110, 84, 96]} />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(340px,420px)_1fr] lg:grid-rows-[minmax(0,1fr)]">
        <div className={`${SURFACE} overflow-hidden`}>
          <div className="border-b border-border/40 bg-muted/50 px-3 py-1.5">
            <Skeleton className="h-2.5 w-12" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-3 border-b border-border/30 px-3 py-2.5">
              <Skeleton className="h-11 w-16 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-2.5 w-12" />
                </div>
                <div className="flex gap-1">
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-2.5 w-40" />
              </div>
            </div>
          ))}
        </div>
        <div className={`${SURFACE} hidden space-y-4 p-4 lg:block`}>
          <div className="flex justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-60" />
            </div>
            <Skeleton className="h-8 w-28" />
          </div>
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-14 w-full" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** List pages (devices, vendors, customers, tickets): header, stat tiles, status tabs, search, table. */
export function TablePageSkeleton({ tiles = 4, tabs = 4, columns = 6, rows = 8 }: { tiles?: number; tabs?: number; columns?: number; rows?: number }) {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <PageHeaderSkeleton />
      {tiles > 0 && <TileRowSkeleton count={tiles} />}
      <div className="flex flex-col gap-3">
        {tabs > 0 && <TabsSkeleton widths={Array.from({ length: tabs }, (_, i) => 56 + ((i * 23) % 40))} />}
        <Skeleton className="h-8 w-full sm:w-72" />
      </div>
      <TableSkeleton columns={columns} rows={rows} />
    </div>
  );
}

/** Device models: header, then the models table. */
export function CardGridPageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <PageHeaderSkeleton />
      <TableSkeleton columns={8} rows={3} />
    </div>
  );
}

/** Device page: header, tabs, then the Health tab (verdict + detection, vitals). */
export function DeviceDetailSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <DetailHeaderSkeleton actions={0} titleWidth="w-56" />
      <TabsSkeleton widths={[48, 52, 64, 120]} />
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_17rem]">
        <div className={`${SURFACE} space-y-4 p-4`}>
          <Line box="h-6" bar="h-5" className="w-2/3" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Line className="w-12" />
                <Line box="h-5" className="w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="h-3 w-full" />
        </div>
        <PanelSkeleton lines={3} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[112px] animate-pulse rounded-lg border border-border/60 bg-muted/30" />
        ))}
      </div>
    </div>
  );
}

/** Customer page: header with actions, tiles, tab bar, then the default Edge boxes table. */
export function CustomerDetailSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <DetailHeaderSkeleton actions={3} />
      <TileRowSkeleton />
      <TabsSkeleton widths={[76, 56, 48, 104]} />
      <TableSkeleton columns={5} rows={3} />
    </div>
  );
}

/** Event page: header, media + AI analysis on the left, decision / detection / source / timeline on the right. */
export function EventDetailSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <DetailHeaderSkeleton actions={2} titleWidth="w-32" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className={`${SURFACE} overflow-hidden`}>
            <div className="aspect-video w-full bg-zinc-950" />
            <div className="flex gap-2 border-t border-border/40 p-2">
              <Skeleton className="h-12 w-20" />
              <Skeleton className="h-12 w-20" />
            </div>
          </div>
          <PanelSkeleton lines={4} />
        </div>
        <div className="flex flex-col gap-4">
          <PanelSkeleton lines={2} />
          <PanelSkeleton lines={2} />
          <PanelSkeleton lines={5} />
          <PanelSkeleton lines={5} />
        </div>
      </div>
    </div>
  );
}
