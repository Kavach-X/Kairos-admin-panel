/**
 * Type definitions shared across the admin panel.
 * Mirrors the backend Prisma models and API response shapes.
 */

// ─── Auth / Session ───────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  phoneNumber: string | null;
  phoneNumberVerified: boolean;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  activeBusinessAccountId: string | null;
}

export interface AuthSession {
  user: User;
  session: Session;
}

// ─── Business Account ─────────────────────────────────────────
export type AccountType = "CUSTOMER" | "VENDOR" | "INTERNAL";

export interface BusinessAccount {
  id: string;
  name: string;
  accountType: AccountType;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessAccountMembership {
  id: string;
  userId: string;
  businessAccountId: string;
  roleCode: string;
  status: string;
  isOwner: boolean;
  businessAccount: BusinessAccount;
}

// ─── Admin context ────────────────────────────────────────────
export interface AdminContext {
  user: User;
  session: Session;
  membership: BusinessAccountMembership;
}

// ─── API response envelope ────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  errorCode?: string;
}

// ─── Dashboard stats (static for v1) ─────────────────────────
export interface DashboardStats {
  totalUsers: number;
  totalDevices: number;
  totalVendors: number;
  totalCustomers: number;
  activeDevices: number;
  totalEvents: number;
  openTickets: number;
  revenue: number;
}

// ─── Device Hardware Models (Catalog / Blueprint) ───────────
export interface DeviceModelSpecs {
  npuTops?: number;
  ramGb?: number;
  storageGb?: number;
  maxStreams?: number;
  soc?: string;
  architecture?: string;
  [key: string]: unknown;
}

export interface DeviceModel {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  specs: DeviceModelSpecs | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  devices?: Array<{ device_id: string }>;
  _count?: { devices: number };
}

// ─── Device Inventory & Status ──────────────────────────────
export type DeviceInventoryStatus =
  | "IN_STOCK"
  | "WITH_VENDOR"
  | "ASSIGNED"
  | "INSTALLED"
  | "MAINTENANCE"
  | "RETURNED"
  | "DECOMMISSIONED";

export type DeviceOperationalStatus = "OFFLINE" | "ONLINE" | "DEGRADED";

export interface DeviceRuntimeState {
  online: boolean;
  operational_status: DeviceOperationalStatus;
  last_seen_at: string | null;
  last_online_at: string | null;
  last_offline_at: string | null;
  disconnect_reason: string | null;
  last_alert_sent_at: string | null;
}

export type TelemetryRange = "24h" | "7d" | "30d";

export interface DeviceTelemetryPoint {
  timestamp: string;
  avg_temp: number;
  max_temp: number;
  avg_cpu: number;
  max_cpu: number;
  avg_memory: number;
  uptime_percent: number | null;
  // Optional device fields; null on rows that predate them or when the device didn't send them
  disk_percent: number | null;
  uptime_seconds: number | null;
  network_type: string | null;
  wifi_rssi_dbm: number | null;
  pipeline_status: string | null;
  firmware_version: string | null;
  cameras_configured: number | null;
  npu_temp_celsius: number | null;
  npu_state: string | null;
}

/** One on-demand live check, as plotted on the charts (GET /metrics -> live_samples). */
export interface DeviceLiveSample {
  recorded_at: string;
  temp: number | null;
  cpu: number | null;
  memory: number | null;
  disk: number | null;
  uptime_seconds: number | null;
  pipeline_status: DevicePipelineStatus | null;
}

export interface DeviceTelemetryHistory {
  device_id: string;
  range: TelemetryRange;
  count: number;
  metrics: DeviceTelemetryPoint[];
  live_samples: DeviceLiveSample[];
}

/** One row of GET /live-history (latest on-demand live checks, newest first). */
export interface DeviceLiveHistorySample extends DeviceLiveSample {
  request_id: string | null;
  avg_temp: number | null;
  firmware_version: string | null;
  wifi_rssi_dbm: number | null;
  network_type: string | null;
  camera_health: Record<string, boolean> | null;
  extra: Record<string, unknown> | null;
}

export interface DeviceLiveHistory {
  device_id: string;
  count: number;
  samples: DeviceLiveHistorySample[];
}

export type DevicePipelineStatus = "running" | "idle_no_camera" | "stopped";

export interface DeviceLiveVitalsReading {
  temperature_celsius: number | null;
  temperature_avg_celsius: number | null;
  cpu_percent: number | null;
  memory_percent: number | null;
  disk_percent: number | null;
  uptime_seconds: number | null;
  firmware_version: string | null;
  pipeline_status: DevicePipelineStatus | null;
  network_type: string | null;
  wifi_rssi_dbm: number | null;
}

/** Result of GET /devices/:id/live (on-demand health_check round-trip to the device). */
export type DeviceLiveResult =
  | {
      status: "OFFLINE";
      device_id: string;
      last_seen_at: string | null;
    }
  | {
      status: "NO_RESPONSE";
      device_id: string;
      request_id: string;
      last_seen_at: string | null;
    }
  | {
      status: "LIVE";
      device_id: string;
      recorded_at: string;
      request_id: string;
      vitals: DeviceLiveVitalsReading;
      camera_health: Record<string, boolean> | null;
      extra: Record<string, unknown> | null;
    };

export interface Device {
  device_id: string;
  modelCode: string;
  inventory_status: DeviceInventoryStatus;
  custodianAccountId: string | null;
  businessAccountId: string | null;
  installedByVendorAccountId: string | null;
  assignedToUserId: string | null;
  certificate_id: string | null;
  machine: string | null;
  eth_mac: string;
  wlan_mac: string | null;
  ble_mac: string | null;
  soc_id: string | null;
  soc_serial: string | null;
  storage_serial: string | null;
  activated_at: string | null;
  installation_address: string | null;
  installation_notes: string | null;
  claim_code?: string | null;
  claim_code_expires_at?: string | null;
  claimed?: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  online?: boolean;
  operational_status?: DeviceOperationalStatus;
  runtimeState?: DeviceRuntimeState | null;
  model?: {
    code: string;
    name: string;
    specs: DeviceModelSpecs | null;
    is_active: boolean;
  } | null;
  ownerBusinessAccount?: {
    id: string;
    name: string;
    accountType: string;
    status: string;
  } | null;
  installedByVendor?: {
    id: string;
    name: string;
  } | null;
  custodianAccount?: {
    id: string;
    name: string;
    accountType: string;
  } | null;
  cameras?: DeviceCameraItem[];
}

export interface DeviceCameraItem {
  id: string;
  channelNumber: number;
  name: string;
  ipAddress: string;
  port: number;
  rtspPath: string;
  subStreamPath?: string | null;
  resolution?: string;
  fpsLimit?: number;
  aiTasks: string[];
  status: "ACTIVE" | "OFFLINE" | "UNREACHABLE" | "DEGRADED" | string;
  lastHealthCheckAt?: string | null;
  createdAt: string;
}

export interface DevicePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface DeviceListResult {
  items: Device[];
  pagination: DevicePagination;
}

export interface FactoryRegisterPayload {
  device_id: string;
  model_code: string;
  raw_secret: string;
  eth_mac: string;
  wlan_mac?: string;
  ble_mac: string;
  machine?: string;
  soc_id?: string;
  soc_serial?: string;
  storage_serial?: string;
  metadata?: Record<string, unknown>;
}

// ─── Device Self-Registration Tokens (factory-floor, no admin credential) ──
export interface DeviceRegisterToken {
  token: string;
  device_model: string;
  expires_at: string;
}

export type AccountStatus = "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION" | "CLOSED";
export type DeviceItem = Device;

// ─── Vendor Management ───────────────────────────────────────
export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface VendorItem {
  id: string;
  businessAccountId: string;
  vendorCode: string;
  companyName: string;
  legalName: string | null;
  gstNumber: string | null;
  panNumber: string;
  address: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  businessAccount: {
    id: string;
    name: string;
    status: AccountStatus;
    ownerUserId: string;
    owner?: {
      id: string;
      name: string;
      email: string;
      phoneNumber: string | null;
    } | null;
    bankDetails?: Array<{
      id: string;
      bank_name: string;
      account_no: string;
      ifsc: string;
      branch_name: string | null;
      is_active: boolean;
    }>;
    _count?: {
      acquiredCustomers: number;
      managedCustomers: number;
      custodianDevices: number;
      installedDevices: number;
    };
  };
}

// ─── Customer Management ─────────────────────────────────────
export interface CustomerItem {
  id: string;
  name: string;
  status: AccountStatus;
  createdAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string | null;
    emailVerified?: boolean;
    phoneNumberVerified?: boolean;
  };
  profile: {
    id: string;
    acquisitionType: string;
    managedByVendor?: {
      id: string;
      name: string;
      vendorProfile?: { vendorCode: string; companyName: string } | null;
    } | null;
    acquiredByVendor?: {
      id: string;
      name: string;
      vendorProfile?: { vendorCode: string; companyName: string } | null;
    } | null;
    meta_data?: Record<string, unknown> | null;
  } | null;
  activeBoxes: number;
  installedBoxes?: number;
  assignedBoxes?: number;
  onlineBoxes: number;
  totalCameras: number;
  counts?: {
    devices: number;
    tickets: number;
    cameraEvents: number;
  };
}

export interface CustomerDetail extends CustomerItem {
  updatedAt?: string;
  devices: Device[];
  tickets: TicketItem[];
  stats: {
    installedBoxes: number;
    assignedBoxes: number;
    onlineBoxes: number;
    totalCameras: number;
    openTickets: number;
    totalTickets: number;
  };
}

// ─── Support Tickets & RMA ───────────────────────────────────
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface TicketItem {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  businessAccountId: string;
  assignedVendorAccountId: string | null;
  assignedToUserId: string | null;
  createdAt: string;
  updatedAt: string;
  customerAccount?: {
    id: string;
    name: string;
  };
  assignedVendor?: {
    id: string;
    name: string;
  } | null;
  assignedToUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

// ─── Bank Details ───────────────────────────────────────────
export interface BankDetailItem {
  id: string;
  businessAccountId: string;
  bank_name: string;
  account_no: string;
  ifsc: string;
  branch_name: string | null;
  is_active: boolean;
  createdAt: string;
  businessAccount?: {
    id: string;
    name: string;
    accountType: AccountType;
    status: AccountStatus;
  };
}

// ─── Platform Users ─────────────────────────────────────────
export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  emailVerified: boolean;
  createdAt: string;
  memberships?: Array<{
    roleCode: string;
    businessAccount: {
      name: string;
      accountType: AccountType;
    };
  }>;
}

// ─── Camera AI Events & Telemetry ─────────────────────────────
export type EventThreatLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
export type EventIncidentStatus =
  | "PENDING_UPLOAD"
  | "RECORDED"
  | "PROCESSING_AI"
  | "CONFIRMED_ALERT"
  | "DISCARDED_FALSE_ALARM"
  | "DISMISSED_BY_USER";

export interface CameraEventThumbnailItem {
  id: string;
  thumbnailUrl?: string;
  thumbnail_url?: string;
  view_url?: string;
  viewUrl?: string;
  isPrimary?: boolean;
  is_primary?: boolean;
  aiStatus?: string;
  ai_status?: string;
  aiSummary?: string | null;
  ai_summary?: string | null;
  threatLevel?: EventThreatLevel;
  threat_level?: EventThreatLevel;
  isVerified?: boolean;
  is_verified?: boolean;
  detectedObjects?: string[];
  detected_objects?: string[];
  aiAnalyzedAt?: string | null;
  ai_analyzed_at?: string | null;
  createdAt?: string;
  created_at?: string;
}

export interface CameraEventVideoChunk {
  id: string;
  sequence_number?: number;
  sequenceNumber?: number;
  clip_url?: string;
  clipUrl?: string;
  playback_url?: string;
  playbackUrl?: string;
  duration_seconds?: number;
  durationSeconds?: number;
  clip_size_bytes?: number;
  clipSizeBytes?: number;
  is_recorded?: boolean;
  isRecorded?: boolean;
  ai_status?: string;
  aiStatus?: string;
  ai_summary?: string | null;
  aiSummary?: string | null;
  threat_level?: EventThreatLevel;
  threatLevel?: EventThreatLevel;
  is_verified?: boolean;
  isVerified?: boolean;
  detected_objects?: string[];
  detectedObjects?: string[];
  ai_analyzed_at?: string | null;
  aiAnalyzedAt?: string | null;
  created_at?: string;
  createdAt?: string;
}

export interface CameraEventItem {
  id: string;
  deviceId: string;
  device_id?: string;
  cameraId: string;
  camera_id?: string;
  businessAccountId: string;
  business_account_id?: string;
  channelNumber: number | null;
  channel_number?: number | null;
  edgeLabel: string;
  edge_label?: string;
  edgeConfidence: number | null;
  edge_confidence?: number | null;
  threatLevel: EventThreatLevel;
  threat_level?: EventThreatLevel;
  status: EventIncidentStatus;
  falseAlarmReason: string | null;
  false_alarm_reason?: string | null;
  isOngoing: boolean;
  is_ongoing?: boolean;
  totalDurationSeconds: number;
  total_duration_seconds?: number;
  videoCount: number;
  video_count?: number;
  alertDispatchedAt: string | null;
  alert_dispatched_at?: string | null;
  alertChannels: string[];
  alert_channels?: string[];
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
  camera?: {
    id: string;
    name: string;
    channelNumber: number | null;
  } | null;
  device?: {
    device_id: string;
    modelCode: string;
    installation_address?: string | null;
  } | null;
  account?: {
    id: string;
    name: string;
  } | null;
  cover_thumbnail?: CameraEventThumbnailItem | null;
  thumbnails?: CameraEventThumbnailItem[];
  videos?: CameraEventVideoChunk[];
}

export interface CameraEventDetail extends CameraEventItem {
  cover_thumbnail?: CameraEventThumbnailItem | null;
  thumbnails?: CameraEventThumbnailItem[];
  videos?: CameraEventVideoChunk[];
  [key: string]: any;
}

export interface EventAnalyticsData {
  fleet_total_events: number;
  fleet_confirmed_threats: number;
  fleet_false_alarms_filtered: number;
  cloud_ai_filtering_accuracy: string;
}



