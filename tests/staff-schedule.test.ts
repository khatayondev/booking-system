import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  timeToMinutes,
  validateShiftsDoNotOverlap,
  findConflictingBookings,
  findEligibleStaffForBooking,
  reassignBooking,
  rescheduleBooking,
  bulkBlockHoliday,
  ShiftInput,
} from "@/lib/staff-schedule";
import { ROLES } from "@/lib/rbac";
import { BookingStatus, DepositType } from "@prisma/client";

describe("Prompt 8: Staff & Schedules Unit Tests", () => {
  describe("Shift Overlap & Break Integrity Validation", () => {
    it("converts HH:MM time strings to minutes correctly", () => {
      expect(timeToMinutes("00:00")).toBe(0);
      expect(timeToMinutes("09:30")).toBe(570);
      expect(timeToMinutes("18:00")).toBe(1080);
      expect(timeToMinutes("23:59")).toBe(1439);
      expect(() => timeToMinutes("24:00")).toThrow();
      expect(() => timeToMinutes("invalid")).toThrow();
    });

    it("accepts valid multiple non-overlapping shifts on the same day", () => {
      const validShifts: ShiftInput[] = [
        // Monday: Morning Shift 09:00 - 13:00 with 11:00-11:30 break
        {
          weekday: 1,
          startTime: "09:00",
          endTime: "13:00",
          breakStart: "11:00",
          breakEnd: "11:30",
          label: "Morning Shift",
        },
        // Monday: Afternoon Shift 14:00 - 18:00
        {
          weekday: 1,
          startTime: "14:00",
          endTime: "18:00",
          label: "Afternoon Shift",
        },
        // Tuesday: Standard Shift
        {
          weekday: 2,
          startTime: "09:00",
          endTime: "17:00",
        },
      ];

      expect(() => validateShiftsDoNotOverlap(validShifts)).not.toThrow();
    });

    it("rejects shifts where start time is later than or equal to end time", () => {
      const invalidShifts: ShiftInput[] = [
        {
          weekday: 1,
          startTime: "17:00",
          endTime: "09:00",
        },
      ];

      expect(() => validateShiftsDoNotOverlap(invalidShifts)).toThrow(/earlier than end time/i);
    });

    it("rejects break that falls outside the shift window", () => {
      const shiftWithOutsideBreak: ShiftInput[] = [
        {
          weekday: 1,
          startTime: "09:00",
          endTime: "13:00",
          breakStart: "13:30",
          breakEnd: "14:00",
        },
      ];

      expect(() => validateShiftsDoNotOverlap(shiftWithOutsideBreak)).toThrow(/must fall entirely within/i);
    });

    it("rejects overlapping shifts on the same weekday (Acceptance Criteria)", () => {
      const overlappingShifts: ShiftInput[] = [
        {
          weekday: 1,
          startTime: "09:00",
          endTime: "14:00",
          label: "Shift A",
        },
        {
          weekday: 1,
          startTime: "13:00", // Overlaps with Shift A (13:00 - 14:00)
          endTime: "18:00",
          label: "Shift B",
        },
      ];

      expect(() => validateShiftsDoNotOverlap(overlappingShifts)).toThrowError();

      try {
        validateShiftsDoNotOverlap(overlappingShifts);
      } catch (err: unknown) {
        const error = err as { code: string; message: string };
        expect(error.code).toBe("OVERLAPPING_SHIFTS");
        expect(error.message).toContain("Overlapping shifts detected");
      }
    });

    it("allows shifts that share an exact boundary (e.g. 09:00-13:00 and 13:00-17:00)", () => {
      const boundaryShifts: ShiftInput[] = [
        {
          weekday: 3,
          startTime: "09:00",
          endTime: "13:00",
        },
        {
          weekday: 3,
          startTime: "13:00",
          endTime: "17:00",
        },
      ];

      expect(() => validateShiftsDoNotOverlap(boundaryShifts)).not.toThrow();
    });

    it("ignores shifts on different weekdays or marked as day off", () => {
      const multiDayShifts: ShiftInput[] = [
        {
          weekday: 1, // Monday
          startTime: "09:00",
          endTime: "17:00",
        },
        {
          weekday: 2, // Tuesday (same hours, different day)
          startTime: "09:00",
          endTime: "17:00",
        },
        {
          weekday: 1,
          startTime: "09:00",
          endTime: "17:00",
          isDayOff: true, // Marked day off, ignored in overlap check
        },
      ];

      expect(() => validateShiftsDoNotOverlap(multiDayShifts)).not.toThrow();
    });
  });

  describe("Leave & Blocked Time Conflict Detection (Acceptance Criteria)", () => {
    let testStaffId: string;
    let alternativeStaffId: string;
    let testServiceId: string;
    let testCustomerId: string;
    let testBookingId: string;

    const baseDate = new Date("2026-11-10T10:00:00.000Z"); // Tuesday 10:00 UTC
    const bookingEnd = new Date("2026-11-10T11:30:00.000Z"); // Tuesday 11:30 UTC

    beforeEach(async () => {
      // Find or seed a test customer
      let customer = await prisma.customer.findFirst();
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            name: "Kofi Mensah",
            phone: "+233249998877",
          },
        });
      }
      testCustomerId = customer.id;

      // Find or seed service
      let service = await prisma.service.findFirst({ where: { active: true } });
      if (!service) {
        const cat = await prisma.serviceCategory.create({
          data: { name: "Test Cat", slug: "test-cat" },
        });
        service = await prisma.service.create({
          data: {
            name: "Test Glam Service",
            categoryId: cat.id,
            durationMin: 90,
            pricePesewas: 25000,
            depositType: DepositType.PERCENTAGE,
            depositValue: 50,
          },
        });
      }
      testServiceId = service.id;

      // Create primary test staff
      const staffA = await prisma.staff.create({
        data: {
          name: "Test Staff Specialist A",
          phone: "+233541119999",
          bio: "Specialist A",
          specialties: ["Bridal Makeup", "Lashes"],
        },
      });
      testStaffId = staffA.id;

      // Assign service to staff A
      await prisma.staffService.create({
        data: { staffId: staffA.id, serviceId: testServiceId },
      });

      // Create alternative test staff
      const staffB = await prisma.staff.create({
        data: {
          name: "Test Staff Specialist B",
          phone: "+233542229999",
          bio: "Specialist B",
          specialties: ["Bridal Makeup", "Lashes"],
        },
      });
      alternativeStaffId = staffB.id;

      // Assign service and Tuesday schedule to staff B (09:00 to 18:00)
      await prisma.staffService.create({
        data: { staffId: staffB.id, serviceId: testServiceId },
      });
      await prisma.staffSchedule.create({
        data: {
          staffId: staffB.id,
          weekday: 2, // Tuesday
          startTime: "09:00",
          endTime: "18:00",
        },
      });

      // Create an active confirmed booking for Staff A at baseDate
      const booking = await prisma.booking.create({
        data: {
          reference: `TEST-CONF-${Date.now()}`,
          status: BookingStatus.CONFIRMED,
          startUtc: baseDate,
          endUtc: bookingEnd,
          staffId: testStaffId,
          customerId: testCustomerId,
          subtotalPesewas: 25000,
          totalPesewas: 25000,
          manageTokenHash: `token-hash-${Date.now()}`,
          items: {
            create: [
              {
                serviceId: testServiceId,
                pricePesewas: 25000,
                durationMin: 90,
              },
            ],
          },
        },
      });
      testBookingId = booking.id;
    });

    it("detects existing booking conflict when requesting leave overlapping the appointment", async () => {
      // Propose leave from 08:00 to 14:00 on the same Tuesday
      const leaveStart = new Date("2026-11-10T08:00:00.000Z");
      const leaveEnd = new Date("2026-11-10T14:00:00.000Z");

      const conflicts = await findConflictingBookings(testStaffId, leaveStart, leaveEnd);

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].id).toBe(testBookingId);
      expect(conflicts[0].customerName).toBeDefined();
      expect(conflicts[0].services.length).toBeGreaterThan(0);
    });

    it("detects conflict when proposed blocked time partially overlaps appointment", async () => {
      // Partial overlap: 11:00 to 12:00 (appointment is 10:00 to 11:30)
      const blockStart = new Date("2026-11-10T11:00:00.000Z");
      const blockEnd = new Date("2026-11-10T12:00:00.000Z");

      const conflicts = await findConflictingBookings(testStaffId, blockStart, blockEnd);

      expect(conflicts.length).toBe(1);
      expect(conflicts[0].id).toBe(testBookingId);
    });

    it("returns zero conflicts when leave is on a completely different day or non-overlapping time", async () => {
      // Non-overlapping time on Wednesday
      const leaveStart = new Date("2026-11-11T08:00:00.000Z");
      const leaveEnd = new Date("2026-11-11T14:00:00.000Z");

      const conflicts = await findConflictingBookings(testStaffId, leaveStart, leaveEnd);
      expect(conflicts.length).toBe(0);
    });

    it("finds eligible alternative staff to reassign conflicting booking", async () => {
      const candidates = await findEligibleStaffForBooking(testBookingId);

      expect(candidates.length).toBeGreaterThan(0);
      const matched = candidates.find((c) => c.id === alternativeStaffId);
      expect(matched).toBeDefined();
      expect(matched?.name).toBe("Test Staff Specialist B");
    });

    it("reassigns booking to alternative staff member and verifies audit trail", async () => {
      const auditUser = {
        id: "owner-test-id",
        role: ROLES.OWNER_ADMIN,
        name: "Akosua Addo",
      };

      const result = await reassignBooking(testBookingId, alternativeStaffId, auditUser);
      expect(result.success).toBe(true);
      expect(result.newStaffId).toBe(alternativeStaffId);

      // Verify booking updated in DB
      const updated = await prisma.booking.findUnique({ where: { id: testBookingId } });
      expect(updated?.staffId).toBe(alternativeStaffId);

      // Staff A should now have 0 conflicts for that window!
      const conflicts = await findConflictingBookings(testStaffId, baseDate, bookingEnd);
      expect(conflicts.length).toBe(0);
    });

    it("reschedules booking to a new time slot successfully", async () => {
      const auditUser = {
        id: "owner-test-id",
        role: ROLES.OWNER_ADMIN,
        name: "Akosua Addo",
      };

      const newStart = new Date("2026-11-10T15:00:00.000Z");
      const newEnd = new Date("2026-11-10T16:30:00.000Z");

      const result = await rescheduleBooking(testBookingId, newStart, newEnd, undefined, auditUser);
      expect(result.success).toBe(true);

      const updated = await prisma.booking.findUnique({ where: { id: testBookingId } });
      expect(updated?.startUtc.toISOString()).toBe(newStart.toISOString());
      expect(updated?.endUtc.toISOString()).toBe(newEnd.toISOString());
    });

    it("bulkBlockHoliday detects conflicting bookings across staff before proceeding", async () => {
      const auditUser = {
        id: "owner-test-id",
        role: ROLES.OWNER_ADMIN,
        name: "Akosua Addo",
      };

      const holidayStart = new Date("2026-11-10T00:00:00.000Z");
      const holidayEnd = new Date("2026-11-10T23:59:59.000Z");

      // Without force, should report conflicts
      const result = await bulkBlockHoliday(
        {
          holidayName: "Ghana Founders' Day",
          startUtc: holidayStart,
          endUtc: holidayEnd,
          staffIds: [testStaffId],
          force: false,
        },
        auditUser
      );

      expect(result.success).toBe(false);
      expect(result.conflicts).toBeDefined();
      expect(result.conflicts!.length).toBeGreaterThan(0);
      expect(result.conflicts![0].staffId).toBe(testStaffId);

      // With force, creates blocked time
      const forcedResult = await bulkBlockHoliday(
        {
          holidayName: "Ghana Founders' Day",
          startUtc: holidayStart,
          endUtc: holidayEnd,
          staffIds: [testStaffId],
          force: true,
        },
        auditUser
      );

      expect(forcedResult.success).toBe(true);
      expect(forcedResult.blockedCount).toBe(1);
    });
  });
});
