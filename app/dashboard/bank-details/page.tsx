import { Suspense } from "react";
import { getBankDetailsAction } from "@/lib/actions/bank-detail.actions";
import { BankDetailsPageClient } from "@/components/dashboard/bank-details/bank-details-page-client";
import { ListPageSkeleton } from "@/components/dashboard/page-skeletons";

export default function BankDetailsPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <BankDetailsPageData />
    </Suspense>
  );
}

async function BankDetailsPageData() {
  const res = await getBankDetailsAction();
  return <BankDetailsPageClient initialAccounts={res.success && res.data ? res.data : []} />;
}
