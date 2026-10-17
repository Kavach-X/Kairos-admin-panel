"use server";

import { cache } from "react";
import { headers, cookies } from "next/headers";
import { verifyAdminAccess } from "@/lib/session";

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

export interface DashboardStats {
  devices: {
    total: number;
    inStock: number;
    deployed: number;
    withVendor: number;
    maintenance: number;
  };
  vendors: {
    total: number;
    verified: number;
    pending: number;
  };
  customers: {
    total: number;
  };
  cameras: {
    total: number;
  };
  tickets: {
    open: number;
  };
  events: {
    total: number;
    last24h: number;
    importantAlerts24h: number;
  };
}

/**
 * Single aggregate call backing the dashboard overview — replaces the old
 * pattern of fetching full device/vendor/customer lists just to `.length`/
 * `.filter()` them in JS, which also silently capped the numbers at each
 * list endpoint's default page size.
 */
export const getDashboardStatsAction = cache(async function getDashboardStatsAction(): Promise<{
  success: boolean;
  data?: DashboardStats;
  error?: string;
}> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/admin/dashboard/stats`, {
      headers: reqHeaders,
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to fetch dashboard stats" };
    }
    return { success: true, data: json.data as DashboardStats };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error fetching dashboard stats" };
  }
});
