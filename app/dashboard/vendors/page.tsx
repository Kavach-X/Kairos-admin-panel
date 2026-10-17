import { getVendorsAction } from "@/lib/actions/vendor.actions";
import { VendorsPageClient } from "@/components/dashboard/vendors/vendors-page-client";

export default async function VendorsPage() {
  const res = await getVendorsAction();
  const vendors = res.success && res.data ? res.data : [];

  return <VendorsPageClient vendors={vendors} />;
}
