"use server";

import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifyAdminAccess } from "@/lib/session";
import type {
  CameraEventItem,
  CameraEventDetail,
  EventAnalyticsData,
  EventThreatLevel,
  EventIncidentStatus,
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

export interface EventPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export async function getEventsAction(params?: {
  status?: string;
  threatLevel?: string;
  search?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}): Promise<{
  success: boolean;
  data?: {
    items: CameraEventItem[];
    total: number;
    pagination: EventPaginationMeta;
  };
  error?: string;
}> {
  try {
    const reqHeaders = await getAdminHeaders();
    const searchParams = new URLSearchParams();
    searchParams.set("includeUnverified", "true");
    const limit = params?.limit || 15;
    const page = params?.page || 1;
    searchParams.set("limit", String(limit));
    searchParams.set("page", String(page));
    if (params?.search && params.search.trim()) {
      searchParams.set("search", params.search.trim());
    }
    if (params?.status && params.status !== "ALL") searchParams.set("status", params.status);
    if (params?.threatLevel && params.threatLevel !== "ALL") {
      searchParams.set("threatLevel", params.threatLevel);
    }
    if (params?.startDate) {
      searchParams.set("startDate", params.startDate);
    }
    if (params?.endDate) {
      searchParams.set("endDate", params.endDate);
    }

    const queryStr = searchParams.toString();
    const res = await fetch(`${BACKEND_URL}/api/v1/events?${queryStr}`, {
      headers: reqHeaders,
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to fetch activity events" };
    }

    const items = json.data?.items || json.data || [];
    const total =
      json.pagination?.total ??
      json.data?.pagination?.total ??
      (Array.isArray(items) ? items.length : 0);
    const pagination: EventPaginationMeta = json.pagination
      ? {
          page: json.pagination.page ?? page,
          limit: json.pagination.limit ?? limit,
          total: json.pagination.total ?? total,
          totalPages:
            json.pagination.total_pages ??
            Math.max(1, Math.ceil((json.pagination.total ?? total) / (json.pagination.limit ?? limit))),
          hasNext:
            json.pagination.has_next ??
            (page * (json.pagination.limit ?? limit) < (json.pagination.total ?? total)),
          hasPrev: json.pagination.has_prev ?? (page > 1),
        }
      : json.data?.pagination || {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        };

    return {
      success: true,
      data: {
        items: items as CameraEventItem[],
        total,
        pagination,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error fetching events" };
  }
}

function normalizeEventDetail(raw: any): CameraEventDetail {
  if (!raw) return raw;
  const videos = (raw.videos || []).map((v: any) => ({
    id: v.id,
    sequenceNumber: v.sequence_number ?? v.sequenceNumber ?? 1,
    clipUrl: v.clip_url ?? v.clipUrl ?? "",
    playbackUrl: v.playback_url ?? v.playbackUrl ?? v.clip_url ?? v.clipUrl ?? "",
    durationSeconds: v.duration_seconds ?? v.durationSeconds ?? 10,
    clipSizeBytes: v.clip_size_bytes ?? v.clipSizeBytes ?? 0,
    isRecorded: v.is_recorded ?? v.isRecorded ?? true,
    aiStatus: v.ai_status ?? v.aiStatus ?? "COMPLETED",
    aiSummary: v.ai_summary ?? v.aiSummary ?? null,
    threatLevel: v.threat_level ?? v.threatLevel ?? "NONE",
    isVerified: v.is_verified ?? v.isVerified ?? false,
    detectedObjects: v.detected_objects ?? v.detectedObjects ?? [],
    aiAnalyzedAt: v.ai_analyzed_at ?? v.aiAnalyzedAt ?? null,
    createdAt: v.created_at ?? v.createdAt ?? "",
  }));

  const thumbnails = (raw.thumbnails || []).map((t: any) => ({
    id: t.id,
    thumbnailUrl: t.thumbnail_url ?? t.thumbnailUrl ?? "",
    viewUrl: t.view_url ?? t.viewUrl ?? t.thumbnail_url ?? t.thumbnailUrl ?? "",
    isPrimary: t.is_primary ?? t.isPrimary ?? false,
    aiStatus: t.ai_status ?? t.aiStatus ?? "COMPLETED",
    aiSummary: t.ai_summary ?? t.aiSummary ?? null,
    threatLevel: t.threat_level ?? t.threatLevel ?? "NONE",
    isVerified: t.is_verified ?? t.isVerified ?? false,
    detectedObjects: t.detected_objects ?? t.detectedObjects ?? [],
    aiAnalyzedAt: t.ai_analyzed_at ?? t.aiAnalyzedAt ?? null,
    createdAt: t.created_at ?? t.createdAt ?? "",
  }));

  const primaryThumb =
    thumbnails.find((t: any) => t.isPrimary) ||
    thumbnails[0] ||
    (raw.cover_thumbnail
      ? {
          id: raw.cover_thumbnail.id,
          thumbnailUrl: raw.cover_thumbnail.thumbnail_url ?? raw.cover_thumbnail.thumbnailUrl,
          viewUrl: raw.cover_thumbnail.view_url ?? raw.cover_thumbnail.viewUrl ?? raw.cover_thumbnail.thumbnail_url,
          isPrimary: true,
          aiStatus: raw.cover_thumbnail.ai_status ?? raw.cover_thumbnail.aiStatus,
          aiSummary: raw.cover_thumbnail.ai_summary ?? raw.cover_thumbnail.aiSummary,
          threatLevel: raw.cover_thumbnail.threat_level ?? raw.cover_thumbnail.threatLevel,
          isVerified: raw.cover_thumbnail.is_verified ?? raw.cover_thumbnail.isVerified,
          detectedObjects: raw.cover_thumbnail.detected_objects ?? raw.cover_thumbnail.detectedObjects ?? [],
        }
      : null);

  return {
    id: raw.id,
    deviceId: raw.deviceId ?? raw.device_id ?? "",
    cameraId: raw.cameraId ?? raw.camera_id ?? "",
    businessAccountId: raw.businessAccountId ?? raw.business_account_id ?? "",
    channelNumber: raw.channelNumber ?? raw.channel_number ?? 1,
    edgeLabel: raw.edgeLabel ?? raw.edge_label ?? "Detection Event",
    edgeConfidence: raw.edgeConfidence ?? raw.edge_confidence ?? null,
    threatLevel: raw.threatLevel ?? raw.threat_level ?? "NONE",
    status: raw.status ?? "RECORDED",
    falseAlarmReason: raw.falseAlarmReason ?? raw.false_alarm_reason ?? null,
    isOngoing: raw.isOngoing ?? raw.is_ongoing ?? false,
    totalDurationSeconds: raw.totalDurationSeconds ?? raw.total_duration_seconds ?? 0,
    videoCount: raw.videoCount ?? raw.video_count ?? 0,
    alertDispatchedAt: raw.alertDispatchedAt ?? raw.alert_dispatched_at ?? null,
    alertChannels: raw.alertChannels ?? raw.alert_channels ?? [],
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.updated_at ?? new Date().toISOString(),
    camera: raw.camera || null,
    device: raw.device || null,
    account: raw.account || null,
    cover_thumbnail: primaryThumb,
    thumbnails,
    videos,
  };
}

export async function getEventDetailsAction(
  eventId: string
): Promise<{ success: boolean; data?: CameraEventDetail; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/events/${encodeURIComponent(eventId)}`,
      {
        headers: reqHeaders,
        cache: "no-store",
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to fetch event details" };
    }

    return { success: true, data: normalizeEventDetail(json.data) };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error fetching event details" };
  }
}

export async function getEventStatsAction(): Promise<{
  success: boolean;
  data?: EventAnalyticsData;
  error?: string;
}> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(`${BACKEND_URL}/api/v1/events/admin/analytics`, {
      headers: reqHeaders,
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to fetch event statistics" };
    }

    return { success: true, data: json.data as EventAnalyticsData };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error fetching event statistics" };
  }
}

export async function reviewEventAction(
  eventId: string,
  data: {
    status: "CONFIRMED_ALERT" | "DISMISSED_BY_USER";
    falseAlarmReason?: string;
  }
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const reqHeaders = await getAdminHeaders();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/events/${encodeURIComponent(eventId)}/review`,
      {
        method: "PATCH",
        headers: reqHeaders,
        body: JSON.stringify(data),
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.message || "Failed to review event" };
    }

    revalidatePath("/dashboard/activity");
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error reviewing event" };
  }
}
