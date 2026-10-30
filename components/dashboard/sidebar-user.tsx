import { verifyAdminAccess } from "@/lib/session";
import { SidebarUserMenu } from "./sidebar-user-menu";
import { Skeleton } from "@/components/ui/skeleton";

/** Reads the session, so it must render behind <Suspense> to keep the shell static. */
export async function SidebarUser() {
  const adminContext = await verifyAdminAccess();
  if (!adminContext) return null;
  return <SidebarUserMenu adminContext={adminContext} />;
}

export function SidebarUserSkeleton() {
  return (
    <div className="flex h-10 items-center gap-2 px-2">
      <Skeleton className="size-6 rounded-full" />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-2 w-32" />
      </div>
    </div>
  );
}
