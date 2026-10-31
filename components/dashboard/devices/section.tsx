import type { LucideIcon } from "lucide-react";

/** Top-level section heading, shared by the telemetry panel and the rest of the device page. */
export function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <Icon className="h-4 w-4 text-primary" />
      {children}
    </span>
  );
}

/** Sub-heading inside a section (Vitals, History, Recent events). */
export function SubTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm font-medium text-foreground">{children}</span>
      {right}
    </div>
  );
}

/** The one card surface used everywhere on the device page. */
export const CARD = "rounded-xl border border-border bg-card p-4";

/** Small label above a value, for key/value grids. */
export function Field({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={`truncate text-sm text-foreground ${mono ? "font-mono text-xs" : ""}`}>{children}</span>
    </div>
  );
}
