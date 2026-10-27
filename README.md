# Aura Beauty Studio - Enterprise Booking & POS System

A luxury, high-concurrency beauty studio management, online booking engine, and Point of Sale (POS) system engineered for Accra, Ghana. Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, PostgreSQL 16 (with Exclusion Constraints), Prisma ORM, Paystack Ghana (Cards & Mobile Money), and Arkesel SMS.

---

## 🌟 Key Features

### 1. Public Guest Experience
- **Luxury Aesthetic**: High-contrast monochrome design, glassmorphic accents, fluid micro-animations, and responsive 360px+ mobile layouts.
- **Availability Engine**: Real-time slot calculation respecting stylist shifts, meal breaks, time-off, service buffer times, and studio holidays.
- **Atomic Concurrency Protection**: 10-minute temporary holds backed by PostgreSQL `EXCLUDE USING gist` constraints to mathematically prevent double-booking.
- **Paystack Checkout**: Seamless GHS payments for cards and Ghana Mobile Money (MTN MoMo, Telecel Cash, AT Money) with automated receipt generation.
- **Self-Service Portal**: Customers can look up bookings with reference + phone, view appointments, pay outstanding balances, reschedule within policy, cancel with automated refund calculations, and export `.ics` calendar files.

### 2. Point of Sale (POS) & Reception
- **Walk-in & Appointment Checkout**: Rapid catalog browsing, service & retail item selection, custom discounts (governed by RBAC ceilings), and split payments (Cash + Mobile Money).
- **Instant Receipts**: Clean, branded thermal and digital receipts with printable layouts and SMS dispatch.
- **Payment Requests**: Generate secure GHS payment links with configurable expiration and automated SMS notifications sent directly to clients.

### 3. Management & Owner Controls
- **Interactive Onboarding Checklist**: Step-by-step studio launch progress tracker right on the Owner's dashboard.
- **Financial Reports**: Net revenue breakdowns by day, week, month, stylist, and service; comparative period growth metrics; permission-gated CSV and PDF exports.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions across 3 tiers: `OWNER_ADMIN`, `MANAGER`, and `STAFF_RECEPTIONIST`.
- **Append-Only Audit Log**: Comprehensive tamper-resistant activity logging with before/after state diffs for financial, user, and booking mutations.

---

## 🛡️ Security & Reliability Hardening

- **OWASP Top 10 Compliant**: Strict Content Security Policy (`CSP`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, HSTS preloading, and Permissions-Policy.
- **CSRF Defense**: Origin and Sec-Fetch-Site validation on mutating API requests, with HMAC-SHA512 validation for payment webhooks.
- **PII Minimisation**: Automated redaction in application logs masking phone numbers (`+23324****988`), passwords, CVVs, PANs, tokens, and secrets.
- **Encrypted Keys at Rest**: Field-level AES-256-GCM encryption for stored API secrets.
- **Automated Database Backups**: Scripted gzip compression with SHA-256 integrity checksums and tested one-command restore.
- **Observability**: Live `/api/health` checks reporting database latency, queue stats, and Sentry error monitoring.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 20+
- PostgreSQL 16+ (with `btree_gist` extension enabled)
- npm or pnpm

### 1. Installation & Environment
```bash
# Clone the repository
git clone https://github.com/khatayondev/booking-system.git
cd booking-system

# Install dependencies
npm install --legacy-peer-deps

# Copy environment variables
cp .env.example .env
```

### 2. Database Migration & Seed
```bash
# Push Prisma schema and migrations
npm run db:migrate

# Seed demo services, stylists, shifts, and permissions
npm run db:seed

# Bootstrap your initial Owner account
npx tsx scripts/seed-first-owner.ts
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the client-facing studio booking experience, or visit `/login` for the admin dashboard.

---

## 🧪 Testing Suite

```bash
# Run unit & integration test suite (17 suites, 171 tests)
npm test

# Run concurrency & load test on slot availability engine
npx tsx scripts/load-test-slots.ts

# Run Playwright End-to-End suite
npm run test:e2e

# Run TypeScript typecheck
npm run typecheck

# Run production build validation
npm run build
```

---

## 🐳 Docker Deployment

A production-ready multi-stage `Dockerfile` and `docker-compose.yml` are included:

```bash
# Build and run containers in background
docker compose up -d --build

# View health status
curl http://localhost:3000/api/health
```

---

## 📁 Repository Documentation

- **[RUNBOOK.md](file:///Users/khatayon/Booking-System/RUNBOOK.md)**: Production operations manual, database backups, disaster recovery, key rotation, and incident runbooks.
- **[MANUAL_ACCEPTANCE_TESTS.md](file:///Users/khatayon/Booking-System/MANUAL_ACCEPTANCE_TESTS.md)**: Business owner pre-opening acceptance tests.
- **[KNOWN_GAPS.md](file:///Users/khatayon/Booking-System/KNOWN_GAPS.md)**: Known edge cases, provider limitations, and roadmap.
