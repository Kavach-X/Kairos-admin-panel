import { Suspense } from "react";
import { TablePageSkeleton } from "@/components/dashboard/page-skeletons";
import { getVendorsAction } from "@/lib/actions/vendor.actions";
import { VendorsPageClient } from "@/components/dashboard/vendors/vendors-page-client";

export default function VendorsPage() {
  return (
    <Suspense fallback={<TablePageSkeleton tabs={4} columns={7} />}>
      <VendorsData />
    </Suspense>
  );
}

async function VendorsData() {
  const res = await getVendorsAction();
  const vendors = res.success && res.data ? res.data : [];

  return <VendorsPageClient vendors={vendors} />;
}
