"use server";

import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifyAdminAccess } from "@/lib/session";
import type { CustomerItem, CustomerDetail } from "@/lib/types";

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

export async function getCustomersAction(
  status?: string,
  search?: string
): Promise<{ success: boolean; data?: CustomerItem[]; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const params = new URLSearchParams();
    if (status && status !== "ALL") params.set("status", status);
    if (search && search.trim()) params.set("search", search.trim());

    const queryStr = params.toString();
    const url = `${BACKEND_URL}/api/v1/admin/customers${queryStr ? `?${queryStr}` : ""}`;

    const res = await fetch(url, {
      headers: reqHeaders,
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to fetch customers" };
    }
    return { success: true, data: json.data as CustomerItem[] };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error fetching customers" };
  }
}

export async function updateCustomerStatusAction(
  customerAccountId: string,
  status: "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION"
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/admin/customers/${encodeURIComponent(customerAccountId)}/status`,
      {
        method: "PATCH",
        headers: reqHeaders,
        body: JSON.stringify({ status }),
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to update customer status" };
    }

    revalidatePath("/dashboard/customers");
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error updating customer status" };
  }
}

export async function reassignCustomerVendorAction(
  customerAccountId: string,
  vendorAccountId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/admin/customers/${encodeURIComponent(customerAccountId)}/assign-vendor`,
      {
        method: "PATCH",
        headers: reqHeaders,
        body: JSON.stringify({ vendorAccountId }),
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to reassign vendor" };
    }

    revalidatePath("/dashboard/customers");
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error reassigning vendor" };
  }
}

export async function getCustomerByIdAction(
  customerId: string
): Promise<{ success: boolean; data?: CustomerDetail; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/admin/customers/${encodeURIComponent(customerId)}`,
      {
        headers: reqHeaders,
        cache: "no-store",
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to fetch customer details" };
    }
    return { success: true, data: json.data as CustomerDetail };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error fetching customer" };
  }
}

