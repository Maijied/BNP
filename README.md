# BNP — Bike Number Plate

> **A Joy & Arash Enterprise Venture**  
> Premium Quality | Durable | Stylish  
> Official Website: [bnp.shop](https://bnp.shop)

---

## Overview

BNP (Bike Number Plate) is a modern full-stack e-commerce platform and administration portal engineered for custom, laser-cut mirror-silver stainless steel (0.8 mm, Finish No. 8) and BRTA-compliant aluminum motorcycle and scooter number plates in Bangladesh.

### Key Features

- **Sensory Interactive Plate Designer**: Real-time metallic plate visualization for Model A (Motorcycle: 285×50 mm) and Model B (Scooter: 200×100 mm).
- **Bangla Smart Transliteration Engine**: Real-time phonetic parsing that automatically converts English input (e.g. `Dhaka Metro LA 12 3456`) to valid BRTA Bangla format (`ঢাকা মেট্রো-ল-১২-৩৪৫৬`).
- **Full-Stack Order Pipeline**: Streamlined order placement with Pathao courier delivery calculation and mandatory WhatsApp registration verification.
- **LoraHost Payment Bridge Integration**: Automatic checkout session routing via PayStation (bKash, Nagad, cards) with cryptographic HMAC return and raw-body webhook signature verification.
- **Manual Payment Fallback**: Integrated bKash / Nagad Send Money verification with Transaction ID logging.
- **Discord Dispatcher**: Server-side webhook notifications delivering instant order embeds to private team channels.
- **Administrative Portal (`/admin`)**: Secure, bcrypt-authenticated dashboard for searching, filtering, and advancing order statuses (New, Confirmed, Printed, Shipped, Delivered) with direct WhatsApp customer chat links and dynamic settings management.

---

## Documentation & Roadmap

- **Operations & Deployment Runbook**: [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md)
- **Engineering Roadmap & Next Phases**: [`docs/NEXT_PLANS.md`](docs/NEXT_PLANS.md)

---

## Tech Stack

- **Framework**: Next.js 14+ (App Router, TypeScript, React)
- **Styling**: Tailwind CSS, Framer Motion, Lucide Icons
- **Typography**: Hind Siliguri (Bangla), Sora / Space Grotesk (Headings)
- **Database**: cPanel MySQL via `mysql2` parameterized queries
- **Security**: Bcrypt password hashing, signed HTTP-only cookies, HMAC SHA-256 webhook validation
- **Deployment**: Vercel (Frontend & Serverless API) + HostNF cPanel (MySQL)

---

## Environment Variables

Copy `.env.example` to `.env.local` and configure your credentials:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical public URL (e.g. `https://bnp.shop`) |
| `MYSQL_HOST` | MySQL database host |
| `MYSQL_PORT` | MySQL port (default: 3306) |
| `MYSQL_USER` | MySQL database user |
| `MYSQL_PASSWORD` | MySQL database password |
| `MYSQL_DATABASE` | MySQL database name (`bnp_shop`) |
| `LORA_BRIDGE_URL` | LoraHost Payment Bridge endpoint |
| `LORA_BRIDGE_CLIENT_TOKEN` | Bearer authorization client token |
| `LORA_RETURN_HMAC_TOKEN` | Secret key for return query signature verification |
| `LORA_WEBHOOK_HMAC_TOKEN` | Secret key for raw webhook signature verification |
| `DISCORD_WEBHOOK_URL` | Discord webhook URL for instant order alerts |
| `ADMIN_SESSION_SECRET` | Secret key for signed admin session cookies |
| `ADMIN_DEFAULT_EMAIL` | Default administrator account email |

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Database Migrations

```bash
npm run db:migrate
```

### 3. Start Local Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## License

Private and proprietary. Copyright © Joy & Arash Enterprise. All rights reserved.
