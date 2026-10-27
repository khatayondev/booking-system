import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import {
  generateComprehensiveReport,
} from "@/lib/reports/service";
import { generateComprehensiveCsv } from "@/lib/reports/csv";
import {
  logAuditEvent,
  getAuditLogs,
  computeAuditDiff,
} from "@/lib/audit/service";
import {
  PermissionContextUser,
  ROLES,
  UserRole,
  DEFAULT_ROLE_PERMISSIONS,
  requirePermission,
  PERMISSION_KEYS,
} from "@/lib/rbac";
import { PaymentStatus, BookingStatus, BookingSource } from "@prisma/client";

describe("Prompt 19: Reports and Audit Log", () => {
  let ownerUser: PermissionContextUser;
  let managerUser: PermissionContextUser;
  let staffUser: PermissionContextUser;

  let testService1Id: string;
  let testService2Id: string;

  async function cleanupTestData() {
    const testBookings = await prisma.booking.findMany({
      where: {
        OR: [
          { reference: { startsWith: "REC-B" } },
          { reference: { startsWith: "RATE-B" } },
          { reference: { startsWith: "UTIL-B" } },
          { reference: { startsWith: "PREV-B" } },
          { reference: { startsWith: "CURR-B" } },
          { reference: { startsWith: "COMM-B" } },
        ],
      },
      select: { id: true },
    });

    if (testBookings.length > 0) {
      const ids = testBookings.map((b) => b.id);
      const payments = await prisma.payment.findMany({
        where: { bookingId: { in: ids } },
        select: { id: true },
      });
      const pIds = payments.map((p) => p.id);
      if (pIds.length > 0) {
        await prisma.refund.deleteMany({ where: { paymentId: { in: pIds } } });
        await prisma.payment.deleteMany({ where: { id: { in: pIds } } });
      }
      await prisma.bookingItem.deleteMany({ where: { bookingId: { in: ids } } });
      await prisma.booking.deleteMany({ where: { id: { in: ids } } });
    }
  }

  // Helper to create fresh isolated stylist
  async function createIsolatedStaff(name: string) {
    return prisma.staff.create({
      data: {
        name,
        phone: `+23324${Math.floor(1000000 + Math.random() * 8999999)}`,
        active: true,
      },
    });
  }

  // Helper to create test customer
  async function createTestCustomer(name: string) {
    return prisma.customer.create({
      data: {
        name,
        phone: `+23320${Math.floor(1000000 + Math.random() * 8999999)}`,
        email: `${name.toLowerCase().replace(/\s+/g, "")}.${Date.now()}@test.local`,
      },
    });
  }

  beforeAll(async () => {
    await cleanupTestData();
    const uniqueSuffix = Date.now().toString().slice(-6);

    let category = await prisma.serviceCategory.findFirst();
    if (!category) {
      category = await prisma.serviceCategory.create({
        data: { name: `Spa Category ${uniqueSuffix}`, slug: `spa-${uniqueSuffix}`, order: 1 },
      });
    }

    const s1 = await prisma.service.create({
      data: {
        name: `Lash Extensions ${uniqueSuffix}`,
        categoryId: category.id,
        durationMin: 90,
        pricePesewas: 35000, // GH₵ 350.00
        active: true,
      },
    });
    testService1Id = s1.id;

    const s2 = await prisma.service.create({
      data: {
        name: `Bridal Makeup ${uniqueSuffix}`,
        categoryId: category.id,
        durationMin: 120,
        pricePesewas: 65000, // GH₵ 650.00
        active: true,
      },
    });
    testService2Id = s2.id;

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
          email: `reception.${uniqueSuffix}@auraspa.local`,
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

  describe("1. Exact Payments Ledger Reconciliation", () => {
    it("report totals reconcile exactly with payments ledger and completed refunds to the exact pesewa", async () => {
      const staff = await createIsolatedStaff("Reconcile Stylist");
      const customer = await createTestCustomer("Reconcile Customer");

      // Set up a distinct test window in the future so other seed data doesn't pollute this test block
      const testDate = new Date("2029-06-15T10:00:00Z");
      const startDate = new Date("2029-06-15T00:00:00Z");
      const endDate = new Date("2029-06-15T23:59:59.999Z");

      // Booking 1: Total 50,000, Paid 50,000 via CARD. Refund 10,000.
      const b1 = await prisma.booking.create({
        data: {
          reference: `REC-B1-${Date.now().toString().slice(-6)}`,
          status: BookingStatus.COMPLETED,
          source: BookingSource.WEB,
          startUtc: new Date("2029-06-15T10:00:00Z"),
          endUtc: new Date("2029-06-15T11:30:00Z"),
          staffId: staff.id,
          customerId: customer.id,
          subtotalPesewas: 50000,
          totalPesewas: 50000,
          amountPaidPesewas: 40000, // 50000 - 10000
          manageTokenHash: crypto.randomBytes(32).toString("hex"),
          items: {
            create: [
              { serviceId: testService1Id, pricePesewas: 50000, durationMin: 90 },
            ],
          },
        },
      });

      const p1 = await prisma.payment.create({
        data: {
          bookingId: b1.id,
          reference: `PAY-REC-1-${Date.now()}`,
          amountPesewas: 50000,
          status: PaymentStatus.PARTIALLY_REFUNDED,
          channel: "CARD",
          paidAt: testDate,
        },
      });

      await prisma.refund.create({
        data: {
          paymentId: p1.id,
          amountPesewas: 10000,
          reason: "Customer requested partial refund",
          status: "COMPLETED",
          createdAt: testDate,
        },
      });

      // Booking 2: Total 35,000, Paid 35,000 via MOBILE_MONEY. No refunds.
      const b2 = await prisma.booking.create({
        data: {
          reference: `REC-B2-${Date.now().toString().slice(-6)}`,
          status: BookingStatus.CONFIRMED,
          source: BookingSource.WEB,
          startUtc: new Date("2029-06-15T12:00:00Z"),
          endUtc: new Date("2029-06-15T13:30:00Z"),
          staffId: staff.id,
          customerId: customer.id,
          subtotalPesewas: 35000,
          totalPesewas: 35000,
          amountPaidPesewas: 35000,
          manageTokenHash: crypto.randomBytes(32).toString("hex"),
          items: {
            create: [
              { serviceId: testService1Id, pricePesewas: 35000, durationMin: 90 },
            ],
          },
        },
      });

      await prisma.payment.create({
        data: {
          bookingId: b2.id,
          reference: `PAY-REC-2-${Date.now()}`,
          amountPesewas: 35000,
          status: PaymentStatus.PAID,
          channel: "MOBILE_MONEY",
          paidAt: testDate,
        },
      });

      // Booking 3: Total 25,000, Paid 25,000 via CASH. Fully refunded 25,000.
      const b3 = await prisma.booking.create({
        data: {
          reference: `REC-B3-${Date.now().toString().slice(-6)}`,
          status: BookingStatus.CANCELLED,
          source: BookingSource.POS,
          startUtc: new Date("2029-06-15T14:00:00Z"),
          endUtc: new Date("2029-06-15T15:00:00Z"),
          staffId: staff.id,
          customerId: customer.id,
          subtotalPesewas: 25000,
          totalPesewas: 25000,
          amountPaidPesewas: 0,
          manageTokenHash: crypto.randomBytes(32).toString("hex"),
          items: {
            create: [
              { serviceId: testService2Id, pricePesewas: 25000, durationMin: 60 },
            ],
          },
        },
      });

      const p3 = await prisma.payment.create({
        data: {
          bookingId: b3.id,
          reference: `PAY-REC-3-${Date.now()}`,
          amountPesewas: 25000,
          status: PaymentStatus.REFUNDED,
          channel: "CASH",
          paidAt: testDate,
        },
      });

      await prisma.refund.create({
        data: {
          paymentId: p3.id,
          amountPesewas: 25000,
          reason: "Full cash cancellation",
          status: "COMPLETED",
          createdAt: testDate,
        },
      });

      // Expected Totals:
      // Gross Payments = 50,000 (Card) + 35,000 (Momo) + 25,000 (Cash) = 110,000 pesewas
      // Total Refunds = 10,000 + 25,000 = 35,000 pesewas
      // Net Revenue = 110,000 - 35,000 = 75,000 pesewas

      const report = await generateComprehensiveReport({
        startDate,
        endDate,
        compare: false,
      });

      const summary = report.current.summary;

      // 1. Exact ledger reconciliation assertions
      expect(summary.grossRevenuePesewas).toBe(110000);
      expect(summary.refundsPesewas).toBe(35000);
      expect(summary.netRevenuePesewas).toBe(75000);
      expect(summary.grossRevenuePesewas - summary.refundsPesewas).toBe(summary.netRevenuePesewas);

      // 2. Sum of Day breakdown matches net revenue exactly
      const sumDayNet = report.current.revenueByDay.reduce((acc, d) => acc + d.netPesewas, 0);
      expect(sumDayNet).toBe(75000);

      // 3. Sum of Payment Method channels matches net revenue exactly
      const sumChannelsNet = report.current.revenueByPaymentMethod.reduce((acc, pm) => acc + pm.netPesewas, 0);
      const sumChannelsGross = report.current.revenueByPaymentMethod.reduce((acc, pm) => acc + pm.grossPesewas, 0);
      const sumChannelsRefunds = report.current.revenueByPaymentMethod.reduce((acc, pm) => acc + pm.refundsPesewas, 0);

      expect(sumChannelsNet).toBe(75000);
      expect(sumChannelsGross).toBe(110000);
      expect(sumChannelsRefunds).toBe(35000);

      // 4. Verify each individual payment method channel net
      const cardChannel = report.current.revenueByPaymentMethod.find((pm) => pm.channel === "CARD");
      expect(cardChannel?.grossPesewas).toBe(50000);
      expect(cardChannel?.refundsPesewas).toBe(10000);
      expect(cardChannel?.netPesewas).toBe(40000);

      const momoChannel = report.current.revenueByPaymentMethod.find((pm) => pm.channel === "MOBILE_MONEY");
      expect(momoChannel?.grossPesewas).toBe(35000);
      expect(momoChannel?.refundsPesewas).toBe(0);
      expect(momoChannel?.netPesewas).toBe(35000);

      const cashChannel = report.current.revenueByPaymentMethod.find((pm) => pm.channel === "CASH");
      expect(cashChannel?.grossPesewas).toBe(25000);
      expect(cashChannel?.refundsPesewas).toBe(25000);
      expect(cashChannel?.netPesewas).toBe(0);

      // 5. Total bookings volume in period
      expect(summary.totalBookings).toBe(3);
    });
  });

  describe("2. Bookings Metrics, Cancellation and No-Show Rates", () => {
    it("computes operational rates, source breakdown, and status counts accurately", async () => {
      const staff = await createIsolatedStaff("Rates Stylist");
      const customer = await createTestCustomer("Rates Customer");

      const startDate = new Date("2029-07-01T00:00:00Z");
      const endDate = new Date("2029-07-01T23:59:59.999Z");

      // 1 Completed, 1 Cancelled, 1 No-Show, 1 Confirmed = 4 Total
      const statuses = [
        BookingStatus.COMPLETED,
        BookingStatus.CANCELLED,
        BookingStatus.NO_SHOW,
        BookingStatus.CONFIRMED,
      ];

      for (let i = 0; i < statuses.length; i++) {
        await prisma.booking.create({
          data: {
            reference: `RATE-B${i}-${Date.now().toString().slice(-6)}`,
            status: statuses[i],
            source: i % 2 === 0 ? BookingSource.WEB : BookingSource.POS,
            startUtc: new Date(`2029-07-01T${10 + i}:00:00Z`),
            endUtc: new Date(`2029-07-01T${11 + i}:00:00Z`),
            staffId: staff.id,
            customerId: customer.id,
            subtotalPesewas: 10000,
            totalPesewas: 10000,
            amountPaidPesewas: 10000,
            manageTokenHash: crypto.randomBytes(32).toString("hex"),
            items: {
              create: [
                { serviceId: testService1Id, pricePesewas: 10000, durationMin: 60 },
              ],
            },
          },
        });
      }

      const report = await generateComprehensiveReport({
        startDate,
        endDate,
      });

      const metrics = report.current.bookings;
      expect(metrics.totalBookings).toBe(4);
      expect(metrics.completedBookings).toBe(1);
      expect(metrics.cancelledBookings).toBe(1);
      expect(metrics.noShowBookings).toBe(1);

      // 1 cancelled out of 4 = 25.0%
      expect(metrics.cancellationRate).toBe(25);
      // 1 no-show out of 4 = 25.0%
      expect(metrics.noShowRate).toBe(25);

      // Sources
      const webSource = metrics.bySource.find((s) => s.source === "WEB");
      const posSource = metrics.bySource.find((s) => s.source === "POS");
      expect(webSource?.count).toBe(2);
      expect(posSource?.count).toBe(2);
      expect(webSource?.percentage).toBe(50);
      expect(posSource?.percentage).toBe(50);
    });
  });

  describe("3. Staff Utilisation Calculation", () => {
    it("computes booked appointment minutes against scheduled shift minutes", async () => {
      const staff = await createIsolatedStaff("Utilisation Stylist");
      const customer = await createTestCustomer("Utilisation Customer");

      // Configure a scheduled shift on Monday: 9:00 - 17:00 (8 hours = 480 minutes)
      // 2029-08-06 is a Monday (weekday 1)
      await prisma.staffSchedule.create({
        data: {
          staffId: staff.id,
          weekday: 1, // Monday
          startTime: "09:00",
          endTime: "17:00",
          breakStart: "13:00",
          breakEnd: "14:00", // 1 hour break -> Net shift = 7 hours = 420 minutes
          active: true,
          isDayOff: false,
        },
      });

      const startDate = new Date("2029-08-06T00:00:00Z");
      const endDate = new Date("2029-08-06T23:59:59.999Z");

      // Create a 2-hour appointment (120 minutes)
      await prisma.booking.create({
        data: {
          reference: `UTIL-B1-${Date.now().toString().slice(-6)}`,
          status: BookingStatus.COMPLETED,
          source: BookingSource.WEB,
          startUtc: new Date("2029-08-06T10:00:00Z"),
          endUtc: new Date("2029-08-06T12:00:00Z"),
          staffId: staff.id,
          customerId: customer.id,
          subtotalPesewas: 35000,
          totalPesewas: 35000,
          amountPaidPesewas: 35000,
          manageTokenHash: crypto.randomBytes(32).toString("hex"),
          items: {
            create: [
              { serviceId: testService1Id, pricePesewas: 35000, durationMin: 120 },
            ],
          },
        },
      });

      const report = await generateComprehensiveReport({
        startDate,
        endDate,
      });

      const staffU = report.current.staffUtilisation.find((u) => u.staffId === staff.id);
      expect(staffU).toBeDefined();
      expect(staffU?.bookedMinutes).toBe(120);
      expect(staffU?.availableMinutes).toBe(420); // 7 hours
      // 120 / 420 = 28.57% -> Math.round is 29%
      expect(staffU?.utilisationRate).toBe(29);
      expect(staffU?.appointmentCount).toBe(1);
    });
  });

  describe("4. Previous Period Comparison and Deltas", () => {
    it("computes accurate comparison percentages against immediately preceding window", async () => {
      const staff = await createIsolatedStaff("Compare Stylist");
      const customer = await createTestCustomer("Compare Customer");

      // Period 1 (Previous): 2029-09-01 to 2029-09-02 (2 days)
      // Revenue: 40,000 pesewas
      const prevDate = new Date("2029-09-01T10:00:00Z");
      const prevBooking = await prisma.booking.create({
        data: {
          reference: `PREV-B1-${Date.now().toString().slice(-6)}`,
          status: BookingStatus.COMPLETED,
          source: BookingSource.WEB,
          startUtc: prevDate,
          endUtc: new Date("2029-09-01T11:00:00Z"),
          staffId: staff.id,
          customerId: customer.id,
          subtotalPesewas: 40000,
          totalPesewas: 40000,
          amountPaidPesewas: 40000,
          manageTokenHash: crypto.randomBytes(32).toString("hex"),
        },
      });

      await prisma.payment.create({
        data: {
          bookingId: prevBooking.id,
          reference: `PAY-PREV-${Date.now()}`,
          amountPesewas: 40000,
          status: PaymentStatus.PAID,
          channel: "CARD",
          paidAt: prevDate,
        },
      });

      // Period 2 (Current): 2029-09-03 to 2029-09-04 (2 days)
      // Revenue: 80,000 pesewas (+100% growth)
      const currDate = new Date("2029-09-03T10:00:00Z");
      const currBooking = await prisma.booking.create({
        data: {
          reference: `CURR-B1-${Date.now().toString().slice(-6)}`,
          status: BookingStatus.COMPLETED,
          source: BookingSource.WEB,
          startUtc: currDate,
          endUtc: new Date("2029-09-03T11:00:00Z"),
          staffId: staff.id,
          customerId: customer.id,
          subtotalPesewas: 80000,
          totalPesewas: 80000,
          amountPaidPesewas: 80000,
          manageTokenHash: crypto.randomBytes(32).toString("hex"),
        },
      });

      await prisma.payment.create({
        data: {
          bookingId: currBooking.id,
          reference: `PAY-CURR-${Date.now()}`,
          amountPesewas: 80000,
          status: PaymentStatus.PAID,
          channel: "CARD",
          paidAt: currDate,
        },
      });

      const report = await generateComprehensiveReport({
        startDate: new Date("2029-09-03T00:00:00Z"),
        endDate: new Date("2029-09-04T23:59:59.999Z"),
        compare: true,
      });

      expect(report.previous).toBeDefined();
      expect(report.deltas).toBeDefined();

      expect(report.current.summary.netRevenuePesewas).toBe(80000);
      expect(report.previous?.summary.netRevenuePesewas).toBe(40000);
      // (80000 - 40000) / 40000 = +100%
      expect(report.deltas?.netRevenuePercent).toBe(100);
    });
  });

  describe("5. Staff Commission Report", () => {
    it("computes commissions when enabled in settings", async () => {
      const staff = await createIsolatedStaff("Commission Stylist");
      const customer = await createTestCustomer("Commission Customer");

      // Temporarily set commission settings
      await prisma.setting.upsert({
        where: { key: "enable_staff_commissions" },
        update: { value: "true" },
        create: { key: "enable_staff_commissions", value: "true" },
      });
      await prisma.setting.upsert({
        where: { key: "staff_commission_percentage" },
        update: { value: "10" }, // 10%
        create: { key: "staff_commission_percentage", value: "10" },
      });

      const testDate = new Date("2029-10-10T10:00:00Z");
      await prisma.booking.create({
        data: {
          reference: `COMM-B1-${Date.now().toString().slice(-6)}`,
          status: BookingStatus.COMPLETED,
          source: BookingSource.WEB,
          startUtc: testDate,
          endUtc: new Date("2029-10-10T12:00:00Z"),
          staffId: staff.id,
          customerId: customer.id,
          subtotalPesewas: 50000, // GH₵ 500.00
          totalPesewas: 50000,
          amountPaidPesewas: 50000,
          manageTokenHash: crypto.randomBytes(32).toString("hex"),
        },
      });

      const report = await generateComprehensiveReport({
        startDate: new Date("2029-10-10T00:00:00Z"),
        endDate: new Date("2029-10-10T23:59:59.999Z"),
      });

      expect(report.current.commissions.enabled).toBe(true);
      expect(report.current.commissions.defaultCommissionRatePercent).toBe(10);

      const staffComm = report.current.commissions.items.find((i) => i.staffId === staff.id);
      expect(staffComm).toBeDefined();
      expect(staffComm?.completedRevenuePesewas).toBe(50000);
      // 10% of 50,000 = 5,000 pesewas
      expect(staffComm?.commissionPesewas).toBe(5000);
    });
  });

  describe("6. CSV Export & Permission Gating", () => {
    it("generates structured multi-section CSV report", async () => {
      const report = await generateComprehensiveReport({
        startDate: new Date("2026-01-01T00:00:00Z"),
        endDate: new Date("2026-01-31T23:59:59.999Z"),
      });

      const csv = generateComprehensiveCsv(report);
      expect(csv).toContain('"STUDIO BUSINESS REPORT"');
      expect(csv).toContain('"EXECUTIVE SUMMARY"');
      expect(csv).toContain('"REVENUE BY DAY"');
      expect(csv).toContain('"REVENUE BY PAYMENT METHOD"');
      expect(csv).toContain('"REVENUE BY SERVICE"');
      expect(csv).toContain('"STAFF PERFORMANCE & UTILISATION"');
    });

    it("enforces REPORTS_EXPORT permission gating", () => {
      // Owner has REPORTS_EXPORT
      expect(() => requirePermission(ownerUser, PERMISSION_KEYS.REPORTS_EXPORT)).not.toThrow();

      // Manager does not have REPORTS_EXPORT by default
      expect(() => requirePermission(managerUser, PERMISSION_KEYS.REPORTS_EXPORT)).toThrow(
        /Insufficient permissions/
      );

      // Staff does not have REPORTS_VIEW or REPORTS_EXPORT
      expect(() => requirePermission(staffUser, PERMISSION_KEYS.REPORTS_VIEW)).toThrow(
        /Insufficient permissions/
      );
    });
  });

  describe("7. Owner-Only Audit Log Viewer & Append-Only Storage", () => {
    it("records audit logs, computes before/after diffs, and filters records", async () => {
      // Append an audit log
      const auditLog = await logAuditEvent({
        userId: ownerUser.userId,
        action: "booking.rescheduled",
        entityType: "Booking",
        entityId: "test-booking-id-123",
        oldValues: {
          startUtc: "2026-10-27T10:00:00Z",
          notes: "Original appointment",
        },
        newValues: {
          startUtc: "2026-10-28T14:00:00Z",
          notes: "Rescheduled by owner request",
        },
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0 Test Suite",
      });

      expect(auditLog.id).toBeDefined();
      expect(auditLog.action).toBe("booking.rescheduled");

      // Verify diff computation
      const diffs = computeAuditDiff(
        { startUtc: "2026-10-27T10:00:00Z", notes: "Original appointment" },
        { startUtc: "2026-10-28T14:00:00Z", notes: "Rescheduled by owner request" }
      );
      expect(diffs.length).toBe(2);
      const startDiff = diffs.find((d) => d.field === "startUtc");
      expect(startDiff?.oldValue).toBe("2026-10-27T10:00:00Z");
      expect(startDiff?.newValue).toBe("2026-10-28T14:00:00Z");

      // Query audit logs with filter
      const result = await getAuditLogs({
        action: "booking.rescheduled",
        entityType: "Booking",
      });

      expect(result.logs.length).toBeGreaterThanOrEqual(1);
      const found = result.logs.find((l) => l.id === auditLog.id);
      expect(found).toBeDefined();
      expect(found?.entityId).toBe("test-booking-id-123");
      expect(found?.diffs.length).toBe(2);
    });

    it("enforces AUDIT_VIEW is strictly restricted to Owner role", () => {
      // Owner has AUDIT_VIEW
      expect(() => requirePermission(ownerUser, PERMISSION_KEYS.AUDIT_VIEW)).not.toThrow();

      // Manager is denied AUDIT_VIEW
      expect(() => requirePermission(managerUser, PERMISSION_KEYS.AUDIT_VIEW)).toThrow(
        /Insufficient permissions/
      );

      // Staff is denied AUDIT_VIEW
      expect(() => requirePermission(staffUser, PERMISSION_KEYS.AUDIT_VIEW)).toThrow(
        /Insufficient permissions/
      );
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });
});

