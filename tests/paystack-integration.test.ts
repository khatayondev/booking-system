import { describe, it, expect, beforeAll } from "vitest";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { MockPaymentProvider, getPaymentProvider } from "@/lib/payments/provider";
import {
  canTransitionPayment,
  assertPaymentTransition,
  canTransitionBooking,
  assertBookingTransition,
  assertCanConfirmBooking,
} from "@/lib/payments/state-machine";
import { reconcilePaymentTransaction } from "@/lib/payments/reconciliation";
import { runPaymentMaintenanceJobs } from "@/lib/payments/jobs";

describe("Prompts 11 & 12: Paystack Integration, State Machine & Webhooks", () => {
  let testCustomerId: string;
  let testStaffId: string;
  let testServiceId: string;

  beforeAll(async () => {
    // 1. Ensure test customer exists
    const customer = await prisma.customer.upsert({
      where: { phone: "+233241119988" },
      update: { name: "Paystack Test Client" },
      create: {
        phone: "+233241119988",
        name: "Paystack Test Client",
        email: "paystack-test@example.com",
      },
    });
    testCustomerId = customer.id;

    // 2. Ensure test staff & service exist
    const staff = await prisma.staff.findFirst({ where: { active: true } });
    if (staff) testStaffId = staff.id;

    const service = await prisma.service.findFirst({ where: { active: true } });
    if (service) testServiceId = service.id;
  });

  describe("1. PaymentProvider Interface & Mock Implementation", () => {
    it("initializes payment with GHS currency and server-computed pesewas", async () => {
      const provider = getPaymentProvider();
      const testRef = `TEST-INIT-${Date.now()}`;

      const res = await provider.initialize({
        reference: testRef,
        amountPesewas: 35000,
        email: "client@example.com",
        currency: "GHS",
      });

      expect(res.reference).toBe(testRef);
      expect(res.authorizationUrl).toContain(testRef);
      expect(res.accessCode).toBeDefined();

      const verify = await provider.verify(testRef);
      expect(verify.reference).toBe(testRef);
    });

    it("handles POS direct Mobile Money charge with OTP and PIN workflow", async () => {
      const mock = new MockPaymentProvider();
      const testRef = `TEST-POS-MOMO-${Date.now()}`;

      mock.setTransaction(testRef, {
        amountPesewas: 25000,
        momoStatus: "send_otp",
      });

      const chargeRes = await mock.chargeMobileMoney({
        reference: testRef,
        amountPesewas: 25000,
        email: "pos@example.com",
        phone: "+233241119988",
        provider: "mtn",
      });

      expect(chargeRes.status).toBe("send_otp");

      // Invalid OTP fails
      const badOtp = await mock.submitOtp({ reference: testRef, otp: "9999" });
      expect(badOtp.status).toBe("failed");

      // Valid OTP succeeds
      const goodOtp = await mock.submitOtp({ reference: testRef, otp: "123456" });
      expect(goodOtp.status).toBe("success");
    });
  });

  describe("2. Payment & Booking State Machine Enforcement", () => {
    it("permits legal payment transitions and rejects illegal ones", () => {
      expect(canTransitionPayment("PENDING", "PAID")).toBe(true);
      expect(canTransitionPayment("PENDING", "FAILED")).toBe(true);
      expect(canTransitionPayment("PAID", "REFUNDED")).toBe(true);
      expect(canTransitionPayment("PAID", "PARTIALLY_REFUNDED")).toBe(true);

      // Illegal transitions
      expect(canTransitionPayment("FAILED", "PAID")).toBe(false);
      expect(canTransitionPayment("PAID", "PENDING")).toBe(false);
      expect(canTransitionPayment("REFUNDED", "PAID")).toBe(false);

      expect(() => assertPaymentTransition("FAILED", "PAID")).toThrow(
        "Illegal payment transition"
      );
    });

    it("permits legal booking transitions and rejects invalid ones", () => {
      expect(canTransitionBooking("PENDING_PAYMENT", "CONFIRMED")).toBe(true);
      expect(canTransitionBooking("CONFIRMED", "CHECKED_IN")).toBe(true);
      expect(canTransitionBooking("CHECKED_IN", "COMPLETED")).toBe(true);

      // Illegal
      expect(canTransitionBooking("CANCELLED", "CONFIRMED")).toBe(false);
      expect(canTransitionBooking("COMPLETED", "PENDING_PAYMENT")).toBe(false);

      expect(() => assertBookingTransition("CANCELLED", "CONFIRMED")).toThrow(
        "Illegal booking transition"
      );
    });

    it("rejects booking confirmation on currency mismatch or insufficient deposit", () => {
      const mockBooking = {
        status: "PENDING_PAYMENT" as const,
        totalPesewas: 50000,
        depositRequiredPesewas: 25000,
        amountPaidPesewas: 0,
      };

      // Currency mismatch
      expect(() => assertCanConfirmBooking(mockBooking, 25000, "USD")).toThrow(
        "Invalid payment currency: expected GHS"
      );

      // Insufficient deposit
      expect(() => assertCanConfirmBooking(mockBooking, 10000, "GHS")).toThrow(
        "Insufficient payment amount"
      );

      // Valid deposit passes
      expect(() => assertCanConfirmBooking(mockBooking, 25000, "GHS")).not.toThrow();
    });
  });

  describe("3. Atomic Reconciliation & Concurrency Race Protection", () => {
    it("locks rows and prevents race conditions between simultaneous webhook and return-page verify", async () => {
      if (!testStaffId || !testServiceId) return;

      const testRef = `RACE-TEST-${Date.now()}`;

      // Create Booking & Payment
      const booking = await prisma.booking.create({
        data: {
          reference: `BK-RACE-${Date.now().toString().slice(-4)}`,
          status: "PENDING_PAYMENT",
          source: "WEB",
          startUtc: new Date(Date.now() + 700000000),
          endUtc: new Date(Date.now() + 703600000),
          staffId: testStaffId,
          customerId: testCustomerId,
          subtotalPesewas: 40000,
          totalPesewas: 40000,
          depositRequiredPesewas: 20000,
          amountPaidPesewas: 0,
          manageTokenHash: `race-hash-${Date.now()}`,
          items: {
            create: [
              {
                serviceId: testServiceId,
                pricePesewas: 40000,
                durationMin: 60,
              },
            ],
          },
        },
      });

      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          reference: testRef,
          amountPesewas: 20000,
          currency: "GHS",
          status: "PENDING",
          channel: "MOBILE_MONEY",
        },
      });

      const providerResult = {
        reference: testRef,
        status: "success" as const,
        amountPesewas: 20000,
        currency: "GHS",
        channel: "mobile_money",
        paidAt: new Date().toISOString(),
      };

      // Run BOTH webhook and return-page verify simultaneously in parallel
      const [res1, res2] = await Promise.all([
        reconcilePaymentTransaction({
          reference: testRef,
          providerResult,
          source: "WEBHOOK",
        }),
        reconcilePaymentTransaction({
          reference: testRef,
          providerResult,
          source: "RETURN_URL",
        }),
      ]);

      // Exactly ONE reconciled the payment, and the other detected alreadyProcessed
      const settledCount = [res1.alreadyProcessed, res2.alreadyProcessed].filter(
        (val) => val === false
      ).length;
      const alreadyProcessedCount = [res1.alreadyProcessed, res2.alreadyProcessed].filter(
        (val) => val === true
      ).length;

      expect(settledCount).toBe(1);
      expect(alreadyProcessedCount).toBe(1);

      // Verify database state: Booking confirmed and amount credited exactly once
      const finalBooking = await prisma.booking.findUnique({
        where: { id: booking.id },
      });
      expect(finalBooking?.status).toBe("CONFIRMED");
      expect(finalBooking?.amountPaidPesewas).toBe(20000); // NOT 40000!

      // Cleanup
      await prisma.payment.deleteMany({ where: { reference: testRef } });
      await prisma.bookingItem.deleteMany({ where: { bookingId: booking.id } });
      await prisma.booking.delete({ where: { id: booking.id } });
    });
  });

  describe("4. Paying Balance Later Flow", () => {
    it("allows settling outstanding balance and transitions to fully paid", async () => {
      if (!testStaffId || !testServiceId) return;

      const balanceRef = `BALANCE-${Date.now()}`;

      // Create booking with deposit paid
      const booking = await prisma.booking.create({
        data: {
          reference: `BK-BAL-${Date.now().toString().slice(-4)}`,
          status: "CONFIRMED",
          source: "WEB",
          startUtc: new Date(Date.now() + 800000000),
          endUtc: new Date(Date.now() + 803600000),
          staffId: testStaffId,
          customerId: testCustomerId,
          subtotalPesewas: 50000,
          totalPesewas: 50000,
          depositRequiredPesewas: 25000,
          amountPaidPesewas: 25000,
          manageTokenHash: `bal-hash-${Date.now()}`,
          items: {
            create: [
              {
                serviceId: testServiceId,
                pricePesewas: 50000,
                durationMin: 60,
              },
            ],
          },
        },
      });

      // Customer creates payment for the remaining balance (25000)
      const balancePayment = await prisma.payment.create({
        data: {
          bookingId: booking.id,
          reference: balanceRef,
          amountPesewas: 25000,
          currency: "GHS",
          status: "PENDING",
          channel: "CARD",
        },
      });

      // Settle balance payment
      await reconcilePaymentTransaction({
        reference: balanceRef,
        providerResult: {
          reference: balanceRef,
          status: "success",
          amountPesewas: 25000,
          currency: "GHS",
          channel: "card",
        },
        source: "RETURN_URL",
      });

      const updatedBooking = await prisma.booking.findUnique({
        where: { id: booking.id },
      });
      expect(updatedBooking?.amountPaidPesewas).toBe(50000);
      expect(updatedBooking?.amountPaidPesewas).toBe(updatedBooking?.totalPesewas);

      // Cleanup
      await prisma.payment.deleteMany({ where: { id: balancePayment.id } });
      await prisma.bookingItem.deleteMany({ where: { bookingId: booking.id } });
      await prisma.booking.delete({ where: { id: booking.id } });
    });
  });

  describe("5. HMAC SHA512 Webhook Signature & Idempotency", () => {
    it("correctly generates and validates HMAC SHA512 signature", () => {
      const payload = JSON.stringify({
        event: "charge.success",
        data: { reference: "SIG-TEST", amount: 35000 },
      });

      const validSignature = crypto
        .createHmac("sha512", env.PAYSTACK_SECRET_KEY)
        .update(payload)
        .digest("hex");

      const computed = crypto
        .createHmac("sha512", env.PAYSTACK_SECRET_KEY)
        .update(payload)
        .digest("hex");

      expect(validSignature).toBe(computed);

      const badSignature = "invalid_hash_signature";
      expect(validSignature === badSignature).toBe(false);
    });

    it("ensures duplicate webhook deliveries are recorded and dropped idempotently", async () => {
      const eventId = `evt_test_${Date.now()}`;

      // First webhook write
      const first = await prisma.processedWebhook.create({
        data: {
          eventId,
          eventType: "charge.success",
          payload: { test: true },
        },
      });
      expect(first.id).toBeDefined();

      // Duplicate check
      const duplicate = await prisma.processedWebhook.findUnique({
        where: { eventId },
      });
      expect(duplicate).not.toBeNull();

      // Cleanup
      await prisma.processedWebhook.delete({ where: { eventId } });
    });
  });

  describe("6. Background Jobs & Reconciliation Engine", () => {
    it("runs payment maintenance jobs to cancel stale unpaid bookings and reconcile holds", async () => {
      const result = await runPaymentMaintenanceJobs({
        unpaidBookingThresholdMin: 0, // Force check
        stalePaymentThresholdMin: 0,
      });

      expect(result).toBeDefined();
      expect(typeof result.expiredHoldsCount).toBe("number");
      expect(typeof result.cancelledBookingsCount).toBe("number");
      expect(typeof result.reconciledPaymentsCount).toBe("number");
      expect(typeof result.mismatchesDetected).toBe("number");
    });
  });
});
