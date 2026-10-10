"use server";

import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifyAdminAccess } from "@/lib/session";
import type { TicketItem, TicketStatus, TicketPriority } from "@/lib/types";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://kairos-backend-351319738025.asia-south1.run.app";

async function getAdminHeaders(): Promise<Record<string, string>> {
  const headersList = await headers();
  const incomingCookie = headersList.get("cookie") || "";
  const cookieStore = await cookies();
  const token = cookieStore.get("better-auth.session_token")?.value;
  const adminContext = await verifyAdminAccess();

  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (incomingCookie) reqHeaders["cookie"] = incomingCookie;
  if (token) {
    reqHeaders["authorization"] = `Bearer ${token}`;
    if (!incomingCookie.includes("better-auth.session_token")) {
      reqHeaders["cookie"] = incomingCookie
        ? `${incomingCookie}; better-auth.session_token=${token}`
        : `better-auth.session_token=${token}`;
    }
  }
  if (adminContext?.account?.id) {
    reqHeaders["x-business-account-id"] = adminContext.account.id;
  }

  return reqHeaders;
}

export async function getTicketsAction(params?: {
  status?: string;
  priority?: string;
  search?: string;
}): Promise<{ success: boolean; data?: TicketItem[]; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== "ALL") searchParams.set("status", params.status);
    if (params?.priority && params.priority !== "ALL") searchParams.set("priority", params.priority);
    if (params?.search && params.search.trim()) searchParams.set("search", params.search.trim());

    const queryStr = searchParams.toString();
    const res = await fetch(`${BACKEND_URL}/api/v1/tickets${queryStr ? `?${queryStr}` : ""}`, {
      headers: reqHeaders,
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to fetch tickets" };
    }

    // tickets returns { items: [...], pagination: {...} } or array
    const items = json.data?.items || json.data || [];
    return { success: true, data: items as TicketItem[] };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error fetching tickets" };
  }
}

export async function createTicketAction(data: {
  businessAccountId: string;
  title: string;
  description: string;
  priority?: TicketPriority;
  assignedVendorAccountId?: string;
  assignedToUserId?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/tickets`, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to create ticket" };
    }

    revalidatePath("/dashboard/tickets");
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error creating ticket" };
  }
}

export async function updateTicketAction(
  ticketId: string,
  data: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedVendorAccountId?: string | null;
    assignedToUserId?: string | null;
    description?: string;
  }
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/tickets/${encodeURIComponent(ticketId)}`, {
      method: "PATCH",
      headers: reqHeaders,
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to update ticket" };
    }

    revalidatePath("/dashboard/tickets");
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error updating ticket" };
  }
}

export async function rmaReplaceDeviceAction(data: {
  customerAccountId: string;
  oldDeviceId: string;
  newDeviceId: string;
  reason: string;
  ticketId?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/devices/replace`, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to replace device" };
    }

    revalidatePath("/dashboard/tickets");
    revalidatePath("/dashboard/devices");
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error swapping RMA device" };
  }
}
