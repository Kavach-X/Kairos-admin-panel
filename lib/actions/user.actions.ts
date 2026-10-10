"use server";

import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifyAdminAccess } from "@/lib/session";
import type { AdminUserItem } from "@/lib/types";

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

export async function getUsersAction(): Promise<{
  success: boolean;
  data?: AdminUserItem[];
  error?: string;
}> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/admin/users`, {
      headers: reqHeaders,
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to fetch users" };
    }
    return { success: true, data: json.data as AdminUserItem[] };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error fetching users" };
  }
}

export async function createAdminUserAction(data: {
  name: string;
  email: string;
  password?: string;
  phoneNumber?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/admin/users`, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to create admin user" };
    }

    revalidatePath("/dashboard/users");
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error creating admin user" };
  }
}

export async function deleteUserAction(
  userId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: reqHeaders,
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to delete user" };
    }

    revalidatePath("/dashboard/users");
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error deleting user" };
  }
}
