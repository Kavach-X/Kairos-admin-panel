"use server";

import { headers, cookies } from "next/headers";
import type { User, Session } from "@/lib/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://kairos-backend-351319738025.asia-south1.run.app";

// ─── Admin context returned from portal/me ───────────────────
export interface AdminPortalContext {
  destination: string;
  portalType: string;
  role: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string | null;
    image?: string | null;
    emailVerified?: boolean;
    phoneNumberVerified?: boolean;
    createdAt?: string;
  };
  account: {
    id: string;
    name: string;
    accountType: string;
  } | null;
  accounts: Array<{
    businessAccountId: string;
    name: string;
    accountType: string;
    role: string;
    status: string;
  }>;
}

/**
 * Builds request headers forwarding incoming browser cookies and session token
 * to the backend to authenticate Better Auth requests.
 */
async function buildAuthHeaders(): Promise<Record<string, string> | null> {
  const headersList = await headers();
  const incomingCookie = headersList.get("cookie") || "";
  const cookieStore = await cookies();
  const token =
    cookieStore.get("better-auth.session_token")?.value ||
    cookieStore.get("__Secure-better-auth.session_token")?.value;

  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (incomingCookie) {
    reqHeaders["cookie"] = incomingCookie;
  }

  if (token) {
    reqHeaders["authorization"] = `Bearer ${token}`;
    if (!incomingCookie.includes("better-auth.session_token")) {
      reqHeaders["cookie"] = incomingCookie
        ? `${incomingCookie}; better-auth.session_token=${token}; __Secure-better-auth.session_token=${token}`
        : `better-auth.session_token=${token}; __Secure-better-auth.session_token=${token}`;
    }
  }

  if (!reqHeaders["cookie"] && !reqHeaders["authorization"]) {
    return null;
  }

  return reqHeaders;
}

/**
 * Forwards session credentials to backend to fetch the Better Auth session.
 */
export async function getServerSession(): Promise<{
  user: User;
  session: Session;
} | null> {
  const reqHeaders = await buildAuthHeaders();
  if (!reqHeaders) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/get-session`, {
      method: "GET",
      headers: reqHeaders,
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.user) return null;

    return data as { user: User; session: Session };
  } catch {
    return null;
  }
}

/**
 * Calls backend unified portal/me endpoint with `portal=ADMIN` intent
 * to verify if the current session has SUPER_ADMIN permissions.
 */
export async function verifyAdminAccess(): Promise<AdminPortalContext | null> {
  const reqHeaders = await buildAuthHeaders();
  if (!reqHeaders) return null;

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/portal/me?portal=ADMIN`,
      {
        headers: reqHeaders,
        cache: "no-store",
      }
    );

    if (!res.ok) return null;

    const data = await res.json();

    if (
      !data.success ||
      !data.data ||
      data.data.destination === "UNAUTHORIZED" ||
      data.data.portalType !== "ADMIN"
    ) {
      return null;
    }

    return data.data as AdminPortalContext;
  } catch {
    return null;
  }
}
