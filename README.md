# Aura Beauty Studio - Booking & POS System

A high-performance beauty salon booking engine and dashboard built with Next.js App Router, TypeScript, Tailwind CSS, PostgreSQL, Prisma, and Paystack.

---

## Paystack Test Mode Guide

### 1. Environment Setup

Configure your `.env` file with your Paystack test keys:

```bash
# Paystack Keys (obtained from your Paystack developer dashboard)
PAYSTACK_SECRET_KEY="your-paystack-secret-key"
PAYSTACK_PUBLIC_KEY="your-paystack-public-key"

# For automated testing and offline dev, you can use the built-in mock provider:
# MOCK_PAYMENTS=true
```

> **Security Guardrail**: Paystack secret keys are **NEVER** exposed to client components or browsers. All transaction initializations, verifications, and mobile money charges occur strictly server-side.

---

### 2. Ghana Test Mobile Money (MoMo) Numbers

When testing Mobile Money checkout or the POS Charge API in Paystack Test Mode:

| Provider | Phone Number | Behavior / Outcome |
| :--- | :--- | :--- |
| **MTN Mobile Money** | `055 123 4987` | Prompts for approval; automatically resolves as **Success** |
| **MTN Mobile Money (Failure)** | `055 123 4988` | Resolves as **Declined / Failed** |
| **Telecel / Vodafone Cash** | `020 000 0000` | Requires voucher code (use `0000` or `123456`) |
| **AT (AirtelTigo) Money** | `027 000 0000` | Authorizes test mobile money debit |

---

### 3. Test Cards

For testing card payments in Ghana Cedi (GHS):

| Card Type | Card Number | CVV | Expiry | PIN / OTP |
| :--- | :--- | :--- | :--- | :--- |
| **Success Card** | `4084 0840 8408 4084` | `408` | Any future date | `1234` / `123456` |
| **Declined Card** | `4084 0840 8408 4081` | `408` | Any future date | N/A |
| **Insufficient Funds** | `4084 0840 8408 4082` | `408` | Any future date | N/A |

---

### 4. Webhook Configuration

Set your webhook URL on your Paystack Dashboard:

- **Webhook URL**: `https://your-domain.com/api/webhooks/paystack`
- **Supported Events**:
  - `charge.success`
  - `charge.failed`
  - `refund.processed`

Each webhook request is cryptographically validated using HMAC SHA512 against the raw payload via the `x-paystack-signature` header. Duplicate webhooks are detected and dropped idempotently using atomic database locks.

---

### 5. Running Tests

```bash
# Run unit & integration tests (Vitest)
npm test

# Run E2E tests (Playwright)
npm run test:e2e
```
# booking-system
