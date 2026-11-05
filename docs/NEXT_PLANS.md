# BNP: Bike Number Plate — Next Plans & Engineering Roadmap

**A Joy & Arash Enterprise Venture in Strategic Partnership with Lorapok Labs & LoraHost**  
**Live Production & Sandbox**: [https://bnp.lorapok.tech](https://bnp.lorapok.tech)  
**Last Updated**: November 1, 2026  
**Status**: Phases 1–9 Completed & Deployed • Phases 10–16 Planned

---

## 🗺️ Roadmap Architecture Overview

```
[ Current Completed Baseline: Phases 1–9 ]
  - Interactive Metallic Plate Designer (Model A & Model B)
  - Bengali Phonetic Transliteration Engine
  - Order Intake Form with Live Delivery & Bracket Calculation
  - LoraHost Payment Gateway Exclusive Architecture (PayStation Relay)
  - Strategic Partnership Branding (Lorapok Labs + LoraHost)
  - Cloudflare Pages Static Export (out/) + Edge Functions (functions/)
  - Live at bnp.lorapok.tech with HTTP/2 SSL
                         |
                         v
[ Upcoming Execution Matrix: Phases 10–16 ]
  +-------------------------------------------------------------+
  | Phase 10: Persistent Edge Database (Cloudflare D1 / D1 ORM) |
  | Phase 11: LoraHost Live Payment Bridge Activation & HMAC   |
  | Phase 12: Direct Bluebook / Reg Upload via Cloudflare R2   |
  | Phase 13: Courier API Automation (Steadfast / Pathao)       |
  | Phase 14: Industrial Laser CAD/SVG Vector Generator         |
  | Phase 15: Supercharged Admin Analytics & ReportKit Exports  |
  | Phase 16: Loragent Entire Autonomous Quality Loop           |
  +-------------------------------------------------------------+
```

---

## 📌 Detailed Phase Specifications

### Phase 10: Persistent Edge Database (Cloudflare D1 Architecture)
- **Goal**: Replace ephemeral edge-mock order receipts with persistent, globally-distributed SQL storage on Cloudflare D1.
- **Components**:
  - D1 database `bnp-production` bound to Pages project `bnp`.
  - Schema migrations (`migrations/0001_create_tables.sql`):
    - `orders`: `id`, `order_number` (indexed), `customer_name`, `phone`, `district`, `address`, `model`, `reg_bangla`, `quantity`, `bracket`, `amount`, `payment_method`, `payment_status`, `manufacturing_status`, `tracking_number`, `created_at`, `updated_at`.
    - `settings`: `key`, `value`, `updated_at`.
    - `audit_logs`: `id`, `actor`, `action`, `metadata`, `created_at`.
  - Query layer integrated into `functions/api/order.js` and `functions/api/order/[orderNumber].js` via `env.DB.prepare(...)`.
  - Zero-cold-start queries with instant read replicas across Cloudflare's global edge network.

---

### Phase 11: LoraHost Live Payment Bridge Activation & HMAC Verification
- **Goal**: Enable real monetary payment processing (bKash, Nagad, Rocket, Visa/Mastercard) through LoraHost.
- **Components**:
  - Injected credentials in Cloudflare Pages environment:
    - `LORA_BRIDGE_URL`: `https://lorahost.lorapok.tech`
    - `LORA_BRIDGE_CLIENT_TOKEN`: Machine token issued by LoraHost admin vault.
    - `LORA_WEBHOOK_HMAC_SECRET`: Shared secret for payload integrity.
  - Enable payment bridge switch in LoraHost admin (`bridge_enabled: true`).
  - Webhook verification in `functions/api/payment/webhook.js`:
    - Compute HMAC SHA-256 of raw request body.
    - Compare against `X-LoraHost-Signature`.
    - Automatically update order `payment_status = 'paid'` upon receiving `settled` or `completed` event.
  - Automatic Discord webhook notification on successful payment settlement.

---

### Phase 12: Direct Bluebook / Registration Paper Upload via Cloudflare R2
- **Goal**: Eliminate friction of manual WhatsApp bluebook submission by allowing customers to attach vehicle registration paper photos directly during order intake.
- **Components**:
  - Cloudflare R2 object storage bucket: `bnp-bluebooks`.
  - Edge endpoint `functions/api/upload/presign.js`:
    - Generates presigned PUT URL with 5-minute expiry.
    - Enforces file type constraints (`image/jpeg`, `image/png`, `image/webp`) and max file size (10 MB).
  - Client component integration in `OrderForm.tsx`:
    - Drag-and-drop or camera shutter input on mobile.
    - Live upload progress indicator.
    - Image preview with privacy disclaimer: *"Used exclusively for manufacturing verification against BRTA guidelines"*.
  - Admin view in `/admin/orders`:
    - Secure image viewer with zoom/pan to inspect chassis and engine registration numbers before laser engraving.

---

### Phase 13: Courier & Logistics API Automation (Steadfast & Pathao)
- **Goal**: One-click or automated parcel dispatch upon plate manufacturing completion.
- **Components**:
  - Integration with **Steadfast Courier API**:
    - Endpoint: `POST https://portal.packzy.com/api/v1/create_order`
    - Payload: Customer name, phone, full address, COD amount (if balance remaining), delivery notes.
  - Integration with **Pathao Merchant API**:
    - Automatic city and zone mapping for all 64 Bangladesh districts.
  - Admin Trigger:
    - When order status is moved to `PACKED` in `/admin/orders`, an action button *"Dispatch via Steadfast"* creates the parcel instantly.
    - Consignment ID and Tracking Code (`tracking_number`) saved to order record.
  - Customer SMS Dispatch:
    - Integration with local SMS Gateway (Greenweb / BulkSMSBD) sending SMS:
      *"Your BNP plate is dispatched! Track your parcel with Steadfast: [Tracking Link]"*.

---

### Phase 14: Industrial Laser-Cutting CAD/Vector Automation
- **Goal**: Direct CAD/vector output generation for high-precision fiber laser-marking and CNC cutting machines.
- **Components**:
  - Automated vector generation endpoint `functions/api/admin/orders/[id]/vector.js`:
    - Generates production-ready SVG and DXF files.
    - Scale: 1:1 millimetric precision matching physical dimensions:
      - Model A: 285 mm × 50 mm (R=3 mm corner radii, 2 mounting holes Ø=6 mm at 180 mm pitch).
      - Model B: 200 mm × 100 mm (R=4 mm corner radii, 2 mounting holes Ø=6 mm at 140 mm pitch).
    - Bengali glyph vector outlines: Rendered using standardized BRTA stroke weights and kerning metrics.
  - Batch export:
    - Download ZIP bundle of day's production run for direct import into laser control software (EzCad2 / EzCad3 / LightBurn).

---

### Phase 15: Supercharged Admin Analytics & ReportKit High-Volume Exports
- **Goal**: Real-time business intelligence and multi-role operations management.
- **Components**:
  - **Role-Based Access Control (RBAC)**:
    - `Superadmin`: Full control, pricing adjustments, credentials.
    - `Workshop Operator`: Manufacturing queue, status toggling, vector download.
    - `Customer Support`: Receipt lookup, delivery status check, phone verification.
  - **Analytics Dashboard**:
    - Real-time KPI cards: Daily gross volume (৳ BDT), order volume, Model A vs Model B ratio, average turnaround time.
    - District delivery heat map highlighting high-demand regions (Dhaka Metro, Chattogram, Sylhet, Gazipur).
  - **ReportKit Integration**:
    - Chunked zero-memory CSV and Excel report exports for monthly accounting and tax audits.

---

### Phase 16: Loragent Entire Autonomous Quality Loop
- **Goal**: Continuous automated verification, eval testing, and PR management through the Entire agent network.
- **Components**:
  - Leverage `loragent-entire-specialist` for automated trail maintenance, change tracking, and checkpoint synchronization.
  - Automated pre-deployment test suite:
    - Bengali transliteration test suite (`npm run test:bengali`).
    - LoraHost session signature integrity test (`npm run test:crypto`).
    - Cloudflare Pages build validation (`npm run build`).
  - Strict alignment with Lorapok Labs engineering rules: zero AI attribution, no skip-ci markers, milestone-per-PR discipline.

---

## 📅 Suggested Implementation Phasing Schedule

| Phase | Milestone Name | Primary Dependency | Estimated Scope |
|---|---|---|---|
| **Phase 10** | Cloudflare D1 Persistent Edge Database | Cloudflare Pages D1 Binding | 1 Sprint |
| **Phase 11** | LoraHost Live Payment Bridge & Webhooks | LoraHost Admin Token | 1 Sprint |
| **Phase 12** | Cloudflare R2 Bluebook Direct Upload | Cloudflare R2 Bucket | 1 Sprint |
| **Phase 13** | Steadfast / Pathao Courier Automation | Steadfast API Keys | 1 Sprint |
| **Phase 14** | Industrial Laser CAD/Vector Generator | Vector Font Engine | 1 Sprint |
| **Phase 15** | Admin RBAC & Sales Analytics | Phase 10 (D1) | 1 Sprint |
| **Phase 16** | Loragent Entire Autonomous Quality Loop | Entire CLI & Trails | Continuous |

---

## 🔗 Related Resources & References
- **Production Storefront**: [https://bnp.lorapok.tech](https://bnp.lorapok.tech)
- **Deployment Runbook**: [`docs/DEPLOYMENT_GUIDE.md`](file:///mnt/NewVolume/Personal_Projects/BNP/docs/DEPLOYMENT_GUIDE.md)
- **Entire Project Trails**: [https://entire.com/gh/maijied](https://entire.com/gh/maijied)
- **Lorapok Labs Hub**: [https://lorapok.tech](https://lorapok.tech)
- **LoraHost Gateway**: [https://lorahost.lorapok.tech](https://lorahost.lorapok.tech)

