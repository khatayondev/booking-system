import { describe, it, expect, beforeAll } from "vitest";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import {
  calculateCancellationRefund,
  canReschedule,
  generateIcsCalendar,
  generateGoogleCalendarUrl,
  getBookingByManageToken,
  lookupBookingByReferenceAndPhone,
  rescheduleBookingByCustomer,
  cancelBookingByCustomer,
  processDashboardRefund,
} from "@/lib/self-service";
import {
  PermissionContextUser,
  ROLES,
  UserRole,
  DEFAULT_ROLE_PERMISSIONS,
} from "@/lib/rbac";

describe("Prompt 18: Customer Self-Service, Cancellations & Refunds", () => {
  let ownerUser: PermissionContextUser;
  let managerUser: PermissionContextUser;
  let staffUser: PermissionContextUser;

  let testServiceId: string;

  // Helper to create a fresh isolated stylist to prevent exclusion constraint conflicts
  async function createIsolatedStylist(name: string) {
    return prisma.staff.create({
      data: {
        name,
        phone: `+23324${Math.floor(1000000 + Math.random() * 8999999)}`,
        active: true,
      },
    });
  }

  beforeAll(async () => {
    const uniqueSuffix = Date.now().toString().slice(-6);

    let category = await prisma.serviceCategory.findFirst();
    if (!category) {
      category = await prisma.serviceCategory.create({
        data: { name: "Hair Styling", slug: `hair-styling-${uniqueSuffix}`, order: 1 },
      });
    }

    const service = await prisma.service.create({
      data: {
        name: `Lace Front Install ${uniqueSuffix}`,
        categoryId: category.id,
        durationMin: 120,
        pricePesewas: 50000, // GH₵ 500.00
        depositType: "FIXED",
        depositValue: 10000, // GH₵ 100.00
        active: true,
      },
    });
    testServiceId = service.id;

    // RBAC Users
    const ownerDbUser = await prisma.user.findFirst({
      where: { role: { name: ROLES.OWNER_ADMIN } },
      include: { role: true },
    });
    if (!ownerDbUser) throw new Error("Owner user not found");

    ownerUser = {
      userId: ownerDbUser.id,
      role: ownerDbUser.role.name as UserRole,
      permissions: [...DEFAULT_ROLE_PERMISSIONS[ROLES.OWNER_ADMIN]],
    };

    let managerDbUser = await prisma.user.findFirst({
      where: { role: { name: ROLES.MANAGER } },
      include: { role: true },
    });
    if (!managerDbUser) {
      const managerRole = await prisma.role.findUnique({ where: { name: ROLES.MANAGER } });
      managerDbUser = await prisma.user.create({
        data: {
          email: `manager.${uniqueSuffix}@auraspa.local`,
          name: "Test Manager",
          passwordHash: "hash",
          roleId: managerRole!.id,
          active: true,
        },
        include: { role: true },
      });
    }

    managerUser = {
      userId: managerDbUser.id,
      role: managerDbUser.role.name as UserRole,
      permissions: [...DEFAULT_ROLE_PERMISSIONS[ROLES.MANAGER]],
    };

    let staffDbUser = await prisma.user.findFirst({
      where: { role: { name: ROLES.STAFF_RECEPTIONIST } },
      include: { role: true },
    });
    if (!staffDbUser) {
      const staffRole = await prisma.role.findUnique({ where: { name: ROLES.STAFF_RECEPTIONIST } });
      staffDbUser = await prisma.user.create({
        data: {
          email: `receptionist.${uniqueSuffix}@auraspa.local`,
          name: "Test Receptionist",
          passwordHash: "hash",
          roleId: staffRole!.id,
          active: true,
        },
        include: { role: true },
      });
    }

    staffUser = {
      userId: staffDbUser.id,
      role: staffDbUser.role.name as UserRole,
      permissions: [...DEFAULT_ROLE_PERMISSIONS[ROLES.STAFF_RECEPTIONIST]],
    };
  });

  // =========================================================================
  // 1. REFUND CALCULATION ENGINE ACROSS POLICY WINDOWS
  // =========================================================================
  describe("1. Refund Calculation Engine across Policy Windows", () => {
    const appointmentTime = new Date("2026-11-15T14:00:00Z");
    const totalPesewas = 50000; // GH₵ 500.00
    const depositRequiredPesewas = 10000; // GH₵ 100.00 deposit
    const cancellationNoticeHours = 24;

    it("FULL_REFUND_BEFORE_CUTOFF: Free 100% deposit + prepayment refund when > 24 hours prior", () => {
      // 48 hours prior
      const now = new Date("2026-11-13T14:00:00Z");
      const result = calculateCancellationRefund({
        startUtc: appointmentTime,
        now,
        cancellationNoticeHours,
        depositRefundPolicy: "FULL_REFUND_BEFORE_CUTOFF",
        depositRequiredPesewas,
        amountPaidPesewas: 10000, // Customer paid exact deposit
        totalPesewas,
      });

      expect(result.isBeforeCutoff).toBe(true);
      expect(result.depositRefundPesewas).toBe(10000);
      expect(result.depositForfeitedPesewas).toBe(0);
      expect(result.totalRefundPesewas).toBe(10000); // 100% refund
    });

    it("FULL_REFUND_BEFORE_CUTOFF: Forfeits deposit when inside 24-hour cutoff window", () => {
      // 12 hours prior (inside cutoff)
      const now = new Date("2026-11-15T02:00:00Z");
      const result = calculateCancellationRefund({
        startUtc: appointmentTime,
        now,
        cancellationNoticeHours,
        depositRefundPolicy: "FULL_REFUND_BEFORE_CUTOFF",
        depositRequiredPesewas,
        amountPaidPesewas: 10000,
        totalPesewas,
      });

      expect(result.isBeforeCutoff).toBe(false);
      expect(result.depositRefundPesewas).toBe(0);
      expect(result.depositForfeitedPesewas).toBe(10000);
      expect(result.totalRefundPesewas).toBe(0);
    });

    it("PARTIAL_50: 50% deposit refund before cutoff, deposit forfeited inside cutoff", () => {
      // > 24h prior
      const beforeCutoff = new Date("2026-11-14T00:00:00Z"); // 38 hours prior
      const resBefore = calculateCancellationRefund({
        startUtc: appointmentTime,
        now: beforeCutoff,
        cancellationNoticeHours,
        depositRefundPolicy: "PARTIAL_50",
        depositRequiredPesewas,
        amountPaidPesewas: 10000,
        totalPesewas,
      });
      expect(resBefore.depositRefundPesewas).toBe(5000); // 50% of GH₵ 100 = GH₵ 50
      expect(resBefore.depositForfeitedPesewas).toBe(5000);
      expect(resBefore.totalRefundPesewas).toBe(5000);

      // < 24h prior
      const afterCutoff = new Date("2026-11-15T10:00:00Z"); // 4 hours prior
      const resAfter = calculateCancellationRefund({
        startUtc: appointmentTime,
        now: afterCutoff,
        cancellationNoticeHours,
        depositRefundPolicy: "PARTIAL_50",
        depositRequiredPesewas,
        amountPaidPesewas: 10000,
        totalPesewas,
      });
      expect(resAfter.depositRefundPesewas).toBe(0);
      expect(resAfter.depositForfeitedPesewas).toBe(10000);
      expect(resAfter.totalRefundPesewas).toBe(0);
    });

    it("NON_REFUNDABLE: 0% deposit refund before and after cutoff", () => {
      const beforeCutoff = new Date("2026-11-13T14:00:00Z");
      const res = calculateCancellationRefund({
        startUtc: appointmentTime,
        now: beforeCutoff,
        cancellationNoticeHours,
        depositRefundPolicy: "NON_REFUNDABLE",
        depositRequiredPesewas,
        amountPaidPesewas: 10000,
        totalPesewas,
      });
      expect(res.depositRefundPesewas).toBe(0);
      expect(res.depositForfeitedPesewas).toBe(10000);
      expect(res.totalRefundPesewas).toBe(0);
    });

    it("Prepayment beyond deposit is always refunded even inside late cancellation cutoff", () => {
      // Customer paid full GH₵ 500 upfront (GH₵ 100 deposit + GH₵ 400 prepayment)
      // Cancelling 6 hours before appointment
      const now = new Date("2026-11-15T08:00:00Z");
      const res = calculateCancellationRefund({
        startUtc: appointmentTime,
        now,
        cancellationNoticeHours,
        depositRefundPolicy: "FULL_REFUND_BEFORE_CUTOFF",
        depositRequiredPesewas: 10000,
        amountPaidPesewas: 50000, // Full payment
        totalPesewas,
      });

      expect(res.isBeforeCutoff).toBe(false);
      expect(res.depositRefundPesewas).toBe(0);
      expect(res.depositForfeitedPesewas).toBe(10000); // Deposit is forfeited
      expect(res.prepaymentRefundPesewas).toBe(40000); // GH₵ 400 excess prepayment refunded
      expect(res.totalRefundPesewas).toBe(40000);
    });

    it("canReschedule: Enforces minimum cancellation notice window for rescheduling", () => {
      // 48 hours ahead -> allowed
      const futureCheck = canReschedule({
        startUtc: appointmentTime,
        now: new Date("2026-11-13T14:00:00Z"),
        cancellationNoticeHours: 24,
      });
      expect(futureCheck.allowed).toBe(true);

      // 12 hours ahead (<24h) -> rejected
      const lateCheck = canReschedule({
        startUtc: appointmentTime,
        now: new Date("2026-11-15T02:00:00Z"),
        cancellationNoticeHours: 24,
      });
      expect(lateCheck.allowed).toBe(false);
      expect(lateCheck.reason).toContain("requires at least 24 hours advance notice");

      // Past appointment -> rejected
      const pastCheck = canReschedule({
        startUtc: appointmentTime,
        now: new Date("2026-11-16T14:00:00Z"),
        cancellationNoticeHours: 24,
      });
      expect(pastCheck.allowed).toBe(false);
      expect(pastCheck.reason).toContain("Past appointments cannot be rescheduled");
    });
  });

  // =========================================================================
  // 2. TOKEN SECURITY: Customer A Cannot Access Customer B's Booking
  // =========================================================================
  describe("2. Token Security: Cross-Customer Isolation", () => {
    let customerAId: string;
    let customerBId: string;
    let rawTokenA: string;
    let rawTokenB: string;
    let bookingAId: string;
    let bookingBId: string;
    let bookingBRef: string;
    let sectionStaffId: string;

    beforeAll(async () => {
      const suffix = Date.now().toString().slice(-6);
      const staff = await createIsolatedStylist(`Security Stylist ${suffix}`);
      sectionStaffId = staff.id;

      // Customer A
      const custA = await prisma.customer.create({
        data: {
          name: `Customer Alpha ${suffix}`,
          phone: `+23324${Math.floor(1000000 + Math.random() * 8999999)}`,
        },
      });
      customerAId = custA.id;

      rawTokenA = crypto.randomBytes(24).toString("hex");
      const hashA = crypto.createHash("sha256").update(rawTokenA).digest("hex");

      const bookingA = await prisma.booking.create({
        data: {
          reference: `BK-A${suffix.slice(-4)}`,
          customerId: customerAId,
          staffId: sectionStaffId,
          startUtc: new Date(Date.now() + 48 * 3600 * 1000),
          endUtc: new Date(Date.now() + 50 * 3600 * 1000),
          subtotalPesewas: 50000,
          totalPesewas: 50000,
          depositRequiredPesewas: 10000,
          amountPaidPesewas: 10000,
          status: "CONFIRMED",
          manageTokenHash: hashA,
          items: {
            create: {
              serviceId: testServiceId,
              durationMin: 120,
              pricePesewas: 50000,
            },
          },
        },
      });
      bookingAId = bookingA.id;

      // Customer B
      const custB = await prisma.customer.create({
        data: {
          name: `Customer Beta ${suffix}`,
          phone: `+23320${Math.floor(1000000 + Math.random() * 8999999)}`,
        },
      });
      customerBId = custB.id;

      rawTokenB = crypto.randomBytes(24).toString("hex");
      const hashB = crypto.createHash("sha256").update(rawTokenB).digest("hex");

      const bookingB = await prisma.booking.create({
        data: {
          reference: `BK-B${suffix.slice(-4)}`,
          customerId: customerBId,
          staffId: sectionStaffId,
          startUtc: new Date(Date.now() + 72 * 3600 * 1000),
          endUtc: new Date(Date.now() + 74 * 3600 * 1000),
          subtotalPesewas: 50000,
          totalPesewas: 50000,
          depositRequiredPesewas: 10000,
          amountPaidPesewas: 10000,
          status: "CONFIRMED",
          manageTokenHash: hashB,
          items: {
            create: {
              serviceId: testServiceId,
              durationMin: 120,
              pricePesewas: 50000,
            },
          },
        },
      });
      bookingBId = bookingB.id;
      bookingBRef = bookingB.reference;
    });

    it("Customer A using Token A successfully views their own Booking A", async () => {
      const detailA = await getBookingByManageToken(rawTokenA);
      expect(detailA.id).toBe(bookingAId);
      expect(detailA.customerName).toContain("Customer Alpha");
    });

    it("Customer B using Token B successfully views their own Booking B", async () => {
      const detailB = await getBookingByManageToken(rawTokenB);
      expect(detailB.id).toBe(bookingBId);
      expect(detailB.customerName).toContain("Customer Beta");
    });

    it("Customer A with Token A CANNOT access Customer B's booking (Token A maps strictly to Booking A)", async () => {
      const detail = await getBookingByManageToken(rawTokenA);
      expect(detail.id).not.toBe(bookingBId);
      expect(detail.reference).not.toBe(bookingBRef);
    });

    it("Tampered or invalid token is rejected with BOOKING_NOT_FOUND error", async () => {
      const fakeToken = crypto.randomBytes(24).toString("hex");
      await expect(getBookingByManageToken(fakeToken)).rejects.toThrowError(
        /Booking not found or access token has expired/i
      );
    });

    it("Customer A cannot cancel Customer B's booking using Token A", async () => {
      // Attempting to cancel via Token A will cancel Booking A, never Booking B
      await cancelBookingByCustomer(rawTokenA, "Alpha cancellation");

      const bRecord = await prisma.booking.findUnique({ where: { id: bookingBId } });
      expect(bRecord?.status).toBe("CONFIRMED"); // Booking B remains completely unaffected
    });
  });

  // =========================================================================
  // 3. EDGE CASES
  // =========================================================================
  describe("3. Edge Cases: Pending Payment, Double Clicks & Same Slot", () => {
    let edgeStaffId: string;

    beforeAll(async () => {
      const staff = await createIsolatedStylist(`Edge Stylist ${Date.now()}`);
      edgeStaffId = staff.id;
    });

    it("Edge Case 1: Cancelling while a payment is pending is BLOCKED", async () => {
      const rawToken = crypto.randomBytes(24).toString("hex");
      const hash = crypto.createHash("sha256").update(rawToken).digest("hex");

      const cust = await prisma.customer.create({
        data: {
          name: "Pending Payment Customer",
          phone: `+23324${Math.floor(1000000 + Math.random() * 8999999)}`,
        },
      });

      const booking = await prisma.booking.create({
        data: {
          reference: `BK-PEND-${Date.now().toString().slice(-4)}`,
          customerId: cust.id,
          staffId: edgeStaffId,
          startUtc: new Date(Date.now() + 120 * 3600 * 1000),
          endUtc: new Date(Date.now() + 122 * 3600 * 1000),
          subtotalPesewas: 50000,
          totalPesewas: 50000,
          depositRequiredPesewas: 10000,
          amountPaidPesewas: 0,
          status: "PENDING_PAYMENT",
          manageTokenHash: hash,
        },
      });

      // Create pending payment record
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          reference: `PAY-PENDING-${Date.now()}`,
          amountPesewas: 10000,
          currency: "GHS",
          status: "PENDING",
          channel: "CARD",
        },
      });

      // Cancellation MUST be rejected
      await expect(cancelBookingByCustomer(rawToken)).rejects.toThrowError(
        /Cannot cancel booking while a payment transaction is currently pending/i
      );
    });

    it("Edge Case 2: Double cancellation clicks are handled idempotently without duplicate refund", async () => {
      const rawToken = crypto.randomBytes(24).toString("hex");
      const hash = crypto.createHash("sha256").update(rawToken).digest("hex");

      const cust = await prisma.customer.create({
        data: {
          name: "Double Click Customer",
          phone: `+23324${Math.floor(1000000 + Math.random() * 8999999)}`,
        },
      });

      const booking = await prisma.booking.create({
        data: {
          reference: `BK-DBL-${Date.now().toString().slice(-4)}`,
          customerId: cust.id,
          staffId: edgeStaffId,
          startUtc: new Date(Date.now() + 140 * 3600 * 1000),
          endUtc: new Date(Date.now() + 142 * 3600 * 1000),
          subtotalPesewas: 50000,
          totalPesewas: 50000,
          depositRequiredPesewas: 10000,
          amountPaidPesewas: 10000,
          status: "CONFIRMED",
          manageTokenHash: hash,
        },
      });

      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          reference: `PAY-DBL-${Date.now()}`,
          amountPesewas: 10000,
          currency: "GHS",
          status: "PAID",
          channel: "MOBILE_MONEY",
        },
      });

      // First click: successfully cancels
      const firstResult = await cancelBookingByCustomer(rawToken, "First click");
      expect(firstResult.status).toBe("CANCELLED");
      expect(firstResult.alreadyCancelled).toBe(false);
      expect(firstResult.refundAmountPesewas).toBe(10000);

      // Second click: handled idempotently, refund is 0, no duplicate execution
      const secondResult = await cancelBookingByCustomer(rawToken, "Second double-click");
      expect(secondResult.status).toBe("CANCELLED");
      expect(secondResult.alreadyCancelled).toBe(true);
      expect(secondResult.refundAmountPesewas).toBe(0);
    });

    it("Edge Case 3: Rescheduling to the EXACT SAME slot is BLOCKED", async () => {
      const rawToken = crypto.randomBytes(24).toString("hex");
      const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const originalStart = new Date(Date.now() + 160 * 3600 * 1000);

      const cust = await prisma.customer.create({
        data: {
          name: "Same Slot Customer",
          phone: `+23324${Math.floor(1000000 + Math.random() * 8999999)}`,
        },
      });

      await prisma.booking.create({
        data: {
          reference: `BK-SAME-${Date.now().toString().slice(-4)}`,
          customerId: cust.id,
          staffId: edgeStaffId,
          startUtc: originalStart,
          endUtc: new Date(originalStart.getTime() + 2 * 3600 * 1000),
          subtotalPesewas: 50000,
          totalPesewas: 50000,
          depositRequiredPesewas: 10000,
          amountPaidPesewas: 10000,
          status: "CONFIRMED",
          manageTokenHash: hash,
        },
      });

      // Attempt to reschedule to the exact same start time
      await expect(
        rescheduleBookingByCustomer(rawToken, originalStart.toISOString())
      ).rejects.toThrowError(
        /The selected slot is the same as your current appointment time/i
      );
    });
  });

  // =========================================================================
  // 4. RATE-LIMITED LOOKUP BY REFERENCE AND PHONE
  // =========================================================================
  describe("4. Rate-Limited Lookup by Reference and Phone", () => {
    let bookingRef: string;
    let lookupStaffId: string;
    const rawPhone = "0245678901";
    const normalizedPhone = "+233245678901";

    beforeAll(async () => {
      const staff = await createIsolatedStylist(`Lookup Stylist ${Date.now()}`);
      lookupStaffId = staff.id;

      // Upsert customer with unique phone
      let cust = await prisma.customer.findUnique({ where: { phone: normalizedPhone } });
      if (!cust) {
        cust = await prisma.customer.create({
          data: { name: "Lookup Test Customer", phone: normalizedPhone },
        });
      }

      const rawToken = crypto.randomBytes(24).toString("hex");
      const hash = crypto.createHash("sha256").update(rawToken).digest("hex");

      const booking = await prisma.booking.create({
        data: {
          reference: `BK-LOOK-${Date.now().toString().slice(-4)}`,
          customerId: cust.id,
          staffId: lookupStaffId,
          startUtc: new Date(Date.now() + 48 * 3600 * 1000),
          endUtc: new Date(Date.now() + 50 * 3600 * 1000),
          subtotalPesewas: 50000,
          totalPesewas: 50000,
          depositRequiredPesewas: 10000,
          amountPaidPesewas: 10000,
          status: "CONFIRMED",
          manageTokenHash: hash,
        },
      });
      bookingRef = booking.reference;
    });

    it("Lookup succeeds with correct reference and local 024 phone number", async () => {
      const summary = await lookupBookingByReferenceAndPhone({
        reference: bookingRef,
        phone: rawPhone,
        clientIp: "10.0.0.1",
      });

      expect(summary.reference).toBe(bookingRef);
      expect(summary.customerName).toBe("Lookup Test Customer");
    });

    it("Lookup fails when phone does not match booking reference", async () => {
      await expect(
        lookupBookingByReferenceAndPhone({
          reference: bookingRef,
          phone: "0209999999", // Different customer phone
          clientIp: "10.0.0.2",
        })
      ).rejects.toThrowError(/No booking found with this reference and phone number/i);
    });

    it("Rate limiting blocks repeated failed lookups from same IP", async () => {
      const spamIp = "192.168.100.50";
      // 5 requests allowed
      for (let i = 0; i < 5; i++) {
        try {
          await lookupBookingByReferenceAndPhone({
            reference: "NON-EXISTENT",
            phone: rawPhone,
            clientIp: spamIp,
          });
        } catch {
          // expected 404
        }
      }

      // 6th request must throw 429 Rate limit exceeded
      await expect(
        lookupBookingByReferenceAndPhone({
          reference: "NON-EXISTENT",
          phone: rawPhone,
          clientIp: spamIp,
        })
      ).rejects.toThrowError(/Rate limit exceeded/i);
    });
  });

  // =========================================================================
  // 5. ICS CALENDAR FORMATTING
  // =========================================================================
  describe("5. Calendar (.ics) Generation", () => {
    it("Produces valid RFC 5545 iCalendar content with UTC timestamps and alarms", () => {
      const start = new Date("2026-12-01T10:00:00Z");
      const end = new Date("2026-12-01T12:00:00Z");

      const ics = generateIcsCalendar({
        reference: "BK-CAL123",
        summary: "Bridal Styling - Aura Beauty Studio",
        description: "Full bridal trial appointment",
        startUtc: start,
        endUtc: end,
        location: "14 Senchi Street, Airport Residential Area, Accra, Ghana",
      });

      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain("VERSION:2.0");
      expect(ics).toContain("BEGIN:VEVENT");
      expect(ics).toContain("DTSTART:20261201T100000Z");
      expect(ics).toContain("DTEND:20261201T120000Z");
      expect(ics).toContain("SUMMARY:Bridal Styling - Aura Beauty Studio");
      expect(ics).toContain("LOCATION:14 Senchi Street\\, Airport Residential Area\\, Accra\\, Ghana");
      expect(ics).toContain("STATUS:CONFIRMED");
      expect(ics).toContain("TRIGGER:-PT24H"); // 24-hour reminder
      expect(ics).toContain("TRIGGER:-PT2H"); // 2-hour reminder
      expect(ics).toContain("END:VEVENT");
      expect(ics).toContain("END:VCALENDAR");
    });

    it("Generates valid Google Calendar web link", () => {
      const url = generateGoogleCalendarUrl({
        reference: "BK-CAL123",
        summary: "Bridal Styling",
        description: "Notes",
        startUtc: new Date("2026-12-01T10:00:00Z"),
        endUtc: new Date("2026-12-01T12:00:00Z"),
      });

      expect(url).toContain("https://calendar.google.com/calendar/render?action=TEMPLATE");
      expect(url).toContain("dates=20261201T100000Z%2F20261201T120000Z");
    });
  });

  // =========================================================================
  // 6. DASHBOARD REFUND FLOW WITH ROLE LIMITS
  // =========================================================================
  describe("6. Dashboard Refund Flow & Role Limits", () => {
    let refundBookingId: string;
    let paymentId: string;
    let refundStaffId: string;

    beforeAll(async () => {
      const staff = await createIsolatedStylist(`Refund Stylist ${Date.now()}`);
      refundStaffId = staff.id;

      const cust = await prisma.customer.create({
        data: {
          name: "Dashboard Refund Customer",
          phone: `+23324${Math.floor(1000000 + Math.random() * 8999999)}`,
        },
      });

      const booking = await prisma.booking.create({
        data: {
          reference: `BK-REF-${Date.now().toString().slice(-4)}`,
          customerId: cust.id,
          staffId: refundStaffId,
          startUtc: new Date(Date.now() + 48 * 3600 * 1000),
          endUtc: new Date(Date.now() + 50 * 3600 * 1000),
          subtotalPesewas: 100000, // GH₵ 1,000.00
          totalPesewas: 100000,
          depositRequiredPesewas: 20000,
          amountPaidPesewas: 60000, // GH₵ 600.00 paid
          status: "CONFIRMED",
          manageTokenHash: crypto.randomBytes(32).toString("hex"),
        },
      });
      refundBookingId = booking.id;

      const pmt = await prisma.payment.create({
        data: {
          bookingId: booking.id,
          reference: `PAY-REF-${Date.now()}`,
          amountPesewas: 60000,
          currency: "GHS",
          status: "PAID",
          channel: "CARD",
        },
      });
      paymentId = pmt.id;
    });

    it("Mandatory reason: rejects refund when reason is empty", async () => {
      await expect(
        processDashboardRefund({
          bookingId: refundBookingId,
          amountPesewas: 10000,
          refundType: "MANUAL",
          reason: "   ", // Empty string
          user: managerUser,
        })
      ).rejects.toThrowError(/refund reason is required/i);
    });

    it("Staff Role Limit: Staff limited to GH₵ 50 (5,000 pesewas) cannot refund GH₵ 60 (6,000 pesewas)", async () => {
      await expect(
        processDashboardRefund({
          bookingId: refundBookingId,
          amountPesewas: 6000, // GH₵ 60.00 > Staff GH₵ 50.00 limit
          refundType: "MANUAL",
          reason: "Staff attempting excess refund",
          user: staffUser,
        })
      ).rejects.toThrowError(/Insufficient permissions for "payments.refund"/i);
    });

    it("Rejects refund when requested amount exceeds booking remaining balance", async () => {
      await expect(
        processDashboardRefund({
          bookingId: refundBookingId,
          amountPesewas: 70000, // 70,000 > 60,000
          refundType: "MANUAL",
          reason: "Over-refund attempt",
          user: ownerUser,
        })
      ).rejects.toThrowError(/exceeds the remaining paid amount on this booking/i);
    });

    it("Manager Role Limit: Manager (limit GH₵ 500) successfully refunds GH₵ 200 (20,000 pesewas)", async () => {
      const res = await processDashboardRefund({
        bookingId: refundBookingId,
        paymentId,
        amountPesewas: 20000, // GH₵ 200.00 <= GH₵ 500.00
        refundType: "MANUAL",
        reason: "Manager partial refund approval",
        user: managerUser,
      });

      expect(res.amountPesewas).toBe(20000);
      expect(res.remainingPaidPesewas).toBe(40000); // 60,000 - 20,000 = 40,000

      // Verify payment was updated to PARTIALLY_REFUNDED
      const paymentInDb = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(paymentInDb?.status).toBe("PARTIALLY_REFUNDED");
    });

    it("Owner Unlimited: Owner successfully refunds remaining GH₵ 400 (40,000 pesewas) via Paystack", async () => {
      const res = await processDashboardRefund({
        bookingId: refundBookingId,
        paymentId,
        amountPesewas: 40000, // Remaining balance
        refundType: "PAYSTACK",
        reason: "Owner full electronic refund",
        user: ownerUser,
      });

      expect(res.amountPesewas).toBe(40000);
      expect(res.remainingPaidPesewas).toBe(0);

      // Verify payment is now fully REFUNDED
      const paymentInDb = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(paymentInDb?.status).toBe("REFUNDED");
    });

    it("Rejects refund when booking has zero paid amount remaining", async () => {
      await expect(
        processDashboardRefund({
          bookingId: refundBookingId,
          amountPesewas: 5000, // Booking now has 0 remaining balance
          refundType: "MANUAL",
          reason: "Zero balance attempt",
          user: ownerUser,
        })
      ).rejects.toThrowError(/no paid amount available for refund/i);
    });
  });
});
