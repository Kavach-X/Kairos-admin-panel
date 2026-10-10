# Kairos Admin Panel & Edge Platform — Pilot Testing Audit & Next Steps

This document outlines the current state of the Kairos Admin Panel and Edge Backend for **pilot store deployments**, highlighting verified production capabilities, critical gaps that must be resolved before placing boxes in live stores, and high-value roadmap additions.

---

## 1. Executive Summary & Pilot Readiness

| Component | Status | Readiness Assessment |
| :--- | :--- | :--- |
| **Main Dashboard (`/dashboard`)** | ✅ **Pilot Ready** | Clean 4-pillar overview (24h/total events, cameras, devices, vendors), dynamic fleet deployment donut chart, real live camera event feed. |
| **Event Triage & Forensics (`/activity`, `/[id]`)** | ✅ **Pilot Ready** | Event inspection, signed R2/S3 video chunk playback, forensic AI report breakdown, threat classification, manual review (confirm threat vs dismiss false alarm). |
| **Hardware Fleet Management (`/devices`)** | ⚠️ **Near Ready** | Device registration, factory MAC/serial pairing, state machine (`IN_STOCK` ↔ `WITH_VENDOR` ↔ `ASSIGNED` ↔ `MAINTENANCE`), direct customer shipping & vendor dispatch. *(Gaps: Heartbeat offline alerting).* |
| **Partner Vendors & KYC (`/vendors`)** | ✅ **Pilot Ready** | Three-tier multi-tenancy, acquisition attribution, KYC document verification (`PENDING`, `VERIFIED`, `REJECTED`), bank account validation. |
| **Hardware RMA & Ticketing (`/tickets`)** | ✅ **Pilot Ready** | Defective unit ticketing and zero-downtime RMA hardware swap modal (preserves camera RTSP channel bindings). |
| **Customer Store Onboarding (`/customers`)** | ⚠️ **Action Needed** | Customer profiles are viewable, but adding new stores and binding camera RTSP credentials requires a streamlined onboarding modal. |

---

## 2. Completed & Verified Pilot Features

### A. Core Platform Dashboard (`/dashboard`)
- **Minimal Design Standard**: Hairline borders (`border-border/50`), `shadow-none`, compact micro-typography (`text-[11px] uppercase`), and monospace metrics.
- **Accurate Metric Calculations**:
  - **Edge Devices**: Total units, deployed count, warehouse stock.
  - **Camera Streams**: Total RTSP streams across all customer stores.
  - **Security Events**: Exact count in the past 24 hours (`X in 24h`), platform-wide historical total (`Y total events`), and alert status (`all clear` vs `X alerts`).
  - **Partner Vendors**: Total vendors, verified count, and strictly verified pending KYC review count.
- **Fleet Deployment Dial**: Centered SVG Donut Chart showing real database allocation across stores, stock, partners, and maintenance.
- **Live Camera Activity Feed**: Dynamic real-time event feed pulling live events with store names, camera channels, threat levels, and relative timestamps.

### B. Security Events & AI Telemetry (`/dashboard/activity` & `/[id]`)
- **Triage Filter Engine**: Real-time filtering by severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `NONE`) and status (`CONFIRMED_ALERT`, `RECORDED`, `PROCESSING_AI`, `DISCARDED_FALSE_ALARM`, `DISMISSED_BY_USER`).
- **Date Range Support**: Backend and frontend support for `startDate` and `endDate` queries.
- **Forensic Investigation**:
  - Full video playback with temporary presigned URLs.
  - AI analysis summary with edge confidence scoring.
  - Raw AI forensic payload inspection.
  - Operator actions: **Confirm Threat** or **Dismiss False Alarm** with reason.
  - Preserved scroll position: table preserves user scroll, while detail pages scroll to top on load.

### C. Device Lifecycle & RMA Management (`/dashboard/devices` & `/dashboard/tickets`)
- **Factory Registration**: Device ID, MAC Address, Model, and Firmware versioning.
- **Assignment & Dispatch**: Assigning edge boxes to managing vendors or directly to customer accounts.
- **RMA Hardware Swap**: Swapping defective hardware with in-stock units without losing camera channel mappings or historical incident history.

---

## 3. Critical Gaps to Complete Before Live Store Pilot

These items directly impact field technicians and store operators during physical hardware rollouts:

### 1. Store & RTSP Camera Provisioning Modal (`/dashboard/customers`)
- **Issue**: Admins can view customer profiles, but creating a new customer store and setting up RTSP camera streams (IP, RTSP URL, Port, Channel number, credentials) is partially manual.
- **Requirement**: Build a streamlined **"Add Store & Cameras"** wizard modal allowing admins or technicians to onboard a customer store in under 2 minutes.

### 2. Edge Device Heartbeat & Offline Alerting (`/dashboard/devices`)
- **Issue**: Devices communicate via MQTT / AWS IoT Shadow. In retail stores, power cuts or WiFi drops happen frequently. Currently, there is no visual indicator if an edge box stops pinging.
- **Requirement**:
  - Add a **"Last Seen"** timestamp on device rows.
  - Display an amber/red **"Offline"** badge if no heartbeat has been received in >5 minutes.
  - Add an "Offline Devices" filter tab.

### 3. Live RTSP Feed Health & Stream Preview
- **Issue**: Operators can watch recorded 10-second alert clips, but cannot check if a camera is currently streaming live during initial physical camera aiming.
- **Requirement**: Provide a live stream test button or snapshot preview inside the device details sheet (`device-details-sheet.tsx`) to verify RTSP feed connectivity.

### 4. Real-time Incident Push (Server-Sent Events / WebSockets)
- **Issue**: Incident lists require manual page reload or router polling.
- **Requirement**: Implement SSE or WebSocket notification toasts on the admin panel so that when a `CRITICAL` or `HIGH` intrusion event is triggered, operators receive an instant audio/visual alert.

### 5. Design Consistency Across Remaining Pages
- **Issue**: The Main Dashboard (`/dashboard`) and Events page (`/dashboard/activity`) follow the new compact, hairline minimalist UI. Other views (`/dashboard/devices`, `/dashboard/customers`, `/dashboard/vendors`, `/dashboard/tickets`) still use older card padding and typography.
- **Requirement**: Apply the identical `p-4`, `shadow-none`, `border-border/50`, `text-[11px] uppercase` design system across all remaining dashboard subpages.

---

## 4. High-Value Roadmap Additions (Post-Pilot Growth)

Features that demonstrate Kairos's proprietary edge AI and operational advantages to enterprise clients and investors:

### 1. AI Diagnostics & Model Accuracy Telemetry
- **Backend Ready**: The endpoint `/api/v1/events/admin/model-metrics` already computes:
  - Edge model precision & recall.
  - Confusion matrix (true positives vs false alarms).
  - Top false alarm causes (shadows, insects, lighting changes).
  - Camera drift alerts.
- **Frontend Action**: Add an **"AI Telemetry & Diagnostics"** tab in the admin panel to showcase model accuracy metrics and false alarm reduction rates.

### 2. Multi-Camera CCTV Mosaic / Video Wall
- A 4x4 or 8x8 CCTV wall view where store owners or security admins can view snapshots or live low-bitrate streams of all store cameras on a single screen.

### 3. Automated WhatsApp / Telegram Incident Dispatch
- Webhook integration to instantly deliver high-threat incident clips and confirm/dismiss buttons directly to a store owner's WhatsApp.

### 4. Remote Device Actions (Reboot & OTA Updates)
- Sending MQTT control commands from the admin panel to trigger edge box reboots or download new YOLO model weights over the air.

### 5. Audit Logging & Security Activity Trail
- Full traceability tracking which admin confirmed/dismissed an incident, who approved vendor KYC, and who performed device dispatching.

---

## 5. Prioritized Implementation Checklist

- [ ] **Phase 1: Customer Onboarding Wizard**
  - [ ] Add `CreateCustomerModal` with store address and primary contact.
  - [ ] Add RTSP camera channel builder (Channel 1-8 RTSP URLs and credentials).
- [ ] **Phase 2: Edge Heartbeat & Offline Monitoring**
  - [ ] Track `lastPingAt` / `isOnline` from AWS IoT Shadow in device list.
  - [ ] Add offline device counter and alerting badge.
- [ ] **Phase 3: Real-Time Event Alerts**
  - [ ] Connect SSE or WebSocket listener in `dashboard-shell.tsx`.
  - [ ] Display instant notification toast when `CRITICAL` alert triggers.
- [x] **Phase 4: UI System Polish on Remaining Subpages** (Completed)
  - [x] Update `/dashboard/devices` table, KPI cards, and filter bar.
  - [x] Update `/dashboard/customers` KPI cards, tabs, and tables.
  - [x] Update `/dashboard/vendors` KPI cards, tabs, and tables.
  - [x] Update `/dashboard/tickets` KPI cards, filters, and tables.
  - [x] Update `/dashboard/device-models` and `/dashboard/bank-details` and `/dashboard/users`.
- [ ] **Phase 5: AI Diagnostics Dashboard**
  - [ ] Create `/dashboard/analytics` view visualizing model confusion metrics and false alarm reduction scores.
