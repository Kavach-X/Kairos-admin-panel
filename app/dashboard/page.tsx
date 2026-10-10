import { Suspense } from "react";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <div className="pb-1">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Platform Overview
        </h1>
        <p className="text-xs text-muted-foreground">
          Hardware fleet allocation, live camera feeds, and operational triage
        </p>
      </div>

      {/* 4 Core Pillar Stats */}
      <Suspense fallback={<StatsGridSkeleton />}>
        <StatsGrid />
      </Suspense>

      {/* Two-column layout: Live Camera Events Feed (65%) + Operational Dial & Triage (35%) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<ActivitySkeleton />}>
            <RecentActivity />
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<SidebarSkeleton />}>
            <DashboardSidebar />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="border border-border/50 bg-card p-4 space-y-2 shadow-none"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="border border-border/50 bg-card shadow-none">
      <div className="flex justify-between items-center px-4 py-3 border-b border-border/40">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="divide-y divide-border/40">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3">
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="border border-border/50 bg-card shadow-none">
      <div className="flex justify-between items-center px-4 py-3 border-b border-border/40">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-10" />
      </div>
      <div className="p-4 flex flex-col items-center">
        <Skeleton className="size-28 rounded-full my-2" />
        <div className="w-full grid grid-cols-2 gap-2 pt-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16 ml-auto" />
        </div>
      </div>
      <div className="border-t border-border/40 divide-y divide-border/40">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="px-4 py-2.5 flex justify-between items-center">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
