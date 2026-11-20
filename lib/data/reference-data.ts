import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getDeviceModelsAction, getDevicesAction, getVendorsListAction } from "@/lib/actions/device.actions";
import type { AnalyticsFilterOptions } from "@/lib/types";

/**
 * Slow-changing reference lists, cached per browser session ("use cache: private":
 * nothing is stored on the server and it can read the session cookie). The `stale`
 * window feeds the client router cache, so revisits and prefetches are instant.
 * Mutations clear them with updateTag using the same tag literals.
 *
 * Failures throw inside the cached scope so an error response is never cached;
 * the exported wrappers turn that back into the usual { success: false } shape.
 */
const MODELS_TAG = "device-models"; // cleared by create/updateDeviceModelAction
const VENDORS_TAG = "vendors-list"; // cleared by verifyVendorAction
const ANALYTICS_FILTERS_TAG = "analytics-filter-options"; // time-based only: a new device appears within 5 min

type ModelsResult = Awaited<ReturnType<typeof getDeviceModelsAction>>;
type VendorsResult = Awaited<ReturnType<typeof getVendorsListAction>>;

async function cachedDeviceModels(): Promise<ModelsResult> {
  "use cache: private";
  cacheTag(MODELS_TAG);
  cacheLife({ stale: 60, revalidate: 300, expire: 900 });
  const res = await getDeviceModelsAction();
  if (!res.success) throw new Error(res.error || "Failed to fetch device models");
  return res;
}

async function cachedVendorsList(): Promise<VendorsResult> {
  "use cache: private";
  cacheTag(VENDORS_TAG);
  cacheLife({ stale: 60, revalidate: 300, expire: 900 });
  const res = await getVendorsListAction();
  if (!res.success) throw new Error(res.error || "Failed to fetch vendors");
  return res;
}

export async function getDeviceModels(): Promise<ModelsResult> {
  try {
    return await cachedDeviceModels();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to fetch device models" };
  }
}

export async function getVendorsList(): Promise<VendorsResult> {
  try {
    return await cachedVendorsList();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to fetch vendors" };
  }
}

/**
 * Device / customer pickers for the analytics filters, projected down to ids and names.
 * Customers are derived from device owners: only accounts with devices can have events.
 */
async function cachedAnalyticsFilterOptions(): Promise<AnalyticsFilterOptions> {
  "use cache: private";
  cacheTag(ANALYTICS_FILTERS_TAG);
  cacheLife({ stale: 60, revalidate: 300, expire: 900 });
  const res = await getDevicesAction({ limit: 250 });
  if (!res.success || !res.data) throw new Error(res.error || "Failed to fetch devices");

  const customers = new Map<string, string>();
  const devices = res.data.items.map((d) => {
    const accountId = d.ownerBusinessAccount?.id ?? d.businessAccountId ?? null;
    const accountName = d.ownerBusinessAccount?.name ?? null;
    if (accountId && accountName) customers.set(accountId, accountName);
    return { deviceId: d.device_id, accountId, accountName };
  });

  return {
    devices: devices.sort((a, b) => a.deviceId.localeCompare(b.deviceId)),
    customers: Array.from(customers, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function getAnalyticsFilterOptions(): Promise<AnalyticsFilterOptions> {
  try {
    return await cachedAnalyticsFilterOptions();
  } catch {
    // Filters degrade to "all" rather than failing the page.
    return { devices: [], customers: [] };
  }
}
