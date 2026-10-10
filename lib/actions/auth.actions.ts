"use server";

import { z } from "zod/v4";
import { cookies, headers } from "next/headers";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://kairos-backend-351319738025.asia-south1.run.app";

// ─── Validation Schemas ──────────────────────────────────────

const sendEmailOtpSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

const sendPhoneOtpSchema = z.object({
  phoneNumber: z.string().min(10, "Please enter a valid phone number"),
});

// ─── Action Result Types ─────────────────────────────────────

export interface AuthActionResult {
  success: boolean;
  error?: string;
  setCookie?: string;
}

// ─── Send Email OTP ──────────────────────────────────────────

export async function sendLoginOtp(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const parsed = sendEmailOtpSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid email" };
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/email-otp/send-verification-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: parsed.data.email,
        type: "sign-in",
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return {
        success: false,
        error: data?.message || "Failed to send email OTP. Please try again.",
      };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Network error. Please check your connection." };
  }
}

// ─── Send Phone OTP ──────────────────────────────────────────

export async function sendPhoneLoginOtp(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  let rawPhone = (formData.get("phoneNumber") as string || "").replace(/[\s-]/g, "");
  if (rawPhone && !rawPhone.startsWith("+")) {
    rawPhone = `+91${rawPhone}`;
  }

  const parsed = sendPhoneOtpSchema.safeParse({ phoneNumber: rawPhone });
  if (!parsed.success) {
    return { success: false, error: "Please enter a valid phone number" };
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/phone-number/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber: rawPhone,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return {
        success: false,
        error: data?.message || "Failed to send SMS OTP. Please check the number.",
      };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Network error. Please check your connection." };
  }
}

// ─── Verify Admin Role & Sync Cookie ─────────────────────────
// Called after client signs in (via Email OTP, Phone OTP, or Google)
// to verify SUPER_ADMIN permission before granting dashboard access.

export async function verifyAdminRole(
  sessionToken?: string
): Promise<AuthActionResult> {
  const headersList = await headers();
  const incomingCookie = headersList.get("cookie") || "";
  const cookieStore = await cookies();
  const existingToken = cookieStore.get("better-auth.session_token")?.value;

  const token = sessionToken || existingToken;

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
        ? `${incomingCookie}; better-auth.session_token=${token}`
        : `better-auth.session_token=${token}`;
    }
  }

  if (!reqHeaders["cookie"] && !reqHeaders["authorization"]) {
    return { success: false, error: "No active session found." };
  }

  try {
    const meRes = await fetch(
      `${BACKEND_URL}/api/v1/portal/me?portal=ADMIN`,
      {
        headers: reqHeaders,
        cache: "no-store",
      }
    );

    if (!meRes.ok) {
      return {
        success: false,
        error: "Unable to verify admin access.",
      };
    }

    const meData = await meRes.json();

    if (
      !meData.success ||
      !meData.data ||
      meData.data.destination === "UNAUTHORIZED" ||
      meData.data.portalType !== "ADMIN"
    ) {
      return {
        success: false,
        error: "Access denied. Only SuperAdmin users may access this console.",
      };
    }

    // Persist session token in Next.js cookie store for same-origin server component access
    if (token) {
      try {
        cookieStore.set("better-auth.session_token", token, {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });
      } catch {
        // Ignore if headers already sent
      }
    }

    return {
      success: true,
      setCookie: meData.data.account?.id,
    };
  } catch {
    return {
      success: false,
      error: "Could not reach authentication server.",
    };
  }
}

// ─── Sign Out Server Action ──────────────────────────────────

export async function signOutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  try {
    cookieStore.delete("better-auth.session_token");
  } catch {
    // Ignore
  }
}
