import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Wrench,
  Store,
} from "lucide-react";

interface NeedsAttentionCardProps {
  openTickets: number;
  pendingVendors: number;
}

export function NeedsAttentionCard({
  openTickets,
  pendingVendors,
}: NeedsAttentionCardProps) {
  const hasPendingItems = openTickets > 0 || pendingVendors > 0;

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="pb-2 pt-4 px-5 border-b border-border/40">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            {hasPendingItems ? (
              <AlertTriangle className="size-4 text-amber-500" />
            ) : (
              <CheckCircle2 className="size-4 text-emerald-500" />
            )}
            Action Items
          </CardTitle>
          <span className="text-[11px] font-mono text-muted-foreground">
            {hasPendingItems
              ? `${openTickets + pendingVendors} pending`
              : "0 pending"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-2.5">
        {!hasPendingItems ? (
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs">
            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 block">
                All Systems Normal
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                No open tickets or pending partner approvals right now.
              </p>
            </div>
          </div>
        ) : (
          <>
            {openTickets > 0 && (
              <Link
                href="/dashboard/tickets"
                className="group flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/50 hover:border-border transition-all text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-7 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <Wrench className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-foreground block truncate">
                      {openTickets} Support Ticket{openTickets > 1 ? "s" : ""}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Needs review or technician assignment
                    </span>
                  </div>
                </div>
                <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </Link>
            )}

            {pendingVendors > 0 && (
              <Link
                href="/dashboard/vendors"
                className="group flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/50 hover:border-border transition-all text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-7 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <Store className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-foreground block truncate">
                      {pendingVendors} Partner Request{pendingVendors > 1 ? "s" : ""}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Awaiting verification review
                    </span>
                  </div>
                </div>
                <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </Link>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
