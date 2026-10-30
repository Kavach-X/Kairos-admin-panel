import { Suspense } from "react";
import { DetailPageSkeleton } from "@/components/dashboard/page-skeletons";
import { redirect } from "next/navigation";
import { verifyAdminAccess } from "@/lib/session";
import { getMeAction } from "@/lib/actions/user.actions";
import { AccountProfileView } from "@/components/dashboard/account/account-profile-view";

export const metadata = {
  title: "Account Profile | Kairos Admin Panel",
  description: "Manage your personal credentials, contact channels, and console security",
};

export default function AccountPage() {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <AccountData />
    </Suspense>
  );
}

async function AccountData() {
  const adminContext = await verifyAdminAccess();
  if (!adminContext) {
    redirect("/login?error=unauthorized");
  }

  const profileRes = await getMeAction();
  const userData = profileRes?.success && profileRes?.data ? profileRes.data : {};

  const user = {
    id: userData.id || adminContext.user.id,
    name: userData.name || adminContext.user.name || "",
    email: userData.email || adminContext.user.email || "",
    phoneNumber: userData.phoneNumber ?? adminContext.user.phoneNumber ?? null,
    image: userData.image ?? adminContext.user.image ?? null,
    emailVerified: userData.emailVerified ?? adminContext.user.emailVerified ?? true,
    phoneNumberVerified:
      userData.phoneNumberVerified ??
      adminContext.user.phoneNumberVerified ??
      Boolean(userData.phoneNumber),
    role: userData.role || adminContext.role || "SUPER_ADMIN",
    createdAt: userData.createdAt || adminContext.user.createdAt || new Date().toISOString(),
    account: adminContext.account || null,
  };

  return <AccountProfileView initialUser={user} />;
}
