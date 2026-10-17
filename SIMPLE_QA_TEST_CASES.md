# Simple QA Test Cases — Plain Language, No Tech Knowledge Needed

> **How to use this manual:**
> Go through each row as an action a real person would take in the app or admin panel.
> Tick **[x]** in the **Pass / Fail** column if the feature behaves as described.
> If it fails or acts strangely, tick **Fail** and describe what actually happened in the **Notes** column.

---

## 📋 What Test Accounts & IDs You Need Before You Start

Before testing, make sure you have the following test accounts and hardware IDs ready. You do **not** need dozens of accounts — just these **7 core items**:

| # | Item Needed | How Many | What It Is For | Example / Suggested Value |
|---|---|:---:|---|---|
| **1** | **Super Admin Account** | **1** | Full access to the Admin Panel. Used to approve vendors, dispatch hardware, manage team, and triage alerts. | Email: `admin@kairos.video`<br>Phone: `9876543210` |
| **2** | **Non-Admin Test Account** | **1** | Regular user/technician account **without** SuperAdmin rights. Used to confirm unauthorized users are blocked. | Email: `user@example.com` |
| **3** | **Vendor Accounts** | **3** | Need 3 vendors in different states to test approval and dispatch security:<br>• **Vendor A (Verified)** — already approved by admin.<br>• **Vendor B (Pending KYC)** — newly signed up, waiting for approval.<br>• **Vendor C (Rejected)** — application denied. | • `Vendor A`: Alpha Security (Verified)<br>• `Vendor B`: Beta Systems (Pending)<br>• `Vendor C`: Gamma CCTV (Rejected) |
| **4** | **Customer Store Accounts** | **2** | • **Customer A** — primary store with an active device and cameras.<br>• **Customer B** — secondary store used to test claiming, device protection, and account transfers. | • `Customer A`: SuperMart Store #1<br>• `Customer B`: QuickBite Cafe #2 |
| **5** | **Edge Box Devices (Hardware IDs / MACs)** | **3** | You need 3 device serial numbers / MAC addresses:<br>• **Device 1 (In Stock)** — fresh warehouse unit ready to dispatch.<br>• **Device 2 (Installed)** — live in store (Customer A) with cameras.<br>• **Device 3 (Defective)** — unit marked for repair to test RMA swap. | • `Device 1`: `KBX-TEST-001` (`AA:BB:CC:DD:EE:01`)<br>• `Device 2`: `KBX-LIVE-002` (`AA:BB:CC:DD:EE:02`)<br>• `Device 3`: `KBX-FAULT-003` (`AA:BB:CC:DD:EE:03`) |
| **6** | **Camera Streams** | **1 – 2** | Real RTSP camera streams or test video loops connected to Customer A's device to test live viewing and AI alert triggers. | Channel 1: Front Entrance<br>Channel 2: Cash Counter |
| **7** | **Platform URLs** | **2** | Working web links to the panel and the backend. | Admin Panel: `http://localhost:3000`<br>Backend: Cloud Run Staging URL |

---

## Module 1: Admin Login & Account Security

| Test ID | What you do | What should happen | Pass / Fail | Notes |
|---|---|---|---|---|
| **TC-AUTH-01** | Open `/login`, enter valid admin email, request OTP, enter 6-digit code, and click "Verify & Sign In" | Login succeeds; you are redirected to `/dashboard` immediately | ☐ Pass<br>☐ Fail | |
| **TC-AUTH-02** | Select the "Phone" tab, enter 10-digit mobile number (e.g. `9876543210`) without country code, enter OTP, and sign in | System automatically prefixes `+91`, verifies OTP, and opens `/dashboard` | ☐ Pass<br>☐ Fail | |
| **TC-AUTH-03** | Enter a malformed email (e.g. `notanemail`) or a 4-digit phone number | Screen shows an inline red error ("Please enter a valid email/phone"); no code is sent | ☐ Pass<br>☐ Fail | |
| **TC-AUTH-04** | Request an OTP, but type the wrong code (e.g. `000000`) | Clear error message shows: "Invalid verification code or code expired"; you stay on the OTP screen to retry | ☐ Pass<br>☐ Fail | |
| **TC-AUTH-05** | Request an OTP and look at the "Resend Code" button | Button is disabled with a 30-second countdown timer (e.g. "Resend in 28s"); only becomes clickable after 0s | ☐ Pass<br>☐ Fail | |
| **TC-AUTH-06** | Try logging into the Admin Panel with a regular customer or non-admin account | Login is refused with clear red alert: "Access denied: Account does not possess SuperAdmin privileges" | ☐ Pass<br>☐ Fail | |
| **TC-AUTH-07** | Refresh `/dashboard`, verify you stay logged in, then click the Logout button | After refresh you remain logged in; after clicking Logout you are sent to `/login`, and pressing the browser Back button cannot open the dashboard | ☐ Pass<br>☐ Fail | |

---

## Module 2: Dashboard Overview & System Health

| Test ID | What you do | What should happen | Pass / Fail | Notes |
|---|---|---|---|---|
| **TC-DASH-01** | Open `/dashboard` and check the top 4 metric cards (Edge Devices, Camera Streams, Security Events, Partner Vendors) | All 4 cards show real numbers matching database counts; no blanks, errors, or "NaN" | ☐ Pass<br>☐ Fail | |
| **TC-DASH-02** | Inspect the "Fleet Allocation" circle / donut chart on the dashboard | Chart smoothly displays proportional slices for Central Stock, With Vendor, Installed in Stores, and Maintenance | ☐ Pass<br>☐ Fail | |
| **TC-DASH-03** | Click any security incident inside the "Live Camera Activity" feed | App opens that exact event's forensic detail page (`/dashboard/activity/[id]`) directly | ☐ Pass<br>☐ Fail | |

---

## Module 3: Vendor Sign-Up, KYC Approval & Management

| Test ID | What you do | What should happen | Pass / Fail | Notes |
|---|---|---|---|---|
| **TC-VND-01** | A new company signs up as a vendor partner | They see an "Application Submitted / Pending Approval" screen, not the full vendor portal | ☐ Pass<br>☐ Fail | |
| **TC-VND-02** | That pending vendor tries navigating directly to the main vendor dashboard before being approved | Access is blocked; they are redirected back to the pending-approval status screen | ☐ Pass<br>☐ Fail | |
| **TC-VND-03** | In Admin Panel `/dashboard/vendors`, find a **Pending** vendor and click "Approve KYC" | Status instantly changes to "Verified" (green badge), and a unique referral code is generated for them | ☐ Pass<br>☐ Fail | |
| **TC-VND-04** | In `/dashboard/vendors`, open a **Pending** vendor and click "Reject" | Status changes to "Rejected" (red badge); vendor is blocked from holding stock or taking customers | ☐ Pass<br>☐ Fail | |
| **TC-VND-05** | Admin accidentally clicks approve on an already-approved vendor | Nothing breaks or crashes; vendor's referral code and status remain unchanged | ☐ Pass<br>☐ Fail | |
| **TC-VND-06** | In `/dashboard/vendors`, use the search bar (type company name, PAN, or vendor code) and test the status tabs (All, Pending KYC, Verified, Rejected) | Table filters instantly as you type and correctly filters by tab; clearing search restores the full list | ☐ Pass<br>☐ Fail | |
| **TC-VND-07** | Click on any vendor row to open the slide-out sheet on the right | Drawer displays company name, KYC status, PAN/GST numbers, phone, email, and bank details cleanly | ☐ Pass<br>☐ Fail | |
| **TC-VND-08** | In the vendor sheet, click "Open Dedicated Vendor Profile" to go to `/dashboard/vendors/[id]` | Full profile opens with tabs for Overview, Custody Stock (warehouse shelf), Installed Devices, and Customers | ☐ Pass<br>☐ Fail | |

---

## Module 4: Customer Sign-Up & Store Management

| Test ID | What you do | What should happen | Pass / Fail | Notes |
|---|---|---|---|---|
| **TC-CUST-01** | A new customer signs up and enters an approved vendor's referral code | Customer account is created and automatically linked to that vendor partner | ☐ Pass<br>☐ Fail | |
| **TC-CUST-02** | A new customer signs up and enters a made-up or invalid referral code | Form shows a clear error ("Invalid referral code"); does not silently create a broken account | ☐ Pass<br>☐ Fail | |
| **TC-CUST-03** | A new customer signs up leaving the referral code blank | Account is created successfully with no vendor attached | ☐ Pass<br>☐ Fail | |
| **TC-CUST-04** | In `/dashboard/customers`, search for a store by name, email, or phone, and filter by Active/Suspended | Matching customer accounts appear instantly in the table with store name, managing vendor, and installed box count | ☐ Pass<br>☐ Fail | |
| **TC-CUST-05** | Click a customer row to open `/dashboard/customers/[id]` and check the Devices, Cameras, and Tickets tabs | All tabs load correctly showing the hardware installed at that store and active camera streams | ☐ Pass<br>☐ Fail | |
| **TC-CUST-06** | On a customer's profile, click "Suspend Account" (e.g. for billing issue) and confirm; then click "Reactivate" | Status changes to "Suspended" (amber badge) and their devices stop connecting; clicking Reactivate restores status to "Active" | ☐ Pass<br>☐ Fail | |
| **TC-CUST-07** | On a customer's profile, click "Change Partner / Reassign" and select a new approved vendor | Customer is transferred to the new vendor; new vendor can now manage them, old vendor loses access | ☐ Pass<br>☐ Fail | |

---

## Module 5: Edge Hardware Factory Registration

| Test ID | What you do | What should happen | Pass / Fail | Notes |
|---|---|---|---|---|
| **TC-FAC-01** | Go to `/dashboard/devices`, click "Factory Register", fill in Device ID, Model, Ethernet MAC, and click "Register into Cloud" | Success screen shows green checkmark with configuration snippet; device appears in table as "In Stock" | ☐ Pass<br>☐ Fail | |
| **TC-FAC-02** | In the Factory Register modal, switch to the "EdgeBox Terminal Script" tab and click "Copy Command" | Bash command with auto-detect MAC is copied to clipboard; toast confirms "Copied to clipboard" | ☐ Pass<br>☐ Fail | |
| **TC-FAC-03** | Try registering a device using a Device ID or MAC address that already exists in the system | Form blocks submission with clear red error: "Device ID or MAC address already registered" | ☐ Pass<br>☐ Fail | |
| **TC-FAC-04** | Try submitting the registration form with missing required fields or a gibberish MAC address | Submission is blocked with inline error messages showing what needs to be fixed | ☐ Pass<br>☐ Fail | |

---

## Module 6: Hardware Logistics & Consignment Dispatch

> ⚠️ **CRITICAL SECURITY RULE:** Hardware must NEVER be dispatched to unverified or rejected vendors. Only "In Stock" devices can be sent.

| Test ID | What you do | What should happen | Pass / Fail | Notes |
|---|---|---|---|---|
| **TC-DISP-01** | On an "In Stock" device, click 3-dots -> "Send to Vendor", and search for a **Pending KYC** vendor | **BLOCKED:** The pending vendor does **not** appear in the selection list; you cannot send hardware to unverified vendors | ☐ Pass<br>☐ Fail | |
| **TC-DISP-02** | In the "Send to Vendor" modal, search for a **Rejected** vendor | **BLOCKED:** The rejected vendor does **not** appear in the list; cannot dispatch hardware to them | ☐ Pass<br>☐ Fail | |
| **TC-DISP-03** | In "Send to Vendor", select a **Verified** vendor, enter courier tracking number, and click Dispatch | Device status changes from "In Stock" to "With Vendor"; Custodian updates to that vendor's name | ☐ Pass<br>☐ Fail | |
| **TC-DISP-04** | In the dispatch modal, add 2 or 3 in-stock devices to the shipment, remove one using (X), and dispatch the rest | Batch dispatch succeeds; all selected devices update to "With Vendor" together under one consignment | ☐ Pass<br>☐ Fail | |
| **TC-DISP-05** | Try to dispatch a device that is already "Installed in Store" or "Under Maintenance" | System does not allow selecting it; only units with status "In Stock" can be chosen | ☐ Pass<br>☐ Fail | |
| **TC-DISP-06** | On an "In Stock" device, click 3-dots -> "Send to Customer", pick a customer, enter courier info, and click "Generate Claim & Ship" | Success screen displays a **Customer Claim Code** (e.g. `CLM-7X9P2`) and expiration time with a working "Copy Code" button | ☐ Pass<br>☐ Fail | |
| **TC-DISP-07** | Open "Send to Customer" modal, leave customer field blank, and click submit | Submission is blocked with red alert: "Please search and select a customer" | ☐ Pass<br>☐ Fail | |

---

## Module 7: Device Claiming, Activation & Store Setup

| Test ID | What you do | What should happen | Pass / Fail | Notes |
|---|---|---|---|---|
| **TC-CLM-01** | An edge device powers on at the factory and auto-registers using its built-in one-time code | Device appears correctly in central inventory; no duplicate entry is created | ☐ Pass<br>☐ Fail | |
| **TC-CLM-02** | Customer powers on and tries to use a shipped device **without entering the claim code** | Device refuses to connect / stream; stays unactivated | ☐ Pass<br>☐ Fail | |
| **TC-CLM-03** | A different customer ("Customer B") tries to claim a device assigned to "Customer A" | Claim is rejected; device stays strictly linked to Customer A | ☐ Pass<br>☐ Fail | |
| **TC-CLM-04** | Customer A enters the correct Claim Code in their mobile app / portal | Claim succeeds; device status updates to "Installed", appears online, and streams start | ☐ Pass<br>☐ Fail | |
| **TC-CLM-05** | Customer A attempts to enter the same claim code a second time | Harmless; does not create a duplicate device or crash the app | ☐ Pass<br>☐ Fail | |
| **TC-CLM-06** | Customer enters an incorrect or expired claim code | Clear error message is shown (e.g. "Invalid or expired claim code"); does not crash | ☐ Pass<br>☐ Fail | |

---

## Module 8: Device Maintenance, Status Swaps & Retirement

| Test ID | What you do | What should happen | Pass / Fail | Notes |
|---|---|---|---|---|
| **TC-DEV-01** | In `/dashboard/devices`, click 3-dots on a device -> "Move to Maintenance", enter reason, and confirm | Status becomes "Maintenance"; device stops showing as active in the customer's live list, but historical tickets/record remain | ☐ Pass<br>☐ Fail | |
| **TC-DEV-02** | On a "Maintenance" device, click 3-dots -> "Return to Stock (Ready)" and confirm | Status changes back to "In Stock"; device is ready for new dispatch | ☐ Pass<br>☐ Fail | |
| **TC-DEV-03** | On a repaired or unusable device, click 3-dots -> "Decommission Unit" and confirm | Device is permanently retired ("Decommissioned"); can never connect or activate again even with old credentials | ☐ Pass<br>☐ Fail | |
| **TC-DEV-04** | On an "Assigned / Installed" device, click 3-dots -> "Unassign Customer" and confirm | Device is disconnected from that customer store and returned to central stock | ☐ Pass<br>☐ Fail | |
| **TC-DEV-05** | On any device row, click 3-dots -> "Delete Device", test clicking Cancel, then reopen and click Delete | Cancel does nothing; clicking Delete permanently removes device record from all tables with toast confirmation | ☐ Pass<br>☐ Fail | |

---

## Module 9: Cameras & Video Streams

| Test ID | What you do | What should happen | Pass / Fail | Notes |
|---|---|---|---|---|
| **TC-CAM-01** | Customer or technician adds a new camera stream (name, RTSP link, channel) to their installed device | Camera appears in the camera list and starts showing telemetry | ☐ Pass<br>☐ Fail | |
| **TC-CAM-02** | Edit a camera's name (e.g. rename "Cam 1" to "Cash Register 01") or update its settings | New name and settings reflect immediately across both customer app and admin panel | ☐ Pass<br>☐ Fail | |
| **TC-CAM-03** | Delete a camera from the device | Camera is removed from the list; device stops requesting or recording footage for that channel | ☐ Pass<br>☐ Fail | |

---

## Module 10: Security Detections, Alerts & AI Forensics

| Test ID | What you do | What should happen | Pass / Fail | Notes |
|---|---|---|---|---|
| **TC-EVT-01** | Motion or object triggers in front of an active camera | New event appears in `/dashboard/activity` and customer app with status "Analyzing" | ☐ Pass<br>☐ Fail | |
| **TC-EVT-02** | The AI decides the detection is a **real threat** (e.g. after-hours person) | Status changes to "Confirmed Alert" with high threat badge; customer receives push/email alert | ☐ Pass<br>☐ Fail | |
| **TC-EVT-03** | The AI decides the detection is **harmless** (cat, wind, shadow) | Status automatically moves to "False Alarm" and clears from active alerts without customer needing to do anything | ☐ Pass<br>☐ Fail | |
| **TC-EVT-04** | On an event detail page, click the green "Confirm Threat" button | Status updates to "Confirmed Alert"; stays confirmed even if AI sends further updates | ☐ Pass<br>☐ Fail | |
| **TC-EVT-05** | On an event detail page, click "Dismiss False Alarm", type reason (e.g. "Staff cleaning store"), and submit | Status updates to "Dismissed by User"; reason is saved in forensic audit history | ☐ Pass<br>☐ Fail | |
| **TC-EVT-06** | Open an event at `/dashboard/activity/[id]` and test the video player | 10-second alert clip loads from secure storage and plays smoothly with play/pause/fullscreen controls | ☐ Pass<br>☐ Fail | |
| **TC-EVT-07** | Inspect the AI Telemetry card on the event page | Displays AI confidence percentage (e.g. `94.2%`) and detected object tags (e.g. `person`, `crowbar`) cleanly | ☐ Pass<br>☐ Fail | |
| **TC-EVT-08** | Click the Copy icon next to the Event ID | Toast confirms "Event ID copied to clipboard"; icon briefly turns into a green checkmark | ☐ Pass<br>☐ Fail | |
| **TC-EVT-09** | Backend AI service is temporarily unreachable when motion occurs | Event stays on "Analyzing" safely without crashing the panel or corrupting the event log | ☐ Pass<br>☐ Fail | |

---

## Module 11: Support Tickets & Zero-Downtime RMA Hardware Swap

| Test ID | What you do | What should happen | Pass / Fail | Notes |
|---|---|---|---|---|
| **TC-RMA-01** | Customer raises a support ticket about hardware trouble from their app | Ticket automatically routes to their managing vendor in `/dashboard/tickets`; customer cannot accidentally pick the wrong vendor | ☐ Pass<br>☐ Fail | |
| **TC-RMA-02** | Vendor marks ticket as "In Progress", writes a response, and marks it "Resolved" | Status updates reflect live on both the customer app and admin tickets board | ☐ Pass<br>☐ Fail | |
| **TC-RMA-03** | In `/dashboard/tickets`, click "Hardware RMA Swap", pick the store, select defective device, select in-stock replacement, and execute | Defective unit is moved to "Maintenance"; fresh unit becomes "Installed" at store and **automatically inherits all camera settings** with zero re-configuration needed | ☐ Pass<br>☐ Fail | |
| **TC-RMA-04** | Open the RMA Swap modal and check the "Fresh Replacement Device" dropdown | Dropdown strictly lists devices with status "In Stock"; already deployed or broken units cannot be selected | ☐ Pass<br>☐ Fail | |

---

## Module 12: Hardware Models Catalog

| Test ID | What you do | What should happen | Pass / Fail | Notes |
|---|---|---|---|---|
| **TC-MOD-01** | Navigate to `/dashboard/device-models` | Displays catalog of models (e.g. 4-channel, 8-channel, 16-channel) with max camera capacity and active box counts | ☐ Pass<br>☐ Fail | |
| **TC-MOD-02** | Click "Add Model", enter Model Code (e.g. `KBX-16CH-ULTRA`), Model Name, Max Channels (16), and save | New model is saved, appears in the catalog, and is immediately available in the Factory Register dropdown | ☐ Pass<br>☐ Fail | |
| **TC-MOD-03** | Try adding a model with a code that already exists | System rejects with clear error: "Model code already exists" | ☐ Pass<br>☐ Fail | |

---

## Module 13: Settlement Bank Accounts & Payouts

| Test ID | What you do | What should happen | Pass / Fail | Notes |
|---|---|---|---|---|
| **TC-BNK-01** | Navigate to `/dashboard/bank-details` | Shows directory of partner vendor bank accounts, IFSC codes, and verification statuses | ☐ Pass<br>☐ Fail | |
| **TC-BNK-02** | Click "Activate" on a pending or inactive vendor bank account | Account status updates to green "Active" badge; vendor is now authorized for automated monthly payouts | ☐ Pass<br>☐ Fail | |
| **TC-BNK-03** | Click "Deactivate" on a bank account | Account status changes to Inactive; payouts are paused for that account | ☐ Pass<br>☐ Fail | |

---

## Module 14: Internal Team & Admin User Access

| Test ID | What you do | What should happen | Pass / Fail | Notes |
|---|---|---|---|---|
| **TC-USR-01** | Navigate to `/dashboard/users` (or `/dashboard/team`) | Displays internal admin staff with roles (`SuperAdmin`, `Admin`, `Member`); external customers are excluded | ☐ Pass<br>☐ Fail | |
| **TC-USR-02** | Click "Add Member", enter name, email, phone, role, and submit | New administrator appears in the team table and can log into the admin console | ☐ Pass<br>☐ Fail | |
| **TC-USR-03** | Click the trash icon on a team member row and confirm deletion in modal | User is deleted and removed from the team table | ☐ Pass<br>☐ Fail | |
| **TC-USR-04** | Locate your **own** currently logged-in account in `/dashboard/users` | Trash icon is disabled/hidden, or clicking delete shows: "Cannot delete active user account" (prevents locking yourself out) | ☐ Pass<br>☐ Fail | |

---

## Module 15: System Resilience, Network Issues & Empty States

| Test ID | What you do | What should happen | Pass / Fail | Notes |
|---|---|---|---|---|
| **TC-SYS-01** | Type random gibberish (e.g. `XYZ99999`) in the Devices or Vendors search bar | Shows clean, friendly empty state: "No matching devices found" with a reset button; no errors or infinite spinners | ☐ Pass<br>☐ Fail | |
| **TC-SYS-02** | Simulate backend disconnect or turn off internet, then refresh `/dashboard` | Page shows a clean error card: "Network error / Failed to connect to Kairos platform" with a working "Retry" button | ☐ Pass<br>☐ Fail | |
| **TC-SYS-03** | In DevTools, set Network speed to "Slow 3G" and click between dashboard pages | Smooth skeleton placeholder cards appear while data loads; page does not jump or flash broken elements | ☐ Pass<br>☐ Fail | |

---

## Module 16: Quick "Did Recent Updates Break Anything" Spot-Checks

| Test ID | What you do | What should happen | Pass / Fail | Notes |
|---|---|---|---|---|
| **TC-REG-01** | Open admin panel device management actions (add model, factory register, dispatch, maintenance, decommission, delete) | All actions work properly without silent errors (confirms recent backend endpoint updates are working) | ☐ Pass<br>☐ Fail | |
| **TC-REG-02** | Vendor app: create a new customer store directly from the vendor interface | Succeeds smoothly (confirms recent customer creation endpoint rename is working) | ☐ Pass<br>☐ Fail | |
| **TC-REG-03** | Check customer and vendor mobile/web apps for an old "Bank Details" screen | The old screen is hidden/removed as intended for the upcoming redesign; no broken links or crashes | ☐ Pass<br>☐ Fail | |
| **TC-REG-04** | Open the backend health check URL (`.../health`) in your browser | Returns a healthy status response (confirms uptime monitors are using the updated single health route) | ☐ Pass<br>☐ Fail | |

---

## 📊 QA Execution Tracker & Sign-Off Summary

Fill in this summary table as testing progresses:

| Module # | Module Name | Total Cases | Passed | Failed | Blocked | Sign-Off Date | Tester Initials |
|:---:|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **01** | Admin Login & Account Security | 7 | | | | | |
| **02** | Dashboard Overview & System Health | 3 | | | | | |
| **03** | Vendor Sign-Up, KYC Approval & Management | 8 | | | | | |
| **04** | Customer Sign-Up & Store Management | 7 | | | | | |
| **05** | Edge Hardware Factory Registration | 4 | | | | | |
| **06** | Hardware Logistics & Consignment Dispatch | 7 | | | | | |
| **07** | Device Claiming, Activation & Store Setup | 6 | | | | | |
| **08** | Device Maintenance, Status Swaps & Retirement | 5 | | | | | |
| **09** | Cameras & Video Streams | 3 | | | | | |
| **10** | Security Detections, Alerts & AI Forensics | 9 | | | | | |
| **11** | Support Tickets & Zero-Downtime RMA Swap | 4 | | | | | |
| **12** | Hardware Models Catalog | 3 | | | | | |
| **13** | Settlement Bank Accounts & Payouts | 3 | | | | | |
| **14** | Internal Team & Admin User Access | 4 | | | | | |
| **15** | System Resilience & Empty States | 3 | | | | | |
| **16** | Recent Update Spot-Checks | 4 | | | | | |
| **TOTAL** | **Entire Kairos Platform End-to-End Suite** | **77** | | | | | |
