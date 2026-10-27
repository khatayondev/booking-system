import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/db";
import { can, PERMISSION_KEYS, ROLES } from "@/lib/rbac";
import { assertBookingTransition, canTransitionBooking } from "@/lib/payments/state-machine";
import { rescheduleBooking } from "@/lib/staff-schedule";
import crypto from "crypto";

describe("Prompt 13: Bookings Management Module", () => {
  let ownerUserId: string;
  let staffUserId: string;
  let testStaffId1: string;
  let testStaffId2: string;
  let testCustomerId: string;
  let testServiceId: string;

  beforeAll(async () => {
    // 1. Fetch Owner and Staff users
    const owner = await prisma.user.findFirst({
      where: { role: { name: ROLES.OWNER_ADMIN } },
    });
    if (owner) ownerUserId = owner.id;

    // 2. Fetch or create staff members
    const staffMembers = await prisma.staff.findMany({
      where: { deletedAt: null },
      take: 2,
    });

    if (staffMembers.length >= 2) {
      testStaffId1 = staffMembers[0].id;
      testStaffId2 = staffMembers[1].id;
    } else {
      const s1 = await prisma.staff.create({
        data: { name: "Test Stylist 1", specialties: ["Bridal Glam"] },
      });
      const s2 = await prisma.staff.create({
        data: { name: "Test Stylist 2", specialties: ["Lashes"] },
      });
      testStaffId1 = s1.id;
      testStaffId2 = s2.id;
    }

    // 3. Find or create staff user linked to testStaffId1
    let staffUser = await prisma.user.findFirst({
      where: { staff: { id: testStaffId1 } },
    });
    if (!staffUser) {
      const staffRole = await prisma.role.findUnique({
        where: { name: ROLES.STAFF_RECEPTIONIST },
      });
      staffUser = await prisma.user.create({
        data: {
          email: `staff-test-${Date.now()}@aurastudio.gh`,
          name: "Test Staff User",
          passwordHash: "dummy",
          roleId: staffRole!.id,
        },
      });
      await prisma.staff.update({
        where: { id: testStaffId1 },
        data: { userId: staffUser.id },
      });
    }
    staffUserId = staffUser.id;

    // 4. Customer & Service
    const customer = await prisma.customer.upsert({
      where: { phone: "+233245550099" },
      update: {},
      create: { name: "Management Test Client", phone: "+233245550099" },
    });
    testCustomerId = customer.id;

    const service = await prisma.service.findFirst({
      where: { active: true, deletedAt: null },
    });
    testServiceId = service!.id;

    // Clean up any stale management test bookings
    await prisma.bookingItem.deleteMany({
      where: { booking: { reference: { startsWith: "BK-MGT-" } } },
    }).catch(() => {});
    await prisma.booking.deleteMany({
      where: { reference: { startsWith: "BK-MGT-" } },
    }).catch(() => {});

    // 5. Create a sample booking with unique future time
    const uniqueOffset = 500000000 + Math.floor(Math.random() * 500000000);
    await prisma.booking.create({
      data: {
        reference: `BK-MGT-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`,
        status: "CONFIRMED",
        source: "WEB",
        startUtc: new Date(Date.now() + uniqueOffset),
        endUtc: new Date(Date.now() + uniqueOffset + 3600000),
        staffId: testStaffId1,
        customerId: testCustomerId,
        subtotalPesewas: 35000,
        totalPesewas: 35000,
        depositRequiredPesewas: 17500,
        amountPaidPesewas: 17500,
        manageTokenHash: crypto.randomBytes(32).toString("hex"),
        items: {
          create: {
            serviceId: testServiceId,
            pricePesewas: 35000,
            durationMin: 60,
          },
        },
      },
    });
  });

  describe("1. State Machine Transitions", () => {
    it("allows legal lifecycle: CONFIRMED -> CHECKED_IN -> COMPLETED", () => {
      expect(canTransitionBooking("CONFIRMED", "CHECKED_IN")).toBe(true);
      expect(canTransitionBooking("CHECKED_IN", "COMPLETED")).toBe(true);
      expect(() => assertBookingTransition("CONFIRMED", "CHECKED_IN")).not.toThrow();
      expect(() => assertBookingTransition("CHECKED_IN", "COMPLETED")).not.toThrow();
    });

    it("allows cancellation from CONFIRMED with reason", () => {
      expect(canTransitionBooking("CONFIRMED", "CANCELLED")).toBe(true);
      expect(() => assertBookingTransition("CONFIRMED", "CANCELLED")).not.toThrow();
    });

    it("allows marking NO_SHOW from CONFIRMED or CHECKED_IN", () => {
      expect(canTransitionBooking("CONFIRMED", "NO_SHOW")).toBe(true);
      expect(canTransitionBooking("CHECKED_IN", "NO_SHOW")).toBe(true);
    });

    it("rejects illegal transitions (e.g. COMPLETED -> CANCELLED)", () => {
      expect(canTransitionBooking("COMPLETED", "CANCELLED")).toBe(false);
      expect(() => assertBookingTransition("COMPLETED", "CANCELLED")).toThrow(/Illegal booking transition/);
    });

    it("rejects transition from CANCELLED to CONFIRMED", () => {
      expect(canTransitionBooking("CANCELLED", "CONFIRMED")).toBe(false);
      expect(() => assertBookingTransition("CANCELLED", "CONFIRMED")).toThrow();
    });
  });

  describe("2. Role-Scoped Visibility", () => {
    it("Owner has BOOKINGS_VIEW_ALL and can view bookings across all staff", async () => {
      const ownerSession = {
        sessionId: "mock-owner-sess",
        userId: ownerUserId,
        email: "owner@aurastudio.gh",
        name: "Owner",
        role: ROLES.OWNER_ADMIN,
        permissions: [PERMISSION_KEYS.BOOKINGS_VIEW_ALL, PERMISSION_KEYS.BOOKINGS_EDIT],
        mustChangePassword: false,
      };

      expect(can(ownerSession, PERMISSION_KEYS.BOOKINGS_VIEW_ALL)).toBe(true);
      expect(can(ownerSession, PERMISSION_KEYS.BOOKINGS_VIEW_OWN, { staffId: testStaffId2 })).toBe(true);
    });

    it("Staff role without BOOKINGS_VIEW_ALL is restricted to own bookings", async () => {
      const staffSession = {
        sessionId: "mock-staff-sess",
        userId: staffUserId,
        email: "staff@aurastudio.gh",
        name: "Staff",
        role: ROLES.STAFF_RECEPTIONIST,
        staffId: testStaffId1,
        permissions: [PERMISSION_KEYS.BOOKINGS_VIEW_OWN],
        mustChangePassword: false,
      };

      // Can view own assigned staffId
      expect(can(staffSession, PERMISSION_KEYS.BOOKINGS_VIEW_OWN, { staffId: testStaffId1 })).toBe(true);
      // Cannot view another staff member's bookings
      expect(can(staffSession, PERMISSION_KEYS.BOOKINGS_VIEW_OWN, { staffId: testStaffId2 })).toBe(false);
      expect(can(staffSession, PERMISSION_KEYS.BOOKINGS_VIEW_ALL)).toBe(false);
    });
  });

  describe("3. Rescheduling Conflict Verification", () => {
    it("rejects reschedule when target staff already has an overlapping active booking", async () => {
      const baseTime = Date.now() + 20000000;
      const start1 = new Date(baseTime);
      const end1 = new Date(baseTime + 3600000);

      // Create Booking A for Staff 1
      const bookingA = await prisma.booking.create({
        data: {
          reference: `BK-CONF-A-${Date.now().toString().slice(-4)}`,
          status: "CONFIRMED",
          source: "WEB",
          startUtc: start1,
          endUtc: end1,
          staffId: testStaffId1,
          customerId: testCustomerId,
          subtotalPesewas: 30000,
          totalPesewas: 30000,
          manageTokenHash: crypto.randomBytes(32).toString("hex"),
        },
      });

      // Create Booking B for Staff 2 at a different time
      const bookingB = await prisma.booking.create({
        data: {
          reference: `BK-CONF-B-${Date.now().toString().slice(-4)}`,
          status: "CONFIRMED",
          source: "WEB",
          startUtc: new Date(baseTime + 10000000),
          endUtc: new Date(baseTime + 13600000),
          staffId: testStaffId2,
          customerId: testCustomerId,
          subtotalPesewas: 30000,
          totalPesewas: 30000,
          manageTokenHash: crypto.randomBytes(32).toString("hex"),
        },
      });

      // Attempt to reschedule Booking B to Staff 1 at the EXACT same time as Booking A
      await expect(
        rescheduleBooking(bookingB.id, start1, end1, testStaffId1, {
          id: ownerUserId,
          role: "OWNER_ADMIN",
          name: "Owner",
        })
      ).rejects.toThrow(/conflicting booking/i);

      // Clean up test records
      await prisma.booking.deleteMany({
        where: { id: { in: [bookingA.id, bookingB.id] } },
      });
    });
  });

  describe("4. Cancellation Flow & Audit Trail", () => {
    it("transitions booking to CANCELLED and writes audit log with reason", async () => {
      const cancelTarget = await prisma.booking.create({
        data: {
          reference: `BK-CANCEL-${Date.now().toString().slice(-4)}`,
          status: "CONFIRMED",
          source: "WEB",
          startUtc: new Date(Date.now() + 50000000),
          endUtc: new Date(Date.now() + 53600000),
          staffId: testStaffId1,
          customerId: testCustomerId,
          subtotalPesewas: 25000,
          totalPesewas: 25000,
          manageTokenHash: crypto.randomBytes(32).toString("hex"),
        },
      });

      const reason = "Client requested reschedule due to flight delay";

      // Execute cancellation
      assertBookingTransition(cancelTarget.status, "CANCELLED");

      await prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: cancelTarget.id },
          data: {
            status: "CANCELLED",
            notes: `[CANCELLED] ${reason}`,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "BOOKING_STATUS_CANCELLED",
            entityType: "BOOKING",
            entityId: cancelTarget.id,
            oldValues: { status: cancelTarget.status },
            newValues: { status: "CANCELLED", reason },
          },
        });
      });

      // Verify DB record
      const updated = await prisma.booking.findUnique({
        where: { id: cancelTarget.id },
      });
      expect(updated?.status).toBe("CANCELLED");
      expect(updated?.notes).toContain(reason);

      // Verify audit log entry
      const auditEntry = await prisma.auditLog.findFirst({
        where: {
          entityType: "BOOKING",
          entityId: cancelTarget.id,
          action: "BOOKING_STATUS_CANCELLED",
        },
      });
      expect(auditEntry).toBeDefined();
      expect((auditEntry?.newValues as { reason: string })?.reason).toBe(reason);

      // Clean up
      await prisma.auditLog.deleteMany({ where: { entityId: cancelTarget.id } });
      await prisma.booking.delete({ where: { id: cancelTarget.id } });
    });
  });
});
