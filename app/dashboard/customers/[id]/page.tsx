import { Suspense } from "react";
import { getCustomerByIdAction } from "@/lib/actions/customer.actions";
import { getVendorsList } from "@/lib/data/reference-data";
import { CustomerDetailClient } from "@/components/dashboard/customers/customer-detail-client";
import { DetailPageSkeleton } from "@/components/dashboard/page-skeletons";

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <CustomerDetailPageData params={params} />
    </Suspense>
  );
}

async function CustomerDetailPageData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [res, vendorsRes] = await Promise.all([
    getCustomerByIdAction(id),
    getVendorsList(),
  ]);
  const initial = {
    customer: res.success && res.data ? res.data : null,
    vendors: vendorsRes.success && vendorsRes.data ? vendorsRes.data : [],
    error: res.success && res.data ? null : res.error || "Customer account not found",
  };
  return <CustomerDetailClient initial={initial} />;
}
