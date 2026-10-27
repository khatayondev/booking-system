/**
 * Staff, Schedules and Availability Exceptions Module.
 * Provides validation for shift scheduling (guaranteeing no overlapping shifts),
 * conflict detection against active bookings for leave & blocked times,
 * reassignment / rescheduling workflows, and bulk holiday blocking.
 */

import { prisma } from "./db";
import { AppError } from "./api-response";
import { BookingStatus } from "@prisma/client";

/**
 * Converts "HH:MM" string to minutes from midnight (0 to 1439).
 */
export function timeToMinutes(time: string): number {
  const match = time.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) {
    throw new AppError(`Invalid time format "${time}". Expected HH:MM`, 400, "INVALID_TIME_FORMAT");
  }
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours * 60 + minutes;
}

export interface ShiftInput {
  id?: string;
  weekday: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  breakStart?: string | null; // "13:00"
  breakEnd?: string | null; // "14:00"
  label?: string | null; // "Morning Shift"
  isDayOff?: boolean;
  active?: boolean;
}

/**
 * Validates that shifts for a given weekday do not overlap with each other,
 * and that any breaks fall strictly within their shift boundaries.
 */
export function validateShiftsDoNotOverlap(shifts: ShiftInput[]): void {
  // Group shifts by weekday
  const byWeekday: Record<number, ShiftInput[]> = {};
  for (const shift of shifts) {
    if (shift.weekday < 0 || shift.weekday > 6) {
      throw new AppError(`Invalid weekday ${shift.weekday}. Must be between 0 (Sunday) and 6 (Saturday)`, 400, "INVALID_WEEKDAY");
    }
    if (!byWeekday[shift.weekday]) {
      byWeekday[shift.weekday] = [];
    }
    // Only active, non-day-off shifts can conflict
    if (shift.active !== false && !shift.isDayOff) {
      byWeekday[shift.weekday].push(shift);
    }
  }

  // Validate each weekday
  for (const [weekdayStr, dayShifts] of Object.entries(byWeekday)) {
    const weekday = parseInt(weekdayStr, 10);
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][weekday];

    // 1. Validate internal shift integrity and breaks
    for (const shift of dayShifts) {
      const startMin = timeToMinutes(shift.startTime);
      const endMin = timeToMinutes(shift.endTime);

      if (startMin >= endMin) {
        throw new AppError(
          `Shift start time (${shift.startTime}) must be earlier than end time (${shift.endTime}) on ${dayName}`,
          400,
          "INVALID_SHIFT_HOURS"
        );
      }

      // If break is specified, validate it sits cleanly inside the shift
      if (shift.breakStart || shift.breakEnd) {
        if (!shift.breakStart || !shift.breakEnd) {
          throw new AppError(
            `Both break start and break end must be provided if break is set on ${dayName}`,
            400,
            "INCOMPLETE_BREAK_HOURS"
          );
        }
        const breakStartMin = timeToMinutes(shift.breakStart);
        const breakEndMin = timeToMinutes(shift.breakEnd);

        if (breakStartMin >= breakEndMin) {
          throw new AppError(
            `Break start time (${shift.breakStart}) must be earlier than break end time (${shift.breakEnd}) on ${dayName}`,
            400,
            "INVALID_BREAK_HOURS"
          );
        }

        if (breakStartMin < startMin || breakEndMin > endMin) {
          throw new AppError(
            `Break (${shift.breakStart}-${shift.breakEnd}) must fall entirely within the shift window (${shift.startTime}-${shift.endTime}) on ${dayName}`,
            400,
            "BREAK_OUTSIDE_SHIFT"
          );
        }
      }
    }

    // 2. Pairwise overlap check between all shifts on this weekday
    for (let i = 0; i < dayShifts.length; i++) {
      for (let j = i + 1; j < dayShifts.length; j++) {
        const a = dayShifts[i];
        const b = dayShifts[j];

        const aStart = timeToMinutes(a.startTime);
        const aEnd = timeToMinutes(a.endTime);
        const bStart = timeToMinutes(b.startTime);
        const bEnd = timeToMinutes(b.endTime);

        // Standard interval overlap condition: [aStart, aEnd) intersects [bStart, bEnd)
        if (aStart < bEnd && bStart < aEnd) {
          throw new AppError(
            `Overlapping shifts detected on ${dayName}: Shift (${a.startTime} - ${a.endTime}) overlaps with Shift (${b.startTime} - ${b.endTime})`,
            400,
            "OVERLAPPING_SHIFTS",
            { weekday, shiftA: a, shiftB: b }
          );
        }
      }
    }
  }
}

export interface ConflictingBookingSummary {
  id: string;
  reference: string;
  status: BookingStatus;
  startUtc: Date;
  endUtc: Date;
  customerName: string;
  customerPhone: string;
  services: string[];
}

/**
 * Finds existing active bookings for a staff member that overlap with a proposed time window.
 */
export async function findConflictingBookings(
  staffId: string,
  startUtc: Date,
  endUtc: Date
): Promise<ConflictingBookingSummary[]> {
  const activeStatuses: BookingStatus[] = [
    BookingStatus.HELD,
    BookingStatus.PENDING_PAYMENT,
    BookingStatus.CONFIRMED,
    BookingStatus.CHECKED_IN,
  ];

  const bookings = await prisma.booking.findMany({
    where: {
      staffId,
      deletedAt: null,
      status: { in: activeStatuses },
      AND: [
        { startUtc: { lt: endUtc } },
        { endUtc: { gt: startUtc } },
      ],
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      items: {
        include: {
          service: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { startUtc: "asc" },
  });

  return bookings.map((b) => ({
    id: b.id,
    reference: b.reference,
    status: b.status,
    startUtc: b.startUtc,
    endUtc: b.endUtc,
    customerName: b.customer.name,
    customerPhone: b.customer.phone,
    services: b.items.map((it) => it.service.name),
  }));
}

export interface EligibleStaffCandidate {
  id: string;
  name: string;
  phone: string | null;
  photoUrl: string | null;
  specialties: string[];
}

/**
 * Finds alternative staff members eligible to take over a specific booking.
 * An eligible staff member:
 * 1. Is active and not soft-deleted.
 * 2. Is not the currently assigned staff.
 * 3. Can perform all services required by the booking (via StaffService).
 * 4. Has an active shift covering the booking time window on that day.
 * 5. Has no overlapping active bookings, time-offs, or blocked times.
 */
export async function findEligibleStaffForBooking(bookingId: string): Promise<EligibleStaffCandidate[]> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      items: { select: { serviceId: true } },
    },
  });

  if (!booking) {
    throw new AppError("Booking not found", 404, "NOT_FOUND");
  }

  const requiredServiceIds = booking.items.map((i) => i.serviceId);
  const startUtc = booking.startUtc;
  const endUtc = booking.endUtc;

  // Weekday in Africa/Accra (UTC)
  const weekday = startUtc.getUTCDay(); // 0 = Sunday, 1 = Monday...
  const bookingStartMin = startUtc.getUTCHours() * 60 + startUtc.getUTCMinutes();
  const bookingEndMin = endUtc.getUTCHours() * 60 + endUtc.getUTCMinutes();

  // Find all other active staff
  const candidates = await prisma.staff.findMany({
    where: {
      id: { not: booking.staffId },
      active: true,
      deletedAt: null,
    },
    include: {
      staffServices: { select: { serviceId: true } },
      schedules: { where: { weekday, active: true, isDayOff: false } },
      bookings: {
        where: {
          deletedAt: null,
          status: {
            in: [
              BookingStatus.HELD,
              BookingStatus.PENDING_PAYMENT,
              BookingStatus.CONFIRMED,
              BookingStatus.CHECKED_IN,
            ],
          },
          AND: [{ startUtc: { lt: endUtc } }, { endUtc: { gt: startUtc } }],
        },
      },
      timeOffs: {
        where: {
          approved: true,
          AND: [{ startUtc: { lt: endUtc } }, { endUtc: { gt: startUtc } }],
        },
      },
      blockedTimes: {
        where: {
          AND: [{ startUtc: { lt: endUtc } }, { endUtc: { gt: startUtc } }],
        },
      },
    },
  });

  const eligible: EligibleStaffCandidate[] = [];

  for (const staff of candidates) {
    // 1. Check services capability
    const staffServiceIds = new Set(staff.staffServices.map((s) => s.serviceId));
    const canPerformAll = requiredServiceIds.every((sId) => staffServiceIds.has(sId));
    if (!canPerformAll) continue;

    // 2. Check no conflicting bookings, time-offs, or blocked times
    if (staff.bookings.length > 0 || staff.timeOffs.length > 0 || staff.blockedTimes.length > 0) {
      continue;
    }

    // 3. Check shift covers the appointment window
    let coveredByShift = false;
    for (const schedule of staff.schedules) {
      const shiftStartMin = timeToMinutes(schedule.startTime);
      const shiftEndMin = timeToMinutes(schedule.endTime);

      if (bookingStartMin >= shiftStartMin && bookingEndMin <= shiftEndMin) {
        // If there's a break, make sure appointment doesn't overlap break
        if (schedule.breakStart && schedule.breakEnd) {
          const bStart = timeToMinutes(schedule.breakStart);
          const bEnd = timeToMinutes(schedule.breakEnd);
          if (bookingStartMin < bEnd && bStart < bookingEndMin) {
            continue; // Overlaps break
          }
        }
        coveredByShift = true;
        break;
      }
    }

    if (coveredByShift) {
      eligible.push({
        id: staff.id,
        name: staff.name,
        phone: staff.phone,
        photoUrl: staff.photoUrl,
        specialties: staff.specialties,
      });
    }
  }

  return eligible;
}

/**
 * Reassigns an existing booking to a new staff member.
 * Checks for concurrency and writes an audit log.
 */
export async function reassignBooking(
  bookingId: string,
  newStaffId: string,
  auditUser: { id: string; role: string; name: string }
): Promise<{ success: boolean; bookingId: string; newStaffId: string }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      staff: { select: { name: true } },
    },
  });

  if (!booking) {
    throw new AppError("Booking not found", 404, "NOT_FOUND");
  }

  const targetStaff = await prisma.staff.findUnique({
    where: { id: newStaffId },
  });

  if (!targetStaff || !targetStaff.active || targetStaff.deletedAt) {
    throw new AppError("Target staff member not found or inactive", 400, "INVALID_STAFF");
  }

  // Check target staff has no overlapping bookings
  const conflicts = await findConflictingBookings(newStaffId, booking.startUtc, booking.endUtc);
  if (conflicts.length > 0) {
    throw new AppError(
      `Target staff member ${targetStaff.name} has a conflicting booking (${conflicts[0].reference}) at this time`,
      409,
      "STAFF_UNAVAILABLE"
    );
  }

  const previousStaffName = booking.staff.name;

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: { staffId: newStaffId },
    });

    const userRecord = await tx.user.findUnique({ where: { id: auditUser.id } });

    await tx.auditLog.create({
      data: {
        userId: userRecord ? userRecord.id : null,
        action: "BOOKING_REASSIGN",
        entityType: "BOOKING",
        entityId: bookingId,
        newValues: {
          reference: booking.reference,
          previousStaffId: booking.staffId,
          previousStaffName,
          newStaffId,
          newStaffName: targetStaff.name,
          reassignedBy: auditUser.name,
          userRole: auditUser.role,
        },
      },
    });
  });

  return { success: true, bookingId, newStaffId };
}

/**
 * Reschedules an existing booking to a new start/end time.
 */
export async function rescheduleBooking(
  bookingId: string,
  newStartUtc: Date,
  newEndUtc: Date,
  newStaffId: string | undefined,
  auditUser: { id: string; role: string; name: string }
): Promise<{ success: boolean; bookingId: string }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new AppError("Booking not found", 404, "NOT_FOUND");
  }

  const targetStaffId = newStaffId || booking.staffId;

  // Check target staff conflicts at new time
  const conflicts = await findConflictingBookings(targetStaffId, newStartUtc, newEndUtc);
  const otherConflicts = conflicts.filter((c) => c.id !== bookingId);
  if (otherConflicts.length > 0) {
    throw new AppError(
      `Staff member has a conflicting booking (${otherConflicts[0].reference}) at the new requested time`,
      409,
      "STAFF_UNAVAILABLE"
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        staffId: targetStaffId,
        startUtc: newStartUtc,
        endUtc: newEndUtc,
      },
    });

    const userRecord = await tx.user.findUnique({ where: { id: auditUser.id } });

    await tx.auditLog.create({
      data: {
        userId: userRecord ? userRecord.id : null,
        action: "BOOKING_RESCHEDULE",
        entityType: "BOOKING",
        entityId: bookingId,
        newValues: {
          reference: booking.reference,
          oldStartUtc: booking.startUtc.toISOString(),
          oldEndUtc: booking.endUtc.toISOString(),
          newStartUtc: newStartUtc.toISOString(),
          newEndUtc: newEndUtc.toISOString(),
          staffId: targetStaffId,
          rescheduledBy: auditUser.name,
          userRole: auditUser.role,
        },
      },
    });
  });

  return { success: true, bookingId };
}

/**
 * Bulk blocks time for all active staff (or a selected subset) for a holiday.
 */
export async function bulkBlockHoliday(
  input: {
    holidayName: string;
    startUtc: Date;
    endUtc: Date;
    staffIds?: string[];
    force?: boolean;
  },
  auditUser: { id: string; role: string; name: string }
): Promise<{
  success: boolean;
  blockedCount: number;
  conflicts?: Array<{ staffId: string; staffName: string; bookings: ConflictingBookingSummary[] }>;
}> {
  const targetStaff = await prisma.staff.findMany({
    where: {
      deletedAt: null,
      active: true,
      ...(input.staffIds && input.staffIds.length > 0 ? { id: { in: input.staffIds } } : {}),
    },
    select: { id: true, name: true },
  });

  if (targetStaff.length === 0) {
    throw new AppError("No active staff found to apply holiday block", 400, "NO_STAFF_FOUND");
  }

  // Check conflicts across all staff if not forced
  if (!input.force) {
    const allConflicts: Array<{ staffId: string; staffName: string; bookings: ConflictingBookingSummary[] }> = [];

    for (const staff of targetStaff) {
      const conflicts = await findConflictingBookings(staff.id, input.startUtc, input.endUtc);
      if (conflicts.length > 0) {
        allConflicts.push({
          staffId: staff.id,
          staffName: staff.name,
          bookings: conflicts,
        });
      }
    }

    if (allConflicts.length > 0) {
      return {
        success: false,
        blockedCount: 0,
        conflicts: allConflicts,
      };
    }
  }

  // Create BlockedTime records for each staff member in a single transaction
  await prisma.$transaction(async (tx) => {
    for (const staff of targetStaff) {
      await tx.blockedTime.create({
        data: {
          staffId: staff.id,
          startUtc: input.startUtc,
          endUtc: input.endUtc,
          reason: `Public Holiday: ${input.holidayName}`,
        },
      });
    }

    const userRecord = await tx.user.findUnique({ where: { id: auditUser.id } });

    await tx.auditLog.create({
      data: {
        userId: userRecord ? userRecord.id : null,
        action: "BULK_HOLIDAY_BLOCK",
        entityType: "BLOCKED_TIME",
        newValues: {
          holidayName: input.holidayName,
          startUtc: input.startUtc.toISOString(),
          endUtc: input.endUtc.toISOString(),
          staffCount: targetStaff.length,
          staffNames: targetStaff.map((s) => s.name),
          blockedBy: auditUser.name,
          userRole: auditUser.role,
        },
      },
    });
  });

  return {
    success: true,
    blockedCount: targetStaff.length,
  };
}
