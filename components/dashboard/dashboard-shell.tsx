"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  User,
  HardDrive,
  Building2,
  Store,
  Ticket,
  Activity,
  CreditCard,
  Cpu,
} from "lucide-react";

const NAV_ITEMS = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Events", href: "/dashboard/activity", icon: Activity },
    ],
  },
  {
    group: "Platform",
    items: [
      { label: "Device Models", href: "/dashboard/device-models", icon: Cpu },
      { label: "Devices", href: "/dashboard/devices", icon: HardDrive },
      { label: "Vendors", href: "/dashboard/vendors", icon: Store },
      { label: "Customers", href: "/dashboard/customers", icon: Building2 },
      { label: "Team", href: "/dashboard/team", icon: Users },
    ],
  },
  {
    group: "Operations",
    items: [
      { label: "Support Tickets", href: "/dashboard/tickets", icon: Ticket },
    ],
  },
  {
    group: "Account",
    items: [
      { label: "My Account", href: "/dashboard/account", icon: User },
    ],
  },
];

interface DashboardShellProps {
  /** Per-user sidebar footer; streams in behind its own <Suspense> so the shell stays static. */
  footer: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardShell({ footer, children }: DashboardShellProps) {
    return (
    <SidebarProvider>
      <Sidebar variant="inset" className="border-r border-border/50">
        {/* Minimalist Sidebar Brand */}
        <SidebarHeader className="h-14 justify-center border-b border-border/40 px-4">
          <Link
            href="/dashboard"
            className="flex flex-col justify-center px-1 select-none group"
          >
            <span className="text-sm font-semibold tracking-tight text-foreground group-hover:text-foreground/80 transition-colors">
              Kairos
            </span>
            <span className="text-[11px] font-medium text-muted-foreground leading-none">
              Admin Panel
            </span>
          </Link>
        </SidebarHeader>

        {/* Navigation */}
        <SidebarContent className="px-2 pt-2">
          <Suspense fallback={<NavGroups pathname={null} />}>
            <ActiveNavGroups />
          </Suspense>
        </SidebarContent>

        <SidebarFooter className="border-t border-border/40 p-2">{footer}</SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {/* Clean, Minimal Header */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border/50 bg-background/80 px-4 backdrop-blur-md md:px-6">
          <div className="flex items-center gap-2.5">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
            <div className="h-4 w-px bg-border/70 shrink-0 self-center" aria-hidden="true" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-muted-foreground/60">Console</span>
              <span className="text-muted-foreground/40">/</span>
              <Suspense
                fallback={<span className="font-medium text-foreground">Dashboard</span>}
              >
                <PageTitle />
              </Suspense>
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col p-4 md:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

// Reading the pathname is runtime data, so it lives in leaf components behind
// <Suspense>; the rest of the shell prerenders statically.
function ActiveNavGroups() {
  return <NavGroups pathname={usePathname()} />;
}

function PageTitle() {
  return (
    <span className="font-medium text-foreground">{getPageTitle(usePathname())}</span>
  );
}

function NavGroups({ pathname }: { pathname: string | null }) {
  const path = pathname ?? "";
  return (
    <>
          {NAV_ITEMS.map((group) => (
            <SidebarGroup key={group.group} className="py-1">
              <SidebarGroupLabel className="px-2 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/70">
                {group.group}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive =
                      path === item.href ||
                      ((item.href === "/dashboard/team" || item.href === "/dashboard/users") &&
                        (path === "/dashboard/team" || path === "/dashboard/users")) ||
                      (item.href === "/dashboard/device-models" && path.startsWith("/dashboard/devices/models"));
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          isActive={isActive}
                          render={<Link href={item.href} />}
                          className={`h-8 gap-2.5 rounded-md px-2 text-xs transition-colors duration-100 ${
                            isActive
                              ? "bg-accent font-medium text-accent-foreground"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          }`}
                        >
                          <Icon className="size-3.5 shrink-0 stroke-[1.75]" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
    </>
  );
}

function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    "/dashboard": "Overview",
    "/dashboard/activity": "Audit & Activity",
    "/dashboard/users": "Team Management",
    "/dashboard/team": "Team Management",
    "/dashboard/devices": "Devices",
    "/dashboard/device-models": "Device Models",
    "/dashboard/vendors": "Vendors",
    "/dashboard/customers": "Customers",
    "/dashboard/tickets": "Tickets",
    "/dashboard/bank-details": "Bank Details",
    "/dashboard/account": "My Account",
  };
  return titles[pathname] || "Dashboard";
}
