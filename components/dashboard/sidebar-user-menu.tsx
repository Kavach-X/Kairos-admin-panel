"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User, ChevronUp } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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

export function SidebarUserMenu({ adminContext }: { adminContext: AdminPortalContext }) {
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
  );
}
