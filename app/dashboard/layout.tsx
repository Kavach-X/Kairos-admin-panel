import { redirect } from "next/navigation";
import { verifyAdminAccess, type AdminPortalContext } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata = {
  title: "Dashboard | Kairos Admin Panel",
  description: "Kairos Edge Platform administration dashboard",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side admin verification on every dashboard request
  const adminContext = await verifyAdminAccess();

  if (!adminContext) {
    redirect("/login?error=unauthorized");
  }

  return (
    <TooltipProvider>
      <DashboardShell adminContext={adminContext}>
        {children}
      </DashboardShell>
    </TooltipProvider>
  );
}
