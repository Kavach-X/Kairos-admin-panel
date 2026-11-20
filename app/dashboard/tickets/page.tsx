import { Suspense } from "react";
import { getTicketsAction } from "@/lib/actions/ticket.actions";
import { getCustomersAction } from "@/lib/actions/customer.actions";
import { getDevicesAction } from "@/lib/actions/device.actions";
import { TicketsPageClient } from "@/components/dashboard/tickets/tickets-page-client";
import { TablePageSkeleton } from "@/components/dashboard/page-skeletons";

export default function TicketsPage() {
  return (
    <Suspense fallback={<TablePageSkeleton tabs={5} columns={7} />}>
      <TicketsData />
    </Suspense>
  );
}

async function TicketsData() {
  const [ticketRes, customerRes, deviceRes] = await Promise.all([
    getTicketsAction({}),
    getCustomersAction(),
    getDevicesAction({ limit: 250 }),
  ]);

  return (
    <TicketsPageClient
      initial={{
        tickets: ticketRes.success && ticketRes.data ? ticketRes.data : [],
        customers: customerRes.success && customerRes.data ? customerRes.data : [],
        devices: deviceRes.success && deviceRes.data?.items ? deviceRes.data.items : [],
      }}
    />
  );
}
