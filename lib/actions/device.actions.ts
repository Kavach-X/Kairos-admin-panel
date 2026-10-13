"use server";

import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifyAdminAccess } from "@/lib/session";
import type {
  Device,
  DeviceModel,
  DeviceListResult,
  FactoryRegisterPayload,
  DeviceRegisterToken,
} from "@/lib/types";

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

  if (adminContext?.account?.id) {
    reqHeaders["x-business-account-id"] = adminContext.account.id;
  }

  return reqHeaders;
}

// ─── 1. Device Hardware Models Catalog ──────────────────────────────

export async function getDeviceModelsAction(
  isActiveOnly = false
): Promise<{ success: boolean; data?: DeviceModel[]; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const query = isActiveOnly ? "?is_active=true" : "";
    const res = await fetch(`${BACKEND_URL}/api/v1/devices/models${query}`, {
      headers: reqHeaders,
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to fetch device models" };
    }
    return { success: true, data: json.data as DeviceModel[] };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error fetching models" };
  }
}

export async function createDeviceModelAction(data: {
  code: string;
  name: string;
  description?: string;
  specs?: Record<string, any>;
  metadata?: Record<string, any>;
  is_active?: boolean;
}): Promise<{ success: boolean; data?: DeviceModel; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/devices/models`, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to create device model" };
    }

    revalidatePath("/dashboard/devices/models");
    revalidatePath("/dashboard/devices");
    return { success: true, data: json.data as DeviceModel };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error creating model" };
  }
}

export async function updateDeviceModelAction(
  code: string,
  data: {
    name?: string;
    description?: string;
    specs?: Record<string, any>;
    metadata?: Record<string, any>;
    is_active?: boolean;
  }
): Promise<{ success: boolean; data?: DeviceModel; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/devices/models/${encodeURIComponent(code)}`, {
      method: "PATCH",
      headers: reqHeaders,
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to update device model" };
    }

    revalidatePath("/dashboard/devices/models");
    revalidatePath("/dashboard/devices");
    return { success: true, data: json.data as DeviceModel };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error updating model" };
  }
}

// ─── 2. Devices Fleet & Inventory ───────────────────────────────────

export async function getDevicesAction(params?: {
  page?: number;
  limit?: number;
  inventory_status?: string;
  operational_status?: string;
  online?: boolean;
  claimed?: boolean;
  modelCode?: string;
  search?: string;
}): Promise<{ success: boolean; data?: DeviceListResult; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.inventory_status && params.inventory_status !== "ALL") {
      searchParams.set("inventory_status", params.inventory_status);
    }
    if (params?.operational_status) {
      searchParams.set("operational_status", params.operational_status);
    }
    if (typeof params?.online === "boolean") {
      searchParams.set("online", String(params.online));
    }
    if (typeof params?.claimed === "boolean") {
      searchParams.set("claimed", String(params.claimed));
    }
    if (params?.modelCode) searchParams.set("modelCode", params.modelCode);
    if (params?.search) searchParams.set("search", params.search);

    const queryStr = searchParams.toString();
    const url = `${BACKEND_URL}/api/v1/devices${queryStr ? `?${queryStr}` : ""}`;

    const res = await fetch(url, {
      headers: reqHeaders,
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to fetch devices" };
    }

    return { success: true, data: json.data as DeviceListResult };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error fetching devices" };
  }
}

export async function getDeviceByIdAction(
  deviceId: string
): Promise<{ success: boolean; data?: Device; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/devices/${encodeURIComponent(deviceId)}`, {
      headers: reqHeaders,
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to fetch device details" };
    }

    return { success: true, data: json.data as Device };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error fetching device" };
  }
}

// ─── 3. Factory Registration ────────────────────────────────────────

export async function factoryRegisterDeviceAction(
  payload: FactoryRegisterPayload
): Promise<{ success: boolean; data?: Device; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/devices/factory-register`, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: json?.message || "Failed to factory-register device",
      };
    }

    revalidatePath("/dashboard/devices");
    return { success: true, data: json.data as Device };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error registering device" };
  }
}

// ─── 3b. Device Self-Registration Tokens (factory-floor, no admin credential) ──

export async function generateDeviceRegisterTokenAction(
  deviceModel: string
): Promise<{ success: boolean; data?: DeviceRegisterToken; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/devices/device-register-tokens`, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify({ device_model: deviceModel }),
    });

    const json = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: json?.message || "Failed to generate registration token",
      };
    }

    return { success: true, data: json.data as DeviceRegisterToken };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error generating token" };
  }
}

// ─── 4. Stock Warehouse Operations & Logistics ──────────────────────

export async function dispatchToVendorAction(data: {
  vendorAccountId: string;
  deviceIds: string[];
  tracking_number?: string;
  transfer_reason?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/devices/dispatch-to-vendor`, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to dispatch to vendor" };
    }

    revalidatePath("/dashboard/devices");
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error dispatching stock" };
  }
}

export async function getVendorInventoryAction(
  vendorAccountId?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const query = vendorAccountId ? `?vendorAccountId=${encodeURIComponent(vendorAccountId)}` : "";
    const res = await fetch(`${BACKEND_URL}/api/v1/devices/vendor-inventory${query}`, {
      headers: reqHeaders,
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to fetch vendor stock" };
    }

    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error fetching vendor stock" };
  }
}

export async function shipToCustomerAction(data: {
  device_id: string;
  customerBusinessAccountId: string;
  courier_name?: string;
  tracking_number?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/devices/ship-to-customer`, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to ship to customer" };
    }

    revalidatePath("/dashboard/devices");
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error shipping device" };
  }
}

export async function assignToCustomerAction(data: {
  device_id: string;
  customerBusinessAccountId: string;
  installation_address?: string;
  installation_notes?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/devices/assign-to-customer`, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to assign to customer" };
    }

    revalidatePath("/dashboard/devices");
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error assigning device" };
  }
}

export async function unassignDeviceAction(
  deviceId: string,
  data?: { targetStatus?: string; notes?: string }
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/devices/${encodeURIComponent(deviceId)}/unassign`,
      {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify(data || {}),
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to unassign device" };
    }

    revalidatePath("/dashboard/devices");
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error unassigning device" };
  }
}

export async function decommissionDeviceAction(
  deviceId: string,
  reason?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/devices/${encodeURIComponent(deviceId)}/decommission`,
      {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify({ reason }),
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to decommission device" };
    }

    revalidatePath("/dashboard/devices");
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error decommissioning device" };
  }
}

export async function moveToMaintenanceAction(
  deviceId: string,
  reason?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/devices/${encodeURIComponent(deviceId)}/maintenance`,
      {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify({ reason }),
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to move device to maintenance" };
    }

    revalidatePath("/dashboard/devices");
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error moving device to maintenance" };
  }
}

export async function returnToStockAction(
  deviceId: string,
  notes?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/devices/${encodeURIComponent(deviceId)}/return-to-stock`,
      {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify({ notes }),
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to return device to stock" };
    }

    revalidatePath("/dashboard/devices");
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error returning device to stock" };
  }
}

export async function deleteDeviceAction(
  deviceId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/devices/${encodeURIComponent(deviceId)}`,
      {
        method: "DELETE",
        headers: reqHeaders,
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to delete device" };
    }

    revalidatePath("/dashboard/devices");
    return { success: true, message: json?.message || "Device deleted" };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error deleting device" };
  }
}

// ─── 5. Vendors & Customers Helpers (for selection popups) ──────────

export async function getVendorsListAction(
  search?: string
): Promise<{
  success: boolean;
  data?: Array<{ id: string; name: string; vendorCode?: string; status: string }>;
  error?: string;
}> {
  try {
    const reqHeaders = await getAdminHeaders();
    const query = search && search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    const res = await fetch(`${BACKEND_URL}/api/v1/admin/vendors${query}`, {
      headers: reqHeaders,
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to fetch vendors" };
    }

    const vendors = (json.data || [])
      .filter((v: any) => v.verificationStatus === "VERIFIED")
      .map((v: any) => ({
        id: v.businessAccountId || v.id,
        name: v.companyName || v.businessAccount?.name || "Vendor",
        vendorCode: v.vendorCode,
        status: v.verificationStatus || "ACTIVE",
      }));

    return { success: true, data: vendors };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error fetching vendors" };
  }
}
