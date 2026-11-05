# BNP.shop \- Full Project Specification (for Entire AI build)

## Project

BNP: Bike Number Plate \- full-stack one-page website \+ admin panel.Brand: BNP \| Bike Number Plate, a Joy & Arash Enterprise Venture.Co-founders: Joy & Arash. Domain: bnp.shop (purchase from HostNF). Hosting target: cPanel (HostNF) with MySQL. Payment: LoraHost Payment Bridge (PayStation relay). Notifications: Discord webhook (server-side only, stored in env/secret).

## Stack

* Next.js 14+ App Router, TypeScript, Tailwind CSS, Framer Motion  
* MySQL (cPanel) via mysql2 / Prisma with MySQL adapter  
* Node API routes deployed behind cPanel Node.js app (or build as standalone Next.js served via cPanel Node selector / Passenger)  
* Fonts: Hind Siliguri (Bangla), Sora or Space Grotesk (English)  
* Deploy: cPanel at HostNF, domain bnp.shop pointed via DNS

## Design system (world-class)

* Black carbon background, BNP red \#E11D2E accents, mirror-silver gradients, gold micro-highlights  
* Glassmorphism cards, smooth scroll animations, dark mode only  
* Plate preview with realistic metallic texture (CSS gradient \+ embossed text-shadow), numbers "stamp in" as user types  
* Sticky mobile order summary, animated price counter

## Business facts

* Products: Model A Motorcycle mirror silver steel plate 285x50 mm (MRP 380 BDT, pre-order 300, dealer 250); Model B Scooter 200x100 mm (MRP 450, pre-order 380, dealer 320\)  
* Mounting bracket/clamp kit add-on: \+80 BDT  
* Unit cost Model A: 138 BDT (printing 57, cutting 50.75, transport 20, QA/packaging 10\)  
* Delivery: Pathao courier default, actual charge passed through (sample: RedX 60 BDT); FULL ADVANCE payment only, no COD  
* BRTA compliance deadline: November 15 (urgency banner)  
* Hotline/bKash/Nagad: 01632333221; WhatsApp (registration paper photo required): 01914-873925  
* Email: [bikesnumberplate@gmail.com](mailto:bikesnumberplate@gmail.com); Facebook: facebook.com/bikenumberplate  
* Address: 52 Purana Paltan Line, Paltan, Dhaka  
* Bulk: steel plate 1 pc 150 BDT; 400 pcs 26,000 BDT; wholesale matrix 65 BDT/pc (0.5 mm, 400 pcs) to 80 BDT (0.8 mm single sheet)

## One-page sections (in order)

1. Urgency bar: "BRTA deadline: November 15" \+ hotline 01632333221  
2. Hero with 3D-style mirror silver plate render, tagline "Premium Quality \| Durable \| Stylish"  
3. Plate Designer (centerpiece): Model A/B toggle, smart paste "Dhaka Metro LA 12 3456" auto-converts to Bangla "ঢাকা মেট্রো-ল-১২-৩৪৫৬" (L/LA→ল, H/HA→হ, digits 0-9→০-৯), separate fields: region/metro, serial letter, first part, last part; live metallic preview at 285x50 and 200x100 ratios  
4. Pricing cards \+ bulk/dealer table  
5. Order form: name, phone, district, full address, model, reg number, quantity, bracket yes/no, Pathao delivery; live total calculation; checkbox instructing customer to send registration paper photo via WhatsApp 01914-873925  
6. Payment section: LoraHost checkout (PayStation: bKash, Nagad, cards), full advance; show bKash/Nagad manual 01632333221 only as fallback  
7. Footer: hotline, WhatsApp, email, Facebook, address, "A Joy & Arash Enterprise Venture"

## LoraHost Payment Bridge integration (canonical)

Canonical spec: docs/PAYMENT\_BRIDGE\_API.md · PayStation matrix: docs/PAYSTATION\_INTEGRATION\_MATRIX.md

* Step 1 (server): POST [https\://lorahost.lorapok.tech/api/payment-bridge/v1/sessions](https://lorahost.lorapok.tech/api/payment-bridge/v1/sessions) with Authorization: Bearer {bridge\_client\_token}, Content-Type: application/json. JSON body per docs/PAYMENT\_BRIDGE\_API.md: reference, amount, return\_url, customer, etc.  
* Step 2: redirect customer to checkout\_url from response ([https\://lorahost.lorapok.tech/pay/bridge/{session\_id}](https://lorahost.lorapok.tech/pay/bridge/{session_id}))  
* Step 3: browser return to return\_url with query params: reference, status, trx\_id, amount, session\_id, sig. Verify sig with return URL HMAC token (canonical sorted query excluding sig)  
* Step 4 (optional webhook): POST to our webhook URL; verify X-LoraHost-Signature header using webhook HMAC token against the RAW JSON body  
* Partner setup in Payment Bridge admin: Add to list, Display Name "BNP", Partner ID "bnp", return hosts bnp.shop \+ localhost:3000, Webhook URL [https\://bnp.shop/api/payment/webhook](https://bnp.shop/api/payment/webhook); copy bridge\_client\_token to env; ensure Bridge enabled toggle is ON  
* Errors: 401 unauthorized, 403 invalid checkout token, 422 invalid\_return\_url, 429 rate\_limited, 503 bridge\_disabled, 409 duplicate PayStation invoice (retry new session)

## Database (cPanel MySQL, NOT Supabase)

Create database bnp\_shop and user in cPanel, import schema:  
CREATE TABLE orders (  
  id INT AUTO\_INCREMENT PRIMARY KEY,  
  created\_at DATETIME DEFAULT CURRENT\_TIMESTAMP,  
  name VARCHAR(120) NOT NULL,  
  shop\_name VARCHAR(120) NULL,  
  phone VARCHAR(20) NOT NULL,  
  district VARCHAR(80) NOT NULL,  
  address TEXT NOT NULL,  
  model ENUM('A','B') NOT NULL,  
  reg\_number\_bangla VARCHAR(80) NOT NULL,  
  reg\_number\_english VARCHAR(80) NULL,  
  quantity INT NOT NULL DEFAULT 1,  
  bracket TINYINT(1) DEFAULT 0,  
  plate\_total INT NOT NULL,  
  delivery\_charge INT NOT NULL,  
  total INT NOT NULL,  
  payment\_status ENUM('pending\_payment','verifying','paid','failed') DEFAULT 'pending\_payment',  
  lora\_session\_id VARCHAR(80) NULL,  
  trx\_id VARCHAR(80) NULL,  
  status ENUM('new','confirmed','printed','shipped','delivered') DEFAULT 'new'  
);  
CREATE TABLE settings (  
  k VARCHAR(50) PRIMARY KEY,  
  v VARCHAR(255) NOT NULL  
);  
\-- seed settings: price\_a=380, price\_b=450, price\_preorder\_a=300, price\_preorder\_b=380, bracket\_price=80, urgency\_text='BRTA deadline: November 15'  
CREATE TABLE admins (  
  id INT AUTO\_INCREMENT PRIMARY KEY,  
  email VARCHAR(120) UNIQUE NOT NULL,  
  password\_hash VARCHAR(255) NOT NULL  
);  
Use Prisma or mysql2 with env vars: MYSQL\_HOST, MYSQL\_USER, MYSQL\_PASSWORD, MYSQL\_DATABASE (cPanel localhost).

## API routes

* POST /api/order: validate, compute totals server-side from settings table, insert order (pending\_payment), create LoraHost session, return checkout\_url  
* GET /api/payment/return: verify sig (canonical sorted query, excluding sig, HMAC return token), update order by reference, redirect to /payment/success or /payment/failed  
* POST /api/payment/webhook: verify X-LoraHost-Signature on raw body with webhook HMAC token, update order to paid, POST summary to Discord webhook (from env DISCORD\_WEBHOOK\_URL, never exposed client-side)  
* POST /api/admin/login: email \+ bcrypt password check, issue signed session cookie (HttpOnly)  
* /api/admin/orders: list, filter, update status (admin cookie required)

## Admin panel

* /admin/login: email \+ password (bcrypt hashed in admins table)  
* /admin/orders: table with search by phone, status dropdowns (payment\_status, status), total in BDT, "Open WhatsApp chat" button per order  
* /admin/settings: edit prices, bracket price, urgency text

## Env vars (.env.local, never commit)

MYSQL\_HOST, MYSQL\_USER, MYSQL\_PASSWORD, MYSQL\_DATABASE, LORA\_BRIDGE\_URL=[https\://lorahost.lorapok.tech/api/payment-bridge/v1/sessions](https://lorahost.lorapok.tech/api/payment-bridge/v1/sessions), LORA\_BRIDGE\_CLIENT\_TOKEN, LORA\_RETURN\_HMAC\_TOKEN, LORA\_WEBHOOK\_HMAC\_TOKEN, DISCORD\_WEBHOOK\_URL, ADMIN\_SESSION\_SECRET

## Entire workflow (agents \+ trails)

1. Agents: enable Code Review, Security, Intent Match. Create custom "Requirement Match" agent scoring 0-100 that checks payment gateway implementation and premium design requirements. Set gates: block merge on high severity issues.  
2. Use Project-Level Trails so frontend and backend build in one unified trail. Tell the coding agent explicitly: "create a trail".  
3. Trail order: (1) scaffold Next.js \+ Tailwind \+ fonts \+ theme; (2) PlateDesigner with Bangla conversion lib lib/bengali.ts; (3) all page sections \+ order form live total; (4) MySQL schema \+ /api/order \+ LoraHost session; (5) return handler \+ webhook \+ Discord notify; (6) admin panel; (7) cPanel deployment prep.  
4. Use "Address open findings" so review agents loop until green; use Entire Brain to store design choices and integration details for consistency.  
5. Deployment: build standalone Next.js, upload to cPanel, create Node.js app in cPanel (Passenger), set env vars in cPanel, import SQL schema via phpMyAdmin, point bnp.shop DNS in HostNF, add bnp.shop to LoraHost partner return hosts, run 1 BDT live test end to end (order → PayStation payment → webhook → Discord ping → admin shows paid).

## Launch checklist

* Full test order: designer → order → LoraHost payment → sig/webhook verification → Discord notification → admin Paid  
* Mobile-first check (traffic comes from Facebook)  
* Payment Bridge "Bridge enabled" ON; test duplicate-invoice 409 retry path  
* Post site link on Facebook page with BRTA Nov 15 deadline copy /nothink
