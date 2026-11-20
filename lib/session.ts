import "server-only";

import { backendFetch } from "@/lib/backend-fetch";
import { cache } from "react";
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

async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return (
    cookieStore.get("better-auth.session_token")?.value ||
    cookieStore.get("__Secure-better-auth.session_token")?.value
  );
}

/**
 * Builds request headers forwarding incoming browser cookies and session token
 * to the backend to authenticate Better Auth requests.
 */
async function buildAuthHeaders(): Promise<Record<string, string> | null> {
  const headersList = await headers();
  const incomingCookie = headersList.get("cookie") || "";
  const token = await getSessionToken();

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
 * Wrapped in React's `cache()` so repeated calls within the same request
 * (e.g. from several dashboard Server Components rendering in parallel)
 * reuse one result instead of firing a separate network round trip each.
 */
export const getServerSession = cache(async function getServerSession(): Promise<{
  user: User;
  session: Session;
} | null> {
  const reqHeaders = await buildAuthHeaders();
  if (!reqHeaders) return null;

  try {
    const res = await backendFetch(`${BACKEND_URL}/api/auth/get-session`, {
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
});

/**
 * Calls backend unified portal/me endpoint with `portal=ADMIN` intent
 * to verify if the current session has SUPER_ADMIN permissions.
 * Wrapped in React's `cache()` for the same reason as `getServerSession` —
 * every data-fetching Server Action calls this before doing its own work,
 * so without caching a single page render could fire it a dozen times.
 */
// Successful admin checks are remembered per session token for a short while, so
// pagination clicks, filter changes and page navigations don't each pay for a
// /portal/me round trip before their real backend call. Only positive results are
// kept (a fresh login or promotion takes effect immediately), and the backend still
// authorizes every request, so a revoked admin loses data access at once; at worst
// the shell renders for up to ADMIN_ACCESS_TTL_MS.
// Expiry uses performance.now(): the memo lives in one server process, so a monotonic clock is
// enough, and Next forbids reading wall-clock time (Date.now) while prerendering the layout.
const ADMIN_ACCESS_TTL_MS = 60_000;
const ADMIN_ACCESS_MAX_ENTRIES = 500;
const adminAccessCache = new Map<string, { value: AdminPortalContext; expiresAt: number }>();

/** Drops the remembered admin context for the current session (after profile changes or sign-out). */
export async function invalidateAdminAccessCache(): Promise<void> {
  const token = await getSessionToken();
  if (token) adminAccessCache.delete(token);
}

export const verifyAdminAccess = cache(async function verifyAdminAccess(): Promise<AdminPortalContext | null> {
  const reqHeaders = await buildAuthHeaders();
  if (!reqHeaders) return null;

  const token = await getSessionToken();
  const cached = token ? adminAccessCache.get(token) : undefined;
  if (cached && cached.expiresAt > performance.now()) return cached.value;

  try {
    const res = await backendFetch(
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

    const context = data.data as AdminPortalContext;
    if (token) {
      if (adminAccessCache.size >= ADMIN_ACCESS_MAX_ENTRIES) {
        const now = performance.now();
        for (const [key, entry] of adminAccessCache) {
          if (entry.expiresAt <= now) adminAccessCache.delete(key);
        }
        if (adminAccessCache.size >= ADMIN_ACCESS_MAX_ENTRIES) adminAccessCache.clear();
      }
      adminAccessCache.set(token, { value: context, expiresAt: performance.now() + ADMIN_ACCESS_TTL_MS });
    }
    return context;
  } catch {
    return null;
  }
});
