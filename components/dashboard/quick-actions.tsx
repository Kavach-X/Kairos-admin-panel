import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface ActionItem {
  label: string;
  href: string;
  hint: string;
}

const actions: ActionItem[] = [
  {
    label: "Devices",
    href: "/dashboard/devices",
    hint: "Factory register & ship",
  },
  {
    label: "Device Models",
    href: "/dashboard/device-models",
    hint: "Specs & blueprints",
  },
  {
    label: "Vendors",
    href: "/dashboard/vendors",
    hint: "Review KYC requests",
  },
  {
    label: "Customer Stores",
    href: "/dashboard/customers",
    hint: "Stores & camera status",
  },
  {
    label: "Support Tickets & RMA",
    href: "/dashboard/tickets",
    hint: "Issues & hardware swaps",
  },
  {
    label: "Platform Users",
    href: "/dashboard/users",
    hint: "Admins & partners",
  },
];

export function QuickActions() {
  return (
    <Card className="border-border/50 bg-card shadow-none">
      <CardHeader className="border-b border-border/40 pb-3 pt-4 px-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Navigation
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-border/40">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
          >
            <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
              {action.label}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">
                {action.hint}
              </span>
              <ChevronRight className="size-3 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
