import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AdminGate } from "@/components/dashboard/admin-gate";
import { SidebarUser, SidebarUserSkeleton } from "@/components/dashboard/sidebar-user";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata = {
  title: "Dashboard | Kairos Admin Panel",
  description: "Kairos Edge Platform administration dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No top-level await: the shell prerenders statically and the session-dependent
  // parts (admin gate, user menu) stream in behind their own boundaries.
  return (
    <TooltipProvider>
      <DashboardShell
        footer={
          <Suspense fallback={<SidebarUserSkeleton />}>
            <SidebarUser />
          </Suspense>
        }
      >
        <Suspense fallback={null}>
          <AdminGate />
        </Suspense>
        {children}
      </DashboardShell>
    </TooltipProvider>
  );
}
