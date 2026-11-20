import { Suspense } from "react";
import { getCustomerByIdAction } from "@/lib/actions/customer.actions";
import { CustomerDetailClient } from "@/components/dashboard/customers/customer-detail-client";
import { CustomerDetailSkeleton } from "@/components/dashboard/page-skeletons";

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<CustomerDetailSkeleton />}>
      <CustomerDetailPageData params={params} />
    </Suspense>
  );
}

async function CustomerDetailPageData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await getCustomerByIdAction(id);
  const initial = {
    customer: res.success && res.data ? res.data : null,
    error: res.success && res.data ? null : res.error || "Customer account not found",
  };
  return <CustomerDetailClient key={id} initial={initial} />;
}
