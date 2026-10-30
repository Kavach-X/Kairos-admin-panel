import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/dashboard/page-skeletons";
import { getCustomersAction } from "@/lib/actions/customer.actions";
import { getVendorsList } from "@/lib/data/reference-data";
import { CustomersPageClient } from "@/components/dashboard/customers/customers-page-client";

export default function CustomersPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <CustomersData />
    </Suspense>
  );
}

async function CustomersData() {
  const [custRes, vendorRes] = await Promise.all([
    getCustomersAction(),
    getVendorsList(),
  ]);

  const customers = custRes.success && custRes.data ? custRes.data : [];
  const vendors = vendorRes.success && vendorRes.data ? vendorRes.data : [];

  return <CustomersPageClient customers={customers} vendors={vendors} />;
}
