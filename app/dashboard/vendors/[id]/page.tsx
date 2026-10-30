import { Suspense } from "react";
import { getVendorDetailsAction } from "@/lib/actions/vendor.actions";
import { VendorProfileClient } from "@/components/dashboard/vendors/vendor-profile-client";
import { DetailPageSkeleton } from "@/components/dashboard/page-skeletons";

export default function VendorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <VendorProfilePageData params={params} />
    </Suspense>
  );
}

async function VendorProfilePageData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await getVendorDetailsAction(id);
  const initial = {
    vendor: res.success && res.data ? res.data : null,
    error: res.success && res.data ? null : res.error || "Failed to load vendor profile",
  };
  return <VendorProfileClient initial={initial} />;
}
