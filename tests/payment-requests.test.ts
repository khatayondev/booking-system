import { describe, it, expect, beforeAll } from "vitest";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import {
  createPaymentRequest,
  getPaymentRequestByToken,
  payPaymentRequest,
  cancelPaymentRequest,
  resendPaymentRequest,
} from "@/lib/payment-requests/service";
import { AppError } from "@/lib/api-response";
import { PermissionContextUser, UserRole, DEFAULT_ROLE_PERMISSIONS, PERMISSION_KEYS } from "@/lib/rbac";
import { subscribeToBookingEvents, BookingEventPayload } from "@/lib/booking-events";

describe("Prompt 15: Payment requests from dashboard & POS", () => {
  let testCustomerId: string;
  let testStaffId: string;
  let staffUser: PermissionContextUser;

  beforeAll(async () => {
    // 1. Create or get test customer
    const customer = await prisma.customer.upsert({
      where: { phone: "+233240099887" },
      update: { name: "Abena Darko" },
      create: {
        phone: "+233240099887",
        name: "Abena Darko",
        email: "abena.darko@example.com",
      },
    });
    testCustomerId = customer.id;

    // 2. Create dedicated test staff to avoid exclusion constraint collisions with other tests
    const staff = await prisma.staff.create({
      data: {
        name: `Payment Request Stylist ${Date.now()}`,
        phone: `+23324${Math.floor(1000000 + Math.random() * 8999999)}`,
        active: true,
      },
    });
    testStaffId = staff.id;

    // 3. Create or get receptionist/staff user
    let user = await prisma.user.findFirst({
      where: { role: { name: "STAFF_RECEPTIONIST" } },
      include: { role: true },
    });
    if (!user) {
      user = await prisma.user.findFirst({ include: { role: true } });
    }
    if (!user) {
      throw new Error("No user found in database");
    }

    staffUser = {
      userId: user.id,
      role: user.role.name as UserRole,
      staffId: testStaffId,
      permissions: [
        ...DEFAULT_ROLE_PERMISSIONS[user.role.name as UserRole],
        PERMISSION_KEYS.PAYMENTS_REQUEST,
      ],
    };
  });

  let bookingSlotIndex = 1;
  const createFreshBookingWithBalance = async (totalPesewas: number, depositPaid: number) => {
    bookingSlotIndex++;
    const startUtc = new Date(Date.now() + (bookingSlotIndex * 10 * 3600 * 1000) + (Math.random() * 3600000));
    const endUtc = new Date(startUtc.getTime() + 60 * 60 * 1000);
    const ref = `BK-PR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 10000)}`;
    const manageToken = crypto.randomBytes(24).toString("hex");
    const manageTokenHash = crypto.createHash("sha256").update(manageToken).digest("hex");

    return prisma.booking.create({
      data: {
        reference: ref,
        status: depositPaid > 0 ? "CONFIRMED" : "PENDING_PAYMENT",
        startUtc,
        endUtc,
        staffId: testStaffId,
        customerId: testCustomerId,
        subtotalPesewas: totalPesewas,
        totalPesewas,
        depositRequiredPesewas: Math.round(totalPesewas * 0.5),
        amountPaidPesewas: depositPaid,
        manageTokenHash,
      },
    });
  };

  describe("1. Security: 256-bit tokens hashed at rest & lookups", () => {
    it("generates 256-bit unguessable tokens, hashes at rest (SHA-256), and resolves by token", async () => {
      const booking = await createFreshBookingWithBalance(20000, 5000); // 150 GHS balance
      const balanceDue = booking.totalPesewas - booking.amountPaidPesewas;

      const created = await createPaymentRequest(
        staffUser,
        {
          bookingId: booking.id,
          amountPesewas: balanceDue,
          message: "Please settle your bridal balance",
          expiryMinutes: 60,
        }
      );

      // Verify raw token is 64 hex characters (32 bytes = 256 bits of entropy)
      expect(created.rawToken).toBeDefined();
      expect(created.rawToken?.length).toBe(64);

      // Verify database stores the SHA-256 hash, NOT the raw token
      const dbRecord = await prisma.paymentRequest.findUnique({
        where: { id: created.id },
      });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.tokenHash).toBeDefined();
      expect(dbRecord?.tokenHash).not.toBe(created.rawToken);

      const expectedHash = crypto
        .createHash("sha256")
        .update(created.rawToken!)
        .digest("hex");
      expect(dbRecord?.tokenHash).toBe(expectedHash);

      // Public lookup with raw token resolves correctly
      const view = await getPaymentRequestByToken(created.rawToken!);
      expect(view.bookingReference).toBe(booking.reference);
      expect(view.amountPesewas).toBe(balanceDue);
      expect(view.status).toBe("VIEWED"); // Flips to VIEWED on first access

      // Public lookup with short code also resolves correctly
      expect(created.shortUrl).toContain("/pay/r/");
      const shortCode = created.shortUrl.split("/pay/r/")[1];
      const viewByShort = await getPaymentRequestByToken(shortCode);
      expect(viewByShort.id).toBe(created.id);
    });
  });

  describe("2. Single active request per booking amount invariant", () => {
    it("allows only ONE active request for a given amount, throwing 409 Conflict on duplicates", async () => {
      const booking = await createFreshBookingWithBalance(30000, 10000); // 200 GHS balance

      // First request for 100 GHS (10000 pesewas)
      const firstReq = await createPaymentRequest(
        staffUser,
        {
          bookingId: booking.id,
          amountPesewas: 10000,
          message: "First installment",
        }
      );
      expect(firstReq.amountPesewas).toBe(10000);

      // Attempt second request for the EXACT SAME AMOUNT (10000 pesewas)
      await expect(
        createPaymentRequest(
          staffUser,
          {
            bookingId: booking.id,
            amountPesewas: 10000,
            message: "Duplicate installment",
          }
        )
      ).rejects.toThrow(AppError);

      try {
        await createPaymentRequest(
          staffUser,
          {
            bookingId: booking.id,
            amountPesewas: 10000,
          }
        );
      } catch (err: unknown) {
        expect((err as AppError).statusCode).toBe(409);
      }

      // But a request for a DIFFERENT amount (e.g. remaining 10000 or full 20000) succeeds if within balance
      const differentAmountReq = await createPaymentRequest(
        staffUser,
        {
          bookingId: booking.id,
          amountPesewas: 5000,
          message: "Smaller partial payment",
        }
      );
      expect(differentAmountReq.amountPesewas).toBe(5000);
    });
  });

  describe("3. Expiry and State Transitions", () => {
    it("marks request as EXPIRED when accessed past expiry, rejecting payment", async () => {
      const booking = await createFreshBookingWithBalance(15000, 0);

      const created = await createPaymentRequest(
        staffUser,
        {
          bookingId: booking.id,
          amountPesewas: 15000,
          expiryMinutes: 60,
        }
      );

      // Manually wind clock back in database to make it expired
      await prisma.paymentRequest.update({
        where: { id: created.id },
        data: {
          expiresAt: new Date(Date.now() - 1000 * 60), // 1 min ago
        },
      });

      // Fetching by token should now mark it EXPIRED
      const view = await getPaymentRequestByToken(created.rawToken!);
      expect(view.status).toBe("EXPIRED");

      // Paying an expired request should fail
      await expect(
        payPaymentRequest(created.rawToken!, {
          method: "MOBILE_MONEY",
          phone: "+233240099887",
          provider: "MTN",
        })
      ).rejects.toThrow(/expired/i);
    });
  });

  describe("4. End-to-End Payment Settlement & Balance Updates", () => {
    it("successfully settles payment, updates booking balance, and generates receipt", async () => {
      const total = 25000; // 250 GHS
      const deposit = 5000; // 50 GHS already paid
      const booking = await createFreshBookingWithBalance(total, deposit);
      const balanceDue = total - deposit; // 200 GHS

      // Capture emitted SSE events
      const events: BookingEventPayload[] = [];
      const unsub = subscribeToBookingEvents((event) => {
        if (event.bookingId === booking.id) {
          events.push(event);
        }
      });

      // 1. Staff creates payment request
      const req = await createPaymentRequest(
        staffUser,
        {
          bookingId: booking.id,
          amountPesewas: balanceDue,
          message: "Final balance before appointment",
        }
      );

      expect(events.some((e) => e.type === "PAYMENT_REQUEST_SENT")).toBe(true);

      // 2. Customer opens payment page
      const view = await getPaymentRequestByToken(req.rawToken!);
      expect(view.status).toBe("VIEWED");
      expect(events.some((e) => e.type === "PAYMENT_REQUEST_VIEWED")).toBe(true);

      // 3. Customer submits payment (without logging in)
      const payResult = await payPaymentRequest(req.rawToken!, {
        method: "MOBILE_MONEY",
        phone: "+233240099887",
        provider: "MTN",
      });

      expect(payResult.success).toBe(true);
      expect(payResult.newAmountPaidPesewas).toBe(total);
      expect(payResult.remainingBalancePesewas).toBe(0);
      expect(payResult.status).toBe("PAID");
      expect(payResult.receiptNumber).toMatch(/^R-\d{6}$/);

      // Verify booking updated in database
      const updatedBooking = await prisma.booking.findUnique({
        where: { id: booking.id },
      });
      expect(updatedBooking?.amountPaidPesewas).toBe(total);
      expect(updatedBooking?.status).toBe("CONFIRMED");

      // Verify event PAYMENT_REQUEST_PAID was emitted
      expect(events.some((e) => e.type === "PAYMENT_REQUEST_PAID")).toBe(true);

      // Re-paying should be rejected as already paid
      await expect(
        payPaymentRequest(req.rawToken!, {
          method: "CARD",
        })
      ).rejects.toThrow(/already been settled/i);

      unsub();
    });
  });

  describe("5. Staff Actions: Cancel and Resend", () => {
    it("allows staff to cancel an active payment request", async () => {
      const booking = await createFreshBookingWithBalance(18000, 0);

      const req = await createPaymentRequest(
        staffUser,
        {
          bookingId: booking.id,
          amountPesewas: 18000,
        }
      );

      const cancelled = await cancelPaymentRequest(req.id, staffUser);
      expect(cancelled.status).toBe("CANCELLED");

      // Once cancelled, payment cannot be made
      await expect(
        payPaymentRequest(req.rawToken!, {
          method: "CARD",
        })
      ).rejects.toThrow(/cancelled/i);
    });

    it("allows staff to resend payment request", async () => {
      const booking = await createFreshBookingWithBalance(12000, 0);

      const req = await createPaymentRequest(
        staffUser,
        {
          bookingId: booking.id,
          amountPesewas: 12000,
        }
      );

      const resent = await resendPaymentRequest(req.id, staffUser);
      expect(resent.status).toBe("SENT");
    });
  });
});
