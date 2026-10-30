import { redirect } from "next/navigation";
import { verifyAdminAccess } from "@/lib/session";

/**
 * Renders nothing; redirects non-admins. Sits behind <Suspense> beside the page so
 * the admin check streams in parallel instead of blocking the whole layout. Data is
 * still authorized by the backend on every request, so this is a second layer.
 */
export async function AdminGate() {
  const adminContext = await verifyAdminAccess();
  if (!adminContext) redirect("/login?error=unauthorized");
  return null;
}
