"use server";

import { cache } from "react";
import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifyAdminAccess } from "@/lib/session";
import type { VendorItem, VerificationStatus } from "@/lib/types";

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

export const getVendorsAction = cache(async function getVendorsAction(
  status?: string,
  search?: string
): Promise<{ success: boolean; data?: VendorItem[]; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const params = new URLSearchParams();
    if (status && status !== "ALL") params.set("status", status);
    if (search && search.trim()) params.set("search", search.trim());
    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${BACKEND_URL}/api/v1/admin/vendors${query}`, {
      headers: reqHeaders,
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to fetch vendors" };
    }
    const items = Array.isArray(json.data) ? json.data : (json.data?.items || []);
    return { success: true, data: items as VendorItem[] };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error fetching vendors" };
  }
});

export async function verifyVendorAction(
  businessAccountId: string,
  status: VerificationStatus
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/admin/vendors/${encodeURIComponent(businessAccountId)}/verify`,
      {
        method: "PATCH",
        headers: reqHeaders,
        body: JSON.stringify({ status }),
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to update vendor status" };
    }

    revalidatePath("/dashboard/vendors");
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error updating vendor" };
  }
}

export async function getVendorDetailsAction(
  id: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/admin/vendors/${encodeURIComponent(id)}`, {
      headers: reqHeaders,
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to fetch vendor details" };
    }
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error fetching vendor details" };
  }
}
