"use client";

import { useNow } from "@/components/dashboard/use-now";
import { formatAgo } from "@/components/dashboard/devices/relative-time";

/** "7m ago" in the browser's clock; empty during server render so the HTML never mismatches. */
export function TimeAgo({ iso, fallback = "—", className }: { iso: string | null; fallback?: string; className?: string }) {
  const now = useNow();
  if (now === null) return <span className={className} />;
  return (
    <span className={className} title={iso ? new Date(iso).toLocaleString() : undefined}>
      {iso ? formatAgo(iso, now) : fallback}
    </span>
  );
}
