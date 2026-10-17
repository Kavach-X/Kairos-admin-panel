# Kairos Admin Panel — Complete End-to-End QA Test Suite & Test Cases

This document provides a **complete, step-by-step, plain-English test manual** for QA testers, operations leads, and developers to test every feature, workflow, and edge case of the **Kairos Admin Panel**.

---

## 📋 Table of Contents
1. [Testing Guidelines & Legend](#1-testing-guidelines--legend)
2. [Test Environment Setup & Credentials](#2-test-environment-setup--credentials)
3. [Module 1: Authentication & Access Control (Login, OTP, RBAC)](#module-1-authentication--access-control)
4. [Module 2: Dashboard Overview & Fleet Telemetry](#module-2-dashboard-overview--fleet-telemetry)
5. [Module 3: Partner Vendors & KYC Compliance](#module-3-partner-vendors--kyc-compliance)
6. [Module 4: Hardware Fleet & Inventory Management](#module-4-hardware-fleet--inventory-management)
7. [Module 5: Factory Device Registration & Edge Provisioning](#module-5-factory-device-registration--edge-provisioning)
8. [Module 6: Hardware Logistics & Consignment Dispatch (Vendor vs Customer)](#module-6-hardware-logistics--consignment-dispatch)
9. [Module 7: Hardware RMA & Defective Unit Swapping (Tickets)](#module-7-hardware-rma--defective-unit-swapping)
10. [Module 8: Customer Store Management & Store Onboarding](#module-8-customer-store-management--store-onboarding)
11. [Module 9: Security Event Triage & AI Telemetry Forensics](#module-9-security-event-triage--ai-telemetry-forensics)
12. [Module 10: Hardware Models Catalog](#module-10-hardware-models-catalog)
13. [Module 11: Settlement Bank Accounts & Payout Approvals](#module-11-settlement-bank-accounts--payout-approvals)
14. [Module 12: Internal Team & User Access Control](#module-12-internal-team--user-access-control)
15. [Module 13: System Resilience, Network & Edge Cases](#module-13-system-resilience-network--edge-cases)
16. [QA Sign-Off Checklist & Execution Tracker](#14-qa-sign-off-checklist--execution-tracker)

---

## 1. Testing Guidelines & Legend

- **Severity Levels**:
  - `P0 - Blocker`: Prevents core business operations (e.g., login failure, hardware dispatch failure).
  - `P1 - High`: Major functionality impaired without acceptable workaround (e.g., KYC approval fails).
  - `P2 - Medium`: Non-critical functionality failure or validation bug (e.g., filter glitch).
  - `P3 - Low`: Cosmetic, typographical, or minor styling issue.
- **Test Result Badges**:
  - `[ ] PASS`: Feature worked exactly as specified.
  - `[ ] FAIL`: Feature produced an error, unexpected UI state, or incorrect data.
  - `[ ] BLOCKED`: Cannot test due to dependency on another broken feature.

---

## 2. Test Environment Setup & Credentials

- **Admin Panel URL**: `http://localhost:3000` (Local) or Staging URL.
- **Backend API URL**: `https://kairos-backend-351319738025.asia-south1.run.app`
- **Required Roles**:
  - `SUPER_ADMIN` (Full administrative console access).
  - Non-Admin Test Account (To verify rejection / access control).
- **Test Data Requirements**:
  - At least 1 Vendor in `PENDING` KYC status.
  - At least 1 Vendor in `VERIFIED` KYC status.
  - At least 1 Vendor in `REJECTED` KYC status.
  - At least 2 Edge Boxes in `IN_STOCK` status.
  - At least 1 Customer site with an active camera stream.

---

## Module 1: Authentication & Access Control

### TC-AUTH-001: Email OTP Login — Happy Path
- **Priority**: `P0 - Blocker`
- **Objective**: Verify super-admin can log in successfully via email one-time password (OTP).
- **Preconditions**: Admin email registered in database with SuperAdmin role.
- **Steps**:
  1. Open browser and navigate to `/login`.
  2. Select the **Email** tab (default).
  3. Enter valid admin email (e.g., `admin@kairos.video`).
  4. Click **"Send Verification Code"**.
  5. Check email or developer console for the 6-digit OTP.
  6. Enter the 6-digit OTP in the input fields.
  7. Click **"Verify & Sign In"**.
- **Expected Result**:
  - Success message briefly displayed.
  - Browser automatically redirects to `/dashboard`.
  - Session cookie `better-auth.session_token` is saved in browser storage.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-AUTH-002: Phone OTP Login — Happy Path (+91 Auto-Prefix)
- **Priority**: `P0 - Blocker`
- **Objective**: Verify login via phone number with automatic international country code formatting.
- **Preconditions**: Valid phone number linked to an admin account.
- **Steps**:
  1. Navigate to `/login`.
  2. Switch tab to **"Phone"**.
  3. Enter 10-digit mobile number without `+91` (e.g., `9876543210`).
  4. Click **"Send SMS Code"**.
  5. Check SMS / backend logs for verification code.
  6. Enter the OTP code.
  7. Click **"Sign In"**.
- **Expected Result**:
  - Payload automatically normalizes phone number to `+919876543210`.
  - OTP verifies successfully.
  - User redirected to `/dashboard`.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-AUTH-003: Invalid Identifier & Malformed Input
- **Priority**: `P2 - Medium`
- **Objective**: Verify front-end validation prevents sending OTP to invalid inputs.
- **Steps**:
  1. Go to `/login` Email tab. Enter `invalid-email-format` and click submit.
  2. Switch to Phone tab. Enter `12345` (less than 10 digits) and click submit.
  3. Switch to Email tab, leave input empty and click submit.
- **Expected Result**:
  - Form displays inline error: *"Please enter a valid email address"* or *"Please enter a valid phone number"*.
  - No network request is dispatched to OTP backend.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-AUTH-004: Incorrect or Expired OTP Entry
- **Priority**: `P1 - High`
- **Objective**: Verify proper error handling when wrong OTP is entered.
- **Steps**:
  1. Request an email or phone OTP.
  2. On the OTP entry step, enter `000000` (incorrect code).
  3. Click **"Verify & Sign In"**.
- **Expected Result**:
  - Screen displays error alert: *"Invalid verification code or code expired"*.
  - User remains on OTP step and can re-try.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-AUTH-005: Resend OTP Cooldown Timer (30s)
- **Priority**: `P2 - Medium`
- **Objective**: Prevent OTP rate-limiting abuse by enforcing cooldown countdown.
- **Steps**:
  1. Send an OTP request.
  2. Inspect the **"Resend Code"** link.
- **Expected Result**:
  - Resend button is disabled with a 30-second countdown (e.g., `Resend in 28s`).
  - Button becomes clickable again only after timer reaches 0s.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-AUTH-006: Non-Admin Account Access Rejection (RBAC)
- **Priority**: `P0 - Blocker`
- **Objective**: Prevent non-admin users (regular store customer or technician) from accessing admin console.
- **Preconditions**: Account exists but does NOT possess `SUPER_ADMIN` role or `INTERNAL` account membership.
- **Steps**:
  1. Attempt login with credentials of a customer/vendor account.
  2. Complete OTP verification.
- **Expected Result**:
  - User is immediately rejected with redirect to `/login?error=unauthorized`.
  - Red alert box displays: *"Access denied: This account is authenticated but does not possess SuperAdmin privileges in Kairos."*
  - Session is immediately purged.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-AUTH-007: Session Persistence & Logout Flow
- **Priority**: `P1 - High`
- **Objective**: Verify session persists on page refresh and terminates properly upon logout.
- **Steps**:
  1. Log in as SuperAdmin.
  2. Refresh the browser at `/dashboard`.
  3. Verify user remains logged in without re-authenticating.
  4. Click the user profile / logout button in sidebar/header.
- **Expected Result**:
  - After refresh, user stays logged in.
  - After clicking logout, session cookie is deleted and user is redirected to `/login`.
  - Direct URL access to `/dashboard` now redirects back to `/login`.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

## Module 2: Dashboard Overview & Fleet Telemetry

### TC-DASH-001: 4-Pillar KPI Metrics Calculation
- **Priority**: `P1 - High`
- **Objective**: Verify top metric cards reflect real database records.
- **Steps**:
  1. Log in to `/dashboard`.
  2. Check the 4 metric cards:
     - **Edge Devices**: Total count, Deployed count, Stock count.
     - **Camera Streams**: Total active RTSP streams across all customer stores.
     - **Security Events**: Events in last 24h, total historical events, alert status.
     - **Partner Vendors**: Total vendors, verified count, pending KYC count.
- **Expected Result**:
  - Numbers match backend database aggregates.
  - All numbers use clean monospace styling with uppercase labels.
  - No NaN or undefined values.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-DASH-002: Fleet Deployment Dial (SVG Donut Chart)
- **Priority**: `P2 - Medium`
- **Objective**: Verify visual fleet allocation chart accurately maps device states.
- **Steps**:
  1. On `/dashboard`, view the **Fleet Allocation** donut chart.
  2. Inspect the breakdown:
     - Assigned to Stores (`ASSIGNED` / `INSTALLED`).
     - Central Stockroom (`IN_STOCK`).
     - Partner Custody (`WITH_VENDOR`).
     - Maintenance (`MAINTENANCE`).
- **Expected Result**:
  - Segments render proportionally with smooth SVG curves.
  - Hovering/viewing items displays exact device count and percentage.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-DASH-003: Real-Time Live Security Events Feed
- **Priority**: `P1 - High`
- **Objective**: Verify live event cards render recent security telemetry with accurate badges.
- **Steps**:
  1. On `/dashboard`, check the **Live Camera Activity** feed.
  2. Verify:
     - Store name and camera channel number (e.g., `Store 101 · Channel 02`).
     - Threat level badge (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `NONE`).
     - Relative timestamp (e.g., `5m ago`, `2h ago`).
  3. Click any incident card in the feed.
- **Expected Result**:
  - Clicking incident navigates directly to `/dashboard/activity/[id]` for forensic review.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

## Module 3: Partner Vendors & KYC Compliance

### TC-VND-001: Vendor Directory & Status Filtering
- **Priority**: `P1 - High`
- **Objective**: Verify filtering vendors by compliance status.
- **Steps**:
  1. Navigate to `/dashboard/vendors`.
  2. Click tab **"All Vendors"**.
  3. Click tab **"Pending KYC"**.
  4. Click tab **"Verified"**.
  5. Click tab **"Rejected"**.
- **Expected Result**:
  - Each tab correctly filters the table rows.
  - Badge colours match status:
    - `VERIFIED`: Green badge ("Verified").
    - `PENDING`: Amber badge ("Pending KYC").
    - `REJECTED`: Red badge ("Rejected").
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-VND-002: Real-Time Vendor Search
- **Priority**: `P2 - Medium`
- **Objective**: Verify search filters vendors accurately.
- **Steps**:
  1. In `/dashboard/vendors`, enter a company name in the search bar.
  2. Search by vendor code (e.g., `VND-001`).
  3. Search by PAN number.
  4. Clear the search input using the `(X)` button.
- **Expected Result**:
  - Table updates instantly as user types.
  - Clearing search restores full list.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-VND-003: Vendor Quick-View Slide-Out Sheet
- **Priority**: `P1 - High`
- **Objective**: Verify vendor slide-out sheet presents all tax, contact, and device count details.
- **Steps**:
  1. Click on any vendor row in `/dashboard/vendors`.
  2. Slide-out drawer opens from the right.
  3. Inspect sections:
     - Header: Company name, vendor code, KYC badge.
     - Quick Stats: Stock on Shelf, Installed in Field, Managed Stores, Acquired Referrals.
     - Tax Info: PAN number, GSTIN number, registered address.
     - Primary Contact: Name, Email, Phone number.
     - Settlement Bank Account details (Bank name, Account number, IFSC).
- **Expected Result**:
  - All data displays cleanly without truncation or overflow.
  - Clicking backdrop or close button dismisses sheet.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-VND-004: Approve Vendor KYC Flow
- **Priority**: `P0 - Blocker`
- **Objective**: Verify an operator can approve a pending vendor's KYC compliance.
- **Preconditions**: Vendor in `PENDING` status.
- **Steps**:
  1. Go to `/dashboard/vendors` and open a vendor with `PENDING` status.
  2. In the slide-out sheet, locate the actions at the bottom.
  3. Click the green **"Approve KYC"** button.
  4. Confirmation modal appears asking: *"Approve KYB compliance and activate vendor status for [Vendor]?"*
  5. Click **"Approve KYC"** inside modal.
- **Expected Result**:
  - Toast notification confirms: *"Vendor KYC approved successfully"*.
  - Vendor badge updates to `VERIFIED`.
  - Vendor is now authorized to hold consignment box inventory.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-VND-005: Reject Vendor KYC Flow
- **Priority**: `P1 - High`
- **Objective**: Verify operator can reject a fraudulent or non-compliant vendor application.
- **Preconditions**: Vendor in `PENDING` status.
- **Steps**:
  1. Open a `PENDING` vendor sheet.
  2. Click the red **"Reject"** button.
  3. Confirmation modal appears warning of restriction.
  4. Confirm rejection.
- **Expected Result**:
  - Toast notification confirms: *"Vendor KYC rejected"*.
  - Vendor badge updates to `REJECTED`.
  - Vendor cannot hold stock or deploy stores.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-VND-006: Dedicated Vendor Full-Profile Page (`/dashboard/vendors/[id]`)
- **Priority**: `P2 - Medium`
- **Objective**: Verify dedicated full-page vendor profile and inventory breakdown.
- **Steps**:
  1. Click **"Open Dedicated Vendor Profile"** from the slide-out sheet.
  2. Browser navigates to `/dashboard/vendors/[id]`.
  3. Test tab switching:
     - **Overview**: Full tax, contact, and profile audit.
     - **Custody Stock**: Boxes currently in vendor warehouse shelf.
     - **Installed Devices**: Boxes deployed by this vendor in stores.
     - **Customers**: Stores managed/acquired by this vendor.
- **Expected Result**:
  - All tabs render their respective tables and counts accurately.
  - Back arrow navigates back to `/dashboard/vendors`.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

## Module 4: Hardware Fleet & Inventory Management

### TC-DEV-001: Fleet Table Display & Inventory Status Filtering
- **Priority**: `P1 - High`
- **Objective**: Verify filtering edge devices across their full operational lifecycle.
- **Steps**:
  1. Navigate to `/dashboard/devices`.
  2. Test tab filters:
     - **All**: Shows all devices.
     - **In Stock**: Central warehouse inventory (`IN_STOCK`).
     - **With Vendor**: Dispatched to partner consignment (`WITH_VENDOR`).
     - **Assigned / Installed**: Live in customer stores (`ASSIGNED` / `INSTALLED`).
     - **Maintenance**: Units undergoing repair (`MAINTENANCE`).
- **Expected Result**:
  - Table shows Device ID, Model, Inventory Status badge, Online status, Custodian/Location, Customer account, and MAC Address.
  - Tab filters correctly restrict list.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-DEV-002: Online vs Offline Heartbeat Pulse
- **Priority**: `P1 - High`
- **Objective**: Verify visual indicators for online IoT connectivity.
- **Steps**:
  1. In the devices table, check the **Online** column.
  2. For online units: Look for green pulsating dot and green text *"Online"*.
  3. For offline units: Look for grey dot and muted text *"Offline"*.
- **Expected Result**:
  - Clear visual distinction between live streaming edge boxes and disconnected boxes.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-DEV-003: As-You-Type Search Devices
- **Priority**: `P2 - Medium`
- **Objective**: Verify searching devices by ID, MAC address, or model code.
- **Steps**:
  1. In `/dashboard/devices`, enter device ID (e.g., `KBX-A1B2`).
  2. Enter MAC address (e.g., `00:1A:2B`).
  3. Enter model code (e.g., `KBX-PRO-8CH`).
- **Expected Result**:
  - Matching devices appear immediately without needing to press Enter.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-DEV-004: Device Lifecycle State Transitions
- **Priority**: `P1 - High`
- **Objective**: Verify each allowed state machine transition from the 3-dots action dropdown.
- **Steps**:
  1. **In Stock -> Maintenance**: Click 3-dots on an `IN_STOCK` device -> select **"Move to Maintenance"** -> enter reason -> confirm.
     - *Verify*: Status becomes `MAINTENANCE`.
  2. **Maintenance -> Return to Stock**: Click 3-dots on a `MAINTENANCE` device -> select **"Return to Stock (Ready)"** -> confirm.
     - *Verify*: Status returns to `IN_STOCK`.
  3. **Maintenance -> Decommission**: Click 3-dots on a `MAINTENANCE` device -> select **"Decommission Unit"** -> confirm.
     - *Verify*: Unit is permanently retired (`DECOMMISSIONED`).
  4. **Assigned -> Unassign**: Click 3-dots on an `ASSIGNED` device -> select **"Unassign Customer"** -> confirm.
     - *Verify*: Device is decoupled from customer and returned to stock/warehouse.
- **Expected Result**:
  - All status transitions succeed with toast feedback.
  - Table re-renders with updated badges.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-DEV-005: Delete Device Safeguard
- **Priority**: `P1 - High`
- **Objective**: Verify device deletion requires explicit confirmation modal.
- **Steps**:
  1. On any device row, click 3-dots menu -> select **"Delete Device"**.
  2. Modal opens warning of permanent record deletion.
  3. Click Cancel -> verify device is NOT deleted.
  4. Open modal again, click red **"Delete"** button.
- **Expected Result**:
  - Toast confirms device deletion.
  - Row removed from table.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

## Module 5: Factory Device Registration & Edge Provisioning

### TC-FAC-001: Web Form Factory Registration — Happy Path
- **Priority**: `P0 - Blocker`
- **Objective**: Register a freshly manufactured edge box into cloud inventory.
- **Steps**:
  1. Navigate to `/dashboard/devices`.
  2. Click **"Factory Register"** button at top right.
  3. Modal opens on **"Web Form"** tab.
  4. Fill in:
     - **Device ID**: `KBX-TEST-001`
     - **Hardware Model**: Select from dropdown (e.g., `KBX-STD-4CH`).
     - **Ethernet MAC**: `AA:BB:CC:DD:EE:01`
     - **SoC Serial**: `SOC-1234567890`
     - **Device Secret**: Use auto-generated `sec_...` key.
  5. Click **"Register into Cloud"**.
- **Expected Result**:
  - Success screen displayed with green checkmark.
  - Modal shows generated `/etc/kairos/device.env` configuration snippet.
  - New device appears in table under `IN_STOCK`.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-FAC-002: EdgeBox Terminal Script Command Mode
- **Priority**: `P1 - High`
- **Objective**: Generate and copy direct curl registration script for field technician terminal.
- **Steps**:
  1. Open **"Factory Register"** modal.
  2. Switch to **"EdgeBox Terminal Script"** tab.
  3. Review the bash command generated with automatic MAC/SoC detection.
  4. Click **"Copy Command"** button.
- **Expected Result**:
  - Toast confirms: *"Copied to clipboard"*.
  - Copied text contains valid bash snippet:
    ```bash
    ETH_MAC=$(cat /sys/class/net/eth0/address 2>/dev/null ...)
    curl -s -X POST ".../devices/factory-register" ...
    ```
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-FAC-003: Edge Case — Duplicate Device ID or MAC Address
- **Priority**: `P1 - High`
- **Objective**: Verify system blocks registration of duplicate serial/MAC numbers.
- **Steps**:
  1. Open Factory Register modal.
  2. Enter an already-existing Device ID and MAC address.
  3. Submit the form.
- **Expected Result**:
  - Form displays clear red error: *"Device ID or MAC address already registered in database"*.
  - Modal remains open so user can correct the input.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-FAC-004: Validation — Missing Fields & Invalid MAC Format
- **Priority**: `P2 - Medium`
- **Objective**: Verify front-end validation on required registration fields.
- **Steps**:
  1. Leave Device ID empty and click submit.
  2. Enter invalid MAC (e.g., `not-a-mac`).
- **Expected Result**:
  - Form blocks submission with inline validation errors.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

## Module 6: Hardware Logistics & Consignment Dispatch

> ⚠️ **CRITICAL COMPLIANCE RULES**:
> 1. Hardware can ONLY be dispatched to **VERIFIED** partner vendors.
> 2. Vendors with **PENDING** or **REJECTED** KYC must NEVER be allowed to receive stock.
> 3. Only devices with status `IN_STOCK` or `RETURNED` can be dispatched.

---

### TC-DISP-001 [CRITICAL]: Attempting to Dispatch to Vendor with INCOMPLETE / PENDING KYC
- **Priority**: `P0 - Blocker`
- **Objective**: Verify security guard prevents dispatching hardware to vendors who have NOT completed KYC.
- **Preconditions**: Vendor `Vendor Pending Ltd` has KYC status `PENDING`.
- **Steps**:
  1. Navigate to `/dashboard/devices`.
  2. Locate an `IN_STOCK` device.
  3. Click 3-dots menu -> select **"Send to Vendor"**.
  4. The **"Dispatch Stock to Vendor"** modal opens.
  5. Click the **"Select Vendor Partner"** searchable dropdown.
  6. Type the name or code of the `PENDING` vendor (e.g., `Vendor Pending Ltd`).
- **Expected Result**:
  - **Negative Outcome Verified**: The unverified vendor does **NOT** appear in the search results list.
  - The drop-down only returns vendors with verified KYC status (`VERIFIED`).
  - Tester CANNOT select or submit devices to the unverified vendor.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-DISP-002 [CRITICAL]: Attempting to Dispatch to REJECTED Vendor
- **Priority**: `P0 - Blocker`
- **Objective**: Verify rejected vendors are strictly excluded from hardware dispatch.
- **Preconditions**: Vendor `Vendor Rejected Corp` has KYC status `REJECTED`.
- **Steps**:
  1. In the **"Dispatch Stock to Vendor"** modal, search for the `REJECTED` vendor name.
- **Expected Result**:
  - The rejected vendor does **NOT** appear in the dropdown.
  - No devices can be dispatched to this entity.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-DISP-003 [CRITICAL]: Dispatch Devices to VERIFIED Vendor — Happy Path
- **Priority**: `P0 - Blocker`
- **Objective**: Successfully transfer central warehouse stock to an authorized verified partner.
- **Preconditions**:
  - Vendor `Alpha Security Solutions` is `VERIFIED`.
  - At least 1 unit in `IN_STOCK` status.
- **Steps**:
  1. In `/dashboard/devices`, click 3-dots on an `IN_STOCK` unit -> **"Send to Vendor"**.
  2. In the modal:
     - Search and select `Alpha Security Solutions` (displays badge *"Verified"*).
     - Enter optional Courier / Tracking Number: `BLUEDART-98765432`.
     - Enter Transfer Reason: `Initial store consignment allocation`.
  3. Verify the selected device tag is listed under "Selected Devices to Dispatch".
  4. Click **"Dispatch X Device(s)"**.
- **Expected Result**:
  - Success toast confirms: *"Devices dispatched to vendor successfully"*.
  - Modal closes.
  - In devices table, the device inventory status changes from `IN_STOCK` to `WITH_VENDOR`.
  - Custodian column updates from *"Central Warehouse"* to `Alpha Security Solutions`.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-DISP-004: Multi-Device Batch Dispatch
- **Priority**: `P1 - High`
- **Objective**: Verify dispatching multiple edge boxes in a single consignment shipment.
- **Steps**:
  1. Open **"Dispatch Stock to Vendor"** modal without pre-selecting a row (or from quick actions).
  2. Select verified vendor.
  3. In **"Add More Devices"** search box, type device IDs or MACs.
  4. Click **(+)** to add 3 different in-stock devices.
  5. Click **(X)** on one device tag to verify removal works.
  6. Submit dispatch with the remaining 2 devices.
- **Expected Result**:
  - Both devices are transferred together.
  - Both devices update to `WITH_VENDOR`.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-DISP-005: Preventing Dispatch of Non-Stock Devices
- **Priority**: `P1 - High`
- **Objective**: Ensure devices already in field, under maintenance, or decommissioned cannot be selected for vendor consignment.
- **Steps**:
  1. Open Dispatch modal.
  2. Search for a device currently in `ASSIGNED` or `MAINTENANCE` status.
- **Expected Result**:
  - Non-stock devices do NOT appear in the eligible search list.
  - Only `IN_STOCK` or `RETURNED` hardware is selectable.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-DISP-006: Direct Shipment to Customer Site (`ShipCustomerModal`)
- **Priority**: `P0 - Blocker`
- **Objective**: Ship edge hardware directly to an end-user customer store and generate claim code.
- **Preconditions**: Device in `IN_STOCK` status; customer account exists.
- **Steps**:
  1. In `/dashboard/devices`, click 3-dots on an `IN_STOCK` device -> select **"Send to Customer"**.
  2. Modal opens: **"Send to Customer"**.
  3. Search and select customer store (e.g., `SuperMart Store #12`).
  4. Enter Courier Name: `DHL Express`.
  5. Enter Tracking Number: `DHL-11223344`.
  6. Click **"Generate Claim & Ship"**.
- **Expected Result**:
  - Modal switches to success state: *"Device Sent! Customer Claim Code Created"*.
  - Displays customer claim code (e.g., `CLM-7X9P2`) and expiration timestamp.
  - Tester can click **"Copy Code"** to copy to clipboard.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-DISP-007: Shipping Form Validation (No Customer Selected)
- **Priority**: `P2 - Medium`
- **Objective**: Prevent submission without picking a target customer.
- **Steps**:
  1. Open **"Send to Customer"** modal.
  2. Leave customer input empty.
  3. Click **"Generate Claim & Ship"**.
- **Expected Result**:
  - Red error message appears: *"Please search and select a customer"*.
  - Form is not submitted.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

## Module 7: Hardware RMA & Defective Unit Swapping

### TC-RMA-001: Create Support & Defective Hardware Ticket
- **Priority**: `P1 - High`
- **Objective**: Create a hardware defect or technician service ticket.
- **Steps**:
  1. Navigate to `/dashboard/tickets`.
  2. Click **"New Ticket"** button.
  3. Fill in:
     - Customer Store Account: Select customer.
     - Title: `Camera Channel 3 Video Loss / Power Surge Defect`.
     - Description: `Device KBX-01 rebooted repeatedly after power surge.`
     - Priority: Select `URGENT` or `HIGH`.
  4. Click **"Create Ticket"**.
- **Expected Result**:
  - Toast confirms ticket creation.
  - Ticket appears in `/dashboard/tickets` table with `OPEN` status badge.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-RMA-002: Ticket Priority & Status Filtering
- **Priority**: `P2 - Medium`
- **Objective**: Verify filtering tickets by status and priority.
- **Steps**:
  1. Filter by Status: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`.
  2. Filter by Priority: `URGENT`, `HIGH`, `MEDIUM`, `LOW`.
  3. Search tickets by title or ticket ID.
- **Expected Result**:
  - Table updates instantly with corresponding matching items.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-RMA-003: Zero-Downtime RMA Hardware Swap Modal
- **Priority**: `P0 - Blocker`
- **Objective**: Replace a defective store edge box with a fresh in-stock unit while preserving RTSP camera mappings.
- **Preconditions**:
  - Customer site has defective unit `KBX-DEFECTIVE-01` (`ASSIGNED`).
  - Central inventory has fresh unit `KBX-FRESH-02` (`IN_STOCK`).
- **Steps**:
  1. Go to `/dashboard/tickets` and click **"Hardware RMA Swap"** button.
  2. In the modal:
     - Select target Customer Account.
     - Defective Device: Select `KBX-DEFECTIVE-01`.
     - Fresh Replacement: Select `KBX-FRESH-02` (pulled from `IN_STOCK`).
     - Reason: `HDMI & Ethernet port failure; field RMA swap`.
  3. Click **"Execute Hardware Swap"**.
- **Expected Result**:
  - Toast confirms: *"Device swapped successfully! Inventory & customer site updated."*
  - `KBX-DEFECTIVE-01` status updates to `MAINTENANCE` (or `RETURNED`).
  - `KBX-FRESH-02` status updates to `ASSIGNED` at the customer store.
  - Customer camera RTSP channel configurations automatically map to the new unit.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-RMA-004: Validation — Swapping with Non-Stock Hardware
- **Priority**: `P1 - High`
- **Objective**: Ensure replacement dropdown only allows verified in-stock devices.
- **Steps**:
  1. Open RMA Swap Modal.
  2. Inspect the **"Fresh Replacement Device"** dropdown.
- **Expected Result**:
  - Only units with inventory status `IN_STOCK` appear in the replacement dropdown.
  - Already deployed units cannot be selected.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

## Module 8: Customer Store Management & Store Onboarding

### TC-CUST-001: Customer Accounts Directory & Status Filter
- **Priority**: `P1 - High`
- **Objective**: View and filter onboarded retail customer accounts.
- **Steps**:
  1. Navigate to `/dashboard/customers`.
  2. Filter by status: `ALL`, `ACTIVE`, `SUSPENDED`, `PENDING_VERIFICATION`.
  3. Search by store name, contact email, or phone.
- **Expected Result**:
  - Table lists Store Name, Account Status, Managing Vendor, Installed Boxes, and Live Cameras.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-CUST-002: Customer Detail Page Audit (`/dashboard/customers/[id]`)
- **Priority**: `P1 - High`
- **Objective**: Verify detailed audit view of store devices, camera streams, and tickets.
- **Steps**:
  1. Click on a customer row in `/dashboard/customers`.
  2. Navigate to `/dashboard/customers/[id]`.
  3. Audit tabs:
     - **Devices**: Lists all edge boxes installed at this store.
     - **Cameras**: Shows camera channel numbers, IP addresses, RTSP status.
     - **Tickets**: Historical and open support tickets for this site.
- **Expected Result**:
  - All hardware and camera streams associated with this store render correctly.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-CUST-003: Account Suspension & Reactivation Toggle
- **Priority**: `P1 - High`
- **Objective**: Temporarily suspend customer access due to billing/security, then reactivate.
- **Steps**:
  1. On customer details page, click **"Suspend Account"** button.
  2. Modal opens requesting confirmation.
  3. Click confirm.
     - *Verify*: Status updates to `SUSPENDED` with amber/rose badge.
  4. Click **"Reactivate Account"** button and confirm.
     - *Verify*: Status updates back to `ACTIVE` with green badge.
- **Expected Result**:
  - Both actions display confirmation toasts and immediately update badges.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-CUST-004: Reassign Managing Vendor Partner
- **Priority**: `P1 - High`
- **Objective**: Transfer customer store maintenance to a new authorized vendor.
- **Steps**:
  1. On customer details page, locate the **"Managing Vendor"** card.
  2. Click **"Change Partner"** / **"Reassign"**.
  3. Select a new verified vendor from the dropdown.
  4. Click **"Save Reassignment"**.
- **Expected Result**:
  - Toast confirms: *"Managing vendor successfully reassigned"*.
  - Customer profile reflects new vendor attribution.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

## Module 9: Security Event Triage & AI Telemetry Forensics

### TC-EVT-001: Security Incident Filtering by Threat Level
- **Priority**: `P1 - High`
- **Objective**: Filter security incidents by edge AI threat classification.
- **Steps**:
  1. Navigate to `/dashboard/activity`.
  2. Test threat severity filters:
     - `CRITICAL`: Red badge (Intrusions, weapons, forced entry).
     - `HIGH`: Rose badge (After-hours motion, perimeter breach).
     - `MEDIUM`: Amber badge (Loitering, crowd formation).
     - `LOW`: Blue badge (Minor telemetry trigger).
     - `NONE`: Routine checks.
- **Expected Result**:
  - Incidents correctly filtered by classification level.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-EVT-002: Filter Incidents by Status & Date Range
- **Priority**: `P2 - Medium`
- **Objective**: Filter incidents by operator review state and date range.
- **Steps**:
  1. Filter by Status: `CONFIRMED_ALERT`, `RECORDED`, `PROCESSING_AI`, `DISCARDED_FALSE_ALARM`, `DISMISSED_BY_USER`.
  2. Enter Start Date and End Date.
- **Expected Result**:
  - Only incidents matching both status and time window are shown.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-EVT-003: Video Playback & Forensic Inspection (`/dashboard/activity/[id]`)
- **Priority**: `P0 - Blocker`
- **Objective**: Inspect recorded 10-second alert clip, AI confidence score, and forensic report.
- **Steps**:
  1. Click on an incident row in `/dashboard/activity`.
  2. Browser opens `/dashboard/activity/[id]`.
  3. Verify:
     - Video player loads signed presigned URL from S3/R2 storage.
     - Video plays smoothly with controls (play, pause, scrub, fullscreen).
     - AI Telemetry panel shows edge confidence score (e.g., `94.8%`).
     - Detected objects tags are displayed (e.g., `person`, `crowbar`, `backpack`).
     - Edge model label and timestamp are displayed.
- **Expected Result**:
  - Video plays without CORS or 403 authorization errors.
  - Page loads at top of screen without jumping or layout shift.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-EVT-004: Operator Action — Confirm Active Threat Flow
- **Priority**: `P0 - Blocker`
- **Objective**: Confirm a verified intrusion event.
- **Steps**:
  1. On event detail page, click the green **"Confirm Threat"** button.
- **Expected Result**:
  - Toast notification: *"Event confirmed as active security threat"*.
  - Event incident status badge changes to `CONFIRMED_ALERT`.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-EVT-005: Operator Action — Dismiss False Alarm Flow
- **Priority**: `P1 - High`
- **Objective**: Dismiss a false alert (e.g., shadows, insects, store employee) with reason.
- **Steps**:
  1. Click **"Dismiss False Alarm"** button.
  2. Input appears prompting for reason.
  3. Enter: `Store staff closing up after hours; verified over intercom.`
  4. Submit dismissal.
- **Expected Result**:
  - Toast notification: *"Event dismissed as false alarm"*.
  - Event status updates to `DISMISSED_BY_USER`.
  - Reason is saved in forensic audit record.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-EVT-006: Clipboard Copy Event ID
- **Priority**: `P3 - Low`
- **Objective**: Verify quick copying of unique event ID for technical triage.
- **Steps**:
  1. On event details header, click the copy icon next to Event ID.
- **Expected Result**:
  - Toast confirms: *"Event ID copied to clipboard"*.
  - Icon briefly toggles to a green checkmark.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

## Module 10: Hardware Models Catalog

### TC-MOD-001: Hardware Catalog View & Channel Capacity
- **Priority**: `P2 - Medium`
- **Objective**: View hardware profile models and camera capacity.
- **Steps**:
  1. Navigate to `/dashboard/device-models`.
  2. Verify list displays:
     - Model Name and Code (e.g., `KBX-8CH-PRO`).
     - Max RTSP camera channels supported.
     - Processor / SoC specifications.
     - Number of active deployed devices using this model.
- **Expected Result**:
  - Total models and deployed box counts render correctly in KPI cards.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-MOD-002: Create New Hardware Model
- **Priority**: `P2 - Medium`
- **Objective**: Add a new edge hardware profile to the catalog.
- **Steps**:
  1. Click **"Add Model"** button.
  2. Fill in:
     - Model Code: `KBX-16CH-ULTRA`
     - Model Name: `Kavach EdgeBox Ultra 16-Channel`
     - Description: `High-throughput edge AI box for large supermarkets.`
     - Max Channels: `16`
  3. Click **"Save Model"**.
- **Expected Result**:
  - Toast confirms model creation.
  - New model appears in catalog and is selectable in Factory Register modal.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-MOD-003: Duplicate Model Code Validation
- **Priority**: `P2 - Medium`
- **Objective**: Prevent duplicate model codes in catalog.
- **Steps**:
  1. Try to create a model with an existing code (e.g., `KBX-8CH-PRO`).
- **Expected Result**:
  - System rejects with: *"Model code already exists"*.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

## Module 11: Settlement Bank Accounts & Payout Approvals

### TC-BNK-001: Bank Account Directory & KPI Counter Check
- **Priority**: `P2 - Medium`
- **Objective**: Audit partner vendor bank accounts for payout approval.
- **Steps**:
  1. Navigate to `/dashboard/bank-details`.
  2. Review top KPI cards:
     - Total Registered Accounts.
     - Approved & Active Accounts.
     - Pending Verification Accounts.
- **Expected Result**:
  - KPI counts tally with database accounts.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-BNK-002: Approve & Activate Bank Account for Payouts
- **Priority**: `P1 - High`
- **Objective**: Activate a verified vendor bank account.
- **Steps**:
  1. Locate a bank account marked `Inactive` or `Pending`.
  2. Click **"Activate"** / toggle switch.
- **Expected Result**:
  - Toast confirms: *"Bank account approved & activated for payouts"*.
  - Account status badge turns green ("Active").
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-BNK-003: Deactivate Bank Account
- **Priority**: `P2 - Medium`
- **Objective**: Deactivate an account to hold payouts.
- **Steps**:
  1. On an active bank account, click **"Deactivate"**.
- **Expected Result**:
  - Toast confirms: *"Bank account deactivated"*.
  - Status updates to Inactive.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

## Module 12: Internal Team & User Access Control

### TC-USR-001: Team Members Directory & Role Badging
- **Priority**: `P1 - High`
- **Objective**: Audit internal platform administrators.
- **Steps**:
  1. Navigate to `/dashboard/users` (or `/dashboard/team`).
  2. Verify team members list shows:
     - Name, email, phone number.
     - Role badge (`SuperAdmin`, `Admin`, `Member`).
     - Avatar initials.
- **Expected Result**:
  - Shows only internal console users, excluding external store customers.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-USR-002: Add New Administrator Account
- **Priority**: `P1 - High`
- **Objective**: Create new admin user with credentials.
- **Steps**:
  1. Click **"Add Member"** button.
  2. Fill in:
     - Name: `Jane Doe`
     - Email: `jane@kairos.video`
     - Phone: `9876500000`
     - Temporary Password.
  3. Click **"Create Admin User"**.
- **Expected Result**:
  - Toast confirms user creation.
  - New user appears in table.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-USR-003: Remove Team Member with Confirmation
- **Priority**: `P2 - Medium`
- **Objective**: Safely remove console access for an administrator.
- **Steps**:
  1. Click trash icon on a team member row.
  2. Confirmation modal asks: *"Are you sure you want to remove [Name]?"*
  3. Confirm deletion.
- **Expected Result**:
  - User is deleted and row removed from table.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-USR-004: Self-Deletion Safeguard
- **Priority**: `P1 - High`
- **Objective**: Prevent administrator from accidentally deleting their own currently logged-in account.
- **Steps**:
  1. Locate currently logged-in user in `/dashboard/users`.
  2. Look for trash icon.
- **Expected Result**:
  - Trash icon is disabled or hidden for own account, or backend returns: *"Cannot delete active user account"*.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

## Module 13: System Resilience, Network & Edge Cases

### TC-SYS-001: Backend Disconnection / API Outage Error Handling
- **Priority**: `P1 - High`
- **Objective**: Verify graceful failure message when backend is unreachable.
- **Steps**:
  1. Disconnect internet connection or block backend URL.
  2. Refresh `/dashboard`.
- **Expected Result**:
  - Page renders clean error card: *"Network error" / "Failed to connect to Kairos platform"*.
  - UI provides a **"Retry"** button without crashing the entire Next.js runtime.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-SYS-002: High-Latency Skeleton States (Zero Layout Shift)
- **Priority**: `P2 - Medium`
- **Objective**: Verify smooth loading skeletons across all pages during slow 3G network conditions.
- **Steps**:
  1. In Chrome DevTools, set Network throttling to **"Slow 3G"**.
  2. Navigate between `/dashboard`, `/dashboard/devices`, `/dashboard/vendors`, and `/dashboard/activity`.
- **Expected Result**:
  - Smooth pulsating skeleton cards render with identical dimensions to final cards.
  - No jarring page jumps or layout shift when data arrives.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

### TC-SYS-003: Empty States (Zero Data Found)
- **Priority**: `P2 - Medium`
- **Objective**: Verify clean empty states when filters or searches return zero records.
- **Steps**:
  1. In Devices search, enter random gibberish `XYZ999999`.
  2. In Vendors search, enter `NONEXISTENT_VENDOR`.
- **Expected Result**:
  - Friendly empty state appears: *"No matching devices found"*, with clear call-to-action or reset filter button.
- **Status**: `[ ] PASS` / `[ ] FAIL`

---

## 14. QA Sign-Off Checklist & Execution Tracker

| Suite # | Module Name | Total Cases | Passed | Failed | Blocked | Sign-Off Date | Tester Initials |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **01** | Authentication & RBAC Access | 7 | | | | | |
| **02** | Dashboard Overview & Fleet Dial | 3 | | | | | |
| **03** | Partner Vendors & KYC Workflow | 7 | | | | | |
| **04** | Hardware Fleet & Inventory | 5 | | | | | |
| **05** | Factory Device Registration | 4 | | | | | |
| **06** | Hardware Logistics & Consignment | 8 | | | | | |
| **07** | Hardware RMA & Defect Swapping | 4 | | | | | |
| **08** | Customer Store Management | 4 | | | | | |
| **09** | Security Event Triage & AI Telemetry | 6 | | | | | |
| **10** | Hardware Models Catalog | 3 | | | | | |
| **11** | Settlement Bank Accounts | 3 | | | | | |
| **12** | Internal Team & Access Control | 4 | | | | | |
| **13** | System Resilience & Edge Cases | 3 | | | | | |
| **TOTAL** | **Entire Kairos Admin Platform** | **61** | | | | | |
