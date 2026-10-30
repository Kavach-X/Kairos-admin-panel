import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/dashboard/page-skeletons";
import { getVendorsAction } from "@/lib/actions/vendor.actions";
import { VendorsPageClient } from "@/components/dashboard/vendors/vendors-page-client";

export default function VendorsPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <VendorsData />
    </Suspense>
  );
}

async function VendorsData() {
  const res = await getVendorsAction();
  const vendors = res.success && res.data ? res.data : [];

  return <VendorsPageClient vendors={vendors} />;
}
