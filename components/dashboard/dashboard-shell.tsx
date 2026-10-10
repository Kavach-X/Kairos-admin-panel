"use client";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AdminPortalContext } from "@/lib/session";
import { authClient } from "@/lib/auth-client";
import { signOutAdmin } from "@/lib/actions/auth.actions";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  User,
  HardDrive,
  Building2,
  Store,
  Ticket,
  Activity,
  LogOut,
  ChevronUp,
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
  adminContext: AdminPortalContext;
  children: React.ReactNode;
}

export function DashboardShell({ adminContext, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = adminContext;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  async function handleSignOut() {
    await authClient.signOut();
    await signOutAdmin();
    localStorage.removeItem("x-business-account-id");
    router.push("/login");
    router.refresh();
  }

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
          {NAV_ITEMS.map((group) => (
            <SidebarGroup key={group.group} className="py-1">
              <SidebarGroupLabel className="px-2 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/70">
                {group.group}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      ((item.href === "/dashboard/team" || item.href === "/dashboard/users") &&
                        (pathname === "/dashboard/team" || pathname === "/dashboard/users")) ||
                      (item.href === "/dashboard/device-models" && pathname.startsWith("/dashboard/devices/models"));
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
        </SidebarContent>

        {/* Footer User Profile */}
        <SidebarFooter className="border-t border-border/40 p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton size="default" className="h-10 rounded-md px-2 hover:bg-muted/50">
                      <Avatar className="size-6 shrink-0 border border-border/60">
                        {user.image ? (
                          <AvatarImage src={user.image} alt={user.name || "User"} />
                        ) : null}
                        <AvatarFallback className="text-[10px] font-medium bg-muted">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-1 flex-col gap-0.5 leading-none min-w-0 text-left">
                        <span className="truncate text-xs font-medium text-foreground">
                          {user.name || "Administrator"}
                        </span>
                        <span className="truncate text-[10px] text-muted-foreground font-mono">
                          {user.email}
                        </span>
                      </div>
                      <ChevronUp className="size-3 text-muted-foreground/70 shrink-0" />
                    </SidebarMenuButton>
                  }
                />
                <DropdownMenuContent
                  side="top"
                  align="start"
                  className="w-56 rounded-lg p-1 shadow-md border-border/70"
                >
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-medium text-foreground">{user.name || "Administrator"}</p>
                    <p className="truncate text-[10px] text-muted-foreground font-mono">
                      {user.email}
                    </p>
                    <div className="mt-1">
                      <span className="inline-block rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground font-mono">
                        {adminContext.role || "SUPER_ADMIN"}
                      </span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    render={<Link href="/dashboard/account" />}
                    className="text-xs py-1.5"
                  >
                    <User className="mr-2 size-3.5 stroke-[1.75]" />
                    <span>Account Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-xs py-1.5 text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 size-3.5 stroke-[1.75]" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
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
              <span className="font-medium text-foreground">
                {getPageTitle(pathname)}
              </span>
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
