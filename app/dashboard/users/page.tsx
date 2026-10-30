import { Suspense } from "react";
import { getUsersAction } from "@/lib/actions/user.actions";
import { UsersPageClient } from "@/components/dashboard/users/users-page-client";
import { ListPageSkeleton } from "@/components/dashboard/page-skeletons";

export default function UsersPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <UsersPageData />
    </Suspense>
  );
}

async function UsersPageData() {
  const res = await getUsersAction();
  return <UsersPageClient initialUsers={res.success && res.data ? res.data : []} />;
}
