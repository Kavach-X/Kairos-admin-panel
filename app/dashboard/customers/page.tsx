import { Suspense } from "react";
import { TablePageSkeleton } from "@/components/dashboard/page-skeletons";
import { getCustomersAction } from "@/lib/actions/customer.actions";
import { CustomersPageClient } from "@/components/dashboard/customers/customers-page-client";

export default function CustomersPage() {
  return (
    <Suspense fallback={<TablePageSkeleton tabs={3} columns={6} />}>
      <CustomersData />
    </Suspense>
  );
}

async function CustomersData() {
  const custRes = await getCustomersAction();
  const customers = custRes.success && custRes.data ? custRes.data : [];

  return <CustomersPageClient customers={customers} />;
}
