import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getDeviceModelsAction, getVendorsListAction } from "@/lib/actions/device.actions";

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
