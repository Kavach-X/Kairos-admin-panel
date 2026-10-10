"use server";

import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifyAdminAccess, getServerSession } from "@/lib/session";
import type { AdminUserItem } from "@/lib/types";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://kairos-backend-351319738025.asia-south1.run.app";

async function getAdminHeaders(): Promise<Record<string, string>> {
  const headersList = await headers();
  const incomingCookie = headersList.get("cookie") || "";
  const cookieStore = await cookies();
  const token =
    cookieStore.get("better-auth.session_token")?.value ||
    cookieStore.get("__Secure-better-auth.session_token")?.value;
  const adminContext = await verifyAdminAccess().catch(() => null);

  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (incomingCookie) reqHeaders["cookie"] = incomingCookie;
  if (token) {
    reqHeaders["authorization"] = `Bearer ${token}`;
    if (!incomingCookie.includes("better-auth.session_token")) {
      reqHeaders["cookie"] = incomingCookie
        ? `${incomingCookie}; better-auth.session_token=${token}; __Secure-better-auth.session_token=${token}`
        : `better-auth.session_token=${token}; __Secure-better-auth.session_token=${token}`;
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

export async function getMeAction(): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const [adminContext, serverSession] = await Promise.all([
      verifyAdminAccess().catch(() => null),
      getServerSession().catch(() => null),
    ]);
    const baseUser = {
      ...(serverSession?.user || {}),
      ...(adminContext?.user || {}),
    };

    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/users/me`, {
      headers: reqHeaders,
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return {
          success: true,
          data: {
            ...baseUser,
            ...json.data,
            name: json.data.name || baseUser.name || "",
            email: json.data.email || baseUser.email || "",
            phoneNumber: json.data.phoneNumber ?? baseUser.phoneNumber ?? null,
            image: json.data.image ?? baseUser.image ?? null,
            role: adminContext?.role || json.data?.role || "SUPER_ADMIN",
            account: adminContext?.account || null,
          },
        };
      }
    }

    if (baseUser && (baseUser.id || baseUser.email)) {
      return {
        success: true,
        data: {
          id: baseUser.id,
          name: baseUser.name || "",
          email: baseUser.email || "",
          phoneNumber: baseUser.phoneNumber || null,
          image: baseUser.image || null,
          emailVerified: baseUser.emailVerified ?? true,
          phoneNumberVerified: baseUser.phoneNumberVerified ?? Boolean(baseUser.phoneNumber),
          role: adminContext?.role || "SUPER_ADMIN",
          createdAt: baseUser.createdAt || new Date().toISOString(),
          account: adminContext?.account || null,
        },
      };
    }

    return { success: false, error: "Failed to fetch user profile" };
  } catch (err: any) {
    const adminContext = await verifyAdminAccess().catch(() => null);
    if (adminContext?.user) {
      return {
        success: true,
        data: {
          ...adminContext.user,
          role: adminContext.role || "SUPER_ADMIN",
          account: adminContext.account || null,
        },
      };
    }
    return { success: false, error: err?.message || "Network error fetching profile" };
  }
}

export async function updateMeAction(data: {
  name?: string;
  image?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/users/me`, {
      method: "PATCH",
      headers: reqHeaders,
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to update profile" };
    }

    revalidatePath("/dashboard/account");
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error updating profile" };
  }
}

export async function sendEmailOtpAction(email: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/users/me/email/send-otp`, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify({ email }),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to send verification code" };
    }
    return { success: true, message: json.message };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error sending code" };
  }
}

export async function verifyEmailOtpAction(
  email: string,
  otp: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/users/me/email/verify-otp`, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify({ email, otp }),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to verify email OTP" };
    }

    revalidatePath("/dashboard/account");
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error verifying email" };
  }
}

export async function sendPhoneOtpAction(phoneNumber: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/users/me/phone/send-otp`, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify({ phoneNumber }),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to send phone OTP" };
    }
    return { success: true, message: json.message };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error sending phone code" };
  }
}

export async function verifyPhoneOtpAction(
  phoneNumber: string,
  otp: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/users/me/phone/verify-otp`, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify({ phoneNumber, otp }),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to verify phone OTP" };
    }

    revalidatePath("/dashboard/account");
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error verifying phone" };
  }
}

export async function createAvatarUploadUrlAction(contentType: string): Promise<{
  success: boolean;
  data?: { uploadUrl: string; key: string };
  error?: string;
}> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/users/me/avatar/upload-url`, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify({ contentType }),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to generate upload URL" };
    }
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error generating upload URL" };
  }
}

export async function saveAvatarAction(key: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/users/me/avatar`, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify({ key }),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to save profile picture" };
    }

    revalidatePath("/dashboard/account");
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error saving avatar" };
  }
}
