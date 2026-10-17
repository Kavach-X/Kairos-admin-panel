import { getCustomersAction } from "@/lib/actions/customer.actions";
import { getVendorsListAction } from "@/lib/actions/device.actions";
import { CustomersPageClient } from "@/components/dashboard/customers/customers-page-client";

export default async function CustomersPage() {
  const [custRes, vendorRes] = await Promise.all([
    getCustomersAction(),
    getVendorsListAction(),
  ]);

  const customers = custRes.success && custRes.data ? custRes.data : [];
  const vendors = vendorRes.success && vendorRes.data ? vendorRes.data : [];

  return <CustomersPageClient customers={customers} vendors={vendors} />;
}
