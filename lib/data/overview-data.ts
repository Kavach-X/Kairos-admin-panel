import "server-only";
import { cache } from "react";
import { getDevicesAction } from "@/lib/actions/device.actions";
import { getEventInsightsAction, getEventsAction } from "@/lib/actions/event.actions";
import type { Device } from "@/lib/types";

/**
 * Data for the overview page. Several sections need the same responses (device list, 24h / 7d
 * insights); React `cache` keys on argument identity, so these wrappers take primitive arguments
 * to make every section of one render share a single request.
 */

export const getOverviewDevices = cache(() => getDevicesAction({ limit: 250 }));

export const getOverviewInsights = cache((days: number) => getEventInsightsAction({ days }));

export const getOverviewRecentEvents = cache(() => getEventsAction({ limit: 8 }));

/** Installed or assigned to a customer: the units expected to be online. */
export const isDeployed = (d: Device) => d.inventory_status === "INSTALLED" || d.inventory_status === "ASSIGNED";

export const isOnline = (d: Device) => d.online ?? d.runtimeState?.online ?? false;

export const lastSeenOf = (d: Device) => d.runtimeState?.last_seen_at ?? null;
