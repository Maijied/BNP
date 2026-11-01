# BNP: Bike Number Plate — Production Deployment & Operations Runbook

**A Joy & Arash Enterprise Venture**  
**Strategic Technology & Infrastructure Partnership**:  
- **Lorapok Labs**: Central collective portal & Biological UI systems ([lorapok.tech](https://lorapok.tech))  
- **LoraHost**: Sovereign cloud infrastructure & automated PayStation PGW relay ([lorahost.lorapok.tech](https://lorahost.lorapok.tech))  
- **Entire Forge**: Multi-agent session tracking, checkpoints & eval trails ([entire.com](https://entire.com))  

**Live Production & Sandbox Domain**: `https://bnp.lorapok.tech` (also accessible via `https://bnp.shop`)  
**Products**: Laser-cut 0.8 mm Finish No. 8 mirror-silver steel and BRTA-compliant aluminum motorcycle and scooter plates in Bangladesh.  
**Official Channels**:  
- Hotline: `01632333221`  
- WhatsApp Registration Certificate Intake: `01914-873925`  
- Official Email: `bikesnumberplate@gmail.com`  
- Physical Workshop / Office: `52 Purana Paltan Line, Paltan, Dhaka`  

---

## 1. System Architecture Overview

```
                      +------------------------------------------+
                      |         Customer Browser (Web/Mobile)    |
                      +------------------------------------------+
                                           |
                                           v
                      +------------------------------------------+
                      |       Next.js 14 App Router (Node.js)    |
                      |  - Interactive Plate Designer            |
                      |  - Bengali Transliteration Engine        |
                      |  - Order Intake & Server Validation      |
                      |  - Admin Dashboard (/admin/orders)       |
                      |  - Settings Configurator (/admin/settings|
                      +------------------------------------------+
                        /            |             \           \
                       /             |              \           \
                      v              v               v           v
          +---------------+  +---------------+  +---------+  +-----------+
          | cPanel MySQL  |  |   LoraHost    |  | Discord |  | Customer  |
          |  (orders,     |  | Payment Bridge|  | Webhook |  | WhatsApp  |
          |   settings,   |  | (PayStation/  |  | Realtime|  | Bluebook  |
          |   admins)     |  |  bKash/Nagad) |  | Alerts  |  | Intake    |
          +---------------+  +---------------+  +---------+  +-----------+
```

---

## 2. Environment Configuration

Create `.env.local` for local development or configure environment variables in your production host (Vercel, Cloudflare, cPanel Node.js Application Manager, or Docker):

| Variable Key | Required | Default / Description |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Yes | Production URL (e.g. `https://bnp.shop` or `https://bikesnumberplate.com`) |
| `MYSQL_HOST` | Yes | cPanel/HostNF MySQL hostname (e.g., `localhost` or server IP/hostname) |
| `MYSQL_PORT` | No | `3306` |
| `MYSQL_USER` | Yes | Database username (e.g., `bnp_user`) |
| `MYSQL_PASSWORD` | Yes | Database user password |
| `MYSQL_DATABASE` | Yes | Database name (e.g., `bnp_shop`) |
| `LORA_BRIDGE_URL` | Yes | `https://lorahost.lorapok.tech` |
| `LORA_BRIDGE_CLIENT_TOKEN` | Yes | Client bearer token provided by LoraHost |
| `LORA_RETURN_HMAC_TOKEN` | Yes | HMAC secret for verifying redirect query signatures |
| `LORA_WEBHOOK_HMAC_TOKEN` | Yes | HMAC secret for verifying server-to-server webhook callbacks |
| `DISCORD_WEBHOOK_URL` | Yes | Incoming Discord Webhook URL for real-time order alerts |
| `ADMIN_SESSION_SECRET` | Yes | Random 32+ character string for signing JWT admin cookies |
| `ADMIN_DEFAULT_EMAIL` | No | Initial admin login email (`bikesnumberplate@gmail.com`) |
| `ADMIN_DEFAULT_PASSWORD` | No | Initial admin login password |

---

## 3. Database Setup (cPanel / phpMyAdmin / Remote MySQL)

### Step 3.1: Create MySQL Database and User
1. Log in to cPanel -> **MySQL Database Wizard**.
2. Create database: `username_bnp_shop`.
3. Create user: `username_bnp_user` with a strong password.
4. Add user to database with **ALL PRIVILEGES**.
5. If Next.js runs externally (e.g. Vercel), open **Remote MySQL** in cPanel and add `%` or your deployment egress IP addresses.

### Step 3.2: Run Database Migration
Execute the schema script located at `scripts/migrate.sql`. You can do this in two ways:

**Option A (phpMyAdmin):**
1. Open cPanel -> **phpMyAdmin**.
2. Select `username_bnp_shop`.
3. Click **Import** -> Select `scripts/migrate.sql` -> Click **Go**.

**Option B (CLI):**
```bash
MYSQL_HOST=your-host MYSQL_USER=username_bnp_user MYSQL_PASSWORD=your-pass MYSQL_DATABASE=username_bnp_shop npm run db:migrate
```

### Step 3.3: Seed Initial Admin User
```bash
ADMIN_DEFAULT_EMAIL=bikesnumberplate@gmail.com ADMIN_DEFAULT_PASSWORD=YourSecureAdminPassword123! npm run seed:admin
```

---

## 4. LoraHost Payment Bridge Configuration

BNP integrates with the **LoraHost Payment Bridge** for processing bKash, Nagad, Rocket, Upay, Visa, and Mastercard transactions relayed via PayStation.

### Step 4.1: Partner Registration
1. In the LoraHost Partner Console (`https://lorahost.lorapok.tech/partners`), ensure partner `bnp` is registered.
2. Add permitted return domains:
   - `https://bnp.shop`
   - `http://localhost:3000` (for development testing)
3. Note down the following credentials:
   - `LORA_BRIDGE_CLIENT_TOKEN`
   - `LORA_RETURN_HMAC_TOKEN`
   - `LORA_WEBHOOK_HMAC_TOKEN`

### Step 4.2: Callback Endpoints
- **Return URL**: `GET https://bnp.shop/payment/return`
  - Validates HMAC-SHA256 signature calculated over sorted canonical query parameters excluding `sig`.
  - Redirects customer to `/payment/success?orderNumber=...` or `/payment/failed?orderNumber=...`.
- **Webhook URL**: `POST https://bnp.shop/api/payment/webhook`
  - Validates HMAC-SHA256 signature calculated over raw request body text.
  - Updates order status to `PAID` in MySQL database.
  - Fires rich Discord embed notification to team channel.

---

## 5. Deployment Guide

### Deployment Method A: Vercel (Recommended)
1. Push repository `Maijied/BNP` to GitHub.
2. In Vercel Dashboard, click **New Project** -> Import `Maijied/BNP`.
3. Framework Preset: **Next.js**.
4. Configure all environment variables listed in Section 2.
5. Deploy.

### Deployment Method B: cPanel Node.js Application Manager
1. In cPanel, click **Setup Node.js App**.
2. Node.js version: **20.x** or higher.
3. Application Mode: **Production**.
4. Application root: `bnp`.
5. Application startup file: `server.js` or run `npm run build && npm run start`.
6. Add environment variables under **Environment variables** section.

---

## 6. End-to-End 1 BDT Live Payment Verification Runbook

Follow this step-by-step verification checklist before launching to public traffic:

1. **Visit Storefront**:
   - Navigate to `https://bnp.shop`.
   - Verify Bengali transliteration in Plate Designer: type `dhaka metro-la 11-2233` and verify instant preview rendering `ঢাকা মেট্রো-ল ১১-২২৩৩`.
   - Test toggle between Model A (285×50 mm) and Model B (200×100 mm).
   - Verify Finish No. 8 reflection effect and bolt slot cutouts.

2. **Place Test Order**:
   - Select Model A.
   - Select Mounting Kit (+৳80).
   - Enter Customer Name: `Joy Test`.
   - Enter Customer Mobile: `01700000000`.
   - Select District: `Dhaka` (verifies ৳60 delivery rate) or `Chittagong` (verifies ৳120 delivery rate).
   - Verify total calculation.
   - Check the mandatory agreement: *"I agree to send my vehicle registration certificate (bluebook) photo to WhatsApp (01914-873925)"*.
   - Click **Complete Full Advance Payment**.

3. **Gateway Redirection & Payment**:
   - Verify redirection to LoraHost Payment Bridge / PayStation checkout page.
   - Choose bKash / Sandbox bKash.
   - Complete 1 BDT test transaction.

4. **Return & Success Verification**:
   - Verify instant redirect to `https://bnp.shop/payment/return` with signed query params.
   - Verify customer land on `/payment/success?orderNumber=BNP-...`.
   - Verify green success badge, order summary, and itemized invoice slip.
   - Click **"Send Bluebook Photo via WhatsApp"** button. Confirm it opens WhatsApp to `01914-873925` with pre-filled order number and vehicle registration plate text.

5. **Discord Alert Verification**:
   - Open your Discord operations channel.
   - Confirm delivery of rich embed notification showing:
     - Order Number (clickable)
     - Customer Name & Phone
     - Stamped Plate Text in Bengali
     - Advance Amount Paid (৳ BDT)
     - Gateway Transaction ID
     - Action link to WhatsApp

6. **Admin Dashboard Verification**:
   - Navigate to `https://bnp.shop/admin/login`.
   - Enter seeded credentials (`bikesnumberplate@gmail.com`).
   - Confirm redirect to `/admin/orders`.
   - Verify the test order appears with **Payment: PAID**.
   - Test changing Manufacturing Status from `PENDING` -> `LASER_CUTTING` -> `QUALITY_INSPECTION` -> `PACKED` -> `SHIPPED`.
   - Navigate to `/admin/settings` and verify store settings (prices, delivery fees, urgency banner text) can be viewed and saved.

---

## 7. Operational Standard Operating Procedures (SOP)

### SOP 1: Customer WhatsApp Bluebook Intake & Verification
1. When a new paid order arrives via Discord notification, note the order number and plate text.
2. Wait for the customer's WhatsApp message on `01914-873925`.
3. Compare the customer's submitted vehicle registration paper photo against the stamped plate text:
   - Ensure the district, class letter, and numbers match 100%.
   - If there is any discrepancy, call customer at hotline `01632333221` or message via WhatsApp before laser cutting.
4. Once verified, update manufacturing status to `LASER_CUTTING` in the admin portal.

### SOP 2: Manual bKash "Send Money" Reconciliation
For customers who pay manually via bKash Personal Send Money to `01632333221`:
1. Customer messages WhatsApp with their Order Number and bKash TrxID.
2. Check bKash statement on `01632333221` for matching TrxID and amount.
3. Open `/admin/orders`, locate the order, and change **Payment Status** to `PAID`.
4. Input the TrxID in the order notes/records.
5. Proceed with laser-cutting workflow.

### SOP 3: 409 Duplicate Invoice Resolution
If a customer attempts payment, aborts, and immediately tries again, the system automatically appends a retry nonce (e.g. `BNP-261101-1234-R1`) so PayStation never rejects the session with HTTP 409 Conflict. No manual intervention is required.

---

## 8. Entire CLI & Entire Trails Workflow

The BNP repository integrates with **Entire** (`https://entire.com`) for tracking agent sessions, intent, checkpoints, and eval gates:

- **Entire Status**: Check active agent sessions and outgoing checkpoints:
  ```bash
  entire status
  ```
- **Entire Trails**: Manage intent and eval-driven PR reviews:
  ```bash
  entire trail create --title "Feature Name" --no-branch --body "Description" --type feature --priority high
  entire trail link <trail-id> --branch <branch-name>
  entire trail show <trail-id>
  ```
- **Loragent Entire Specialist**: Automated orchestration agent available in Loragent:
  - Invoked via `loragent-entire-specialist` for managing trails, verifying eval scores (Risk, Intent Drift, Slop), and reviewing session checkpoints.

---

## 9. Cloudflare Pages & Functions Architecture (`bnp.lorapok.tech`)

The live storefront and sandbox portal is hosted on **Cloudflare Pages** under `https://bnp.lorapok.tech`:

- **Pages Project**: `bnp` (`bnp-6ej.pages.dev`)
- **Custom Domain**: `bnp.lorapok.tech` (Cloudflare SSL / HTTP/2 proxy)
- **Static Assets (`out/`)**: Next.js 14 static export with optimized interactive client components (`next build` with `output: "export"`).
- **Edge Functions (`functions/`)**: Cloudflare Pages Functions execute dynamically on Cloudflare V8 Workers:
  - `functions/api/order.js`: Order validation, dynamic pricing calculation, and session creation with LoraHost Payment Bridge.
  - `functions/api/order/[orderNumber].js`: Dynamic receipt and order status lookup.
  - `functions/api/payment/webhook.js`: LoraHost Payment Bridge callback ingestion.
  - `functions/api/admin/*`: Lightweight edge admin authentication and management endpoints.
- **Continuous Deployment**: Automated build on GitHub push via `npm run build` with `destination_dir: "out"`.

