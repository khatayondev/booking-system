import { prisma } from "../db";
import { AppError } from "../api-response";
import { getSettings } from "../settings";
import { addHours, addDays } from "../date";
import {
  AvailabilityQueryInput,
  AvailabilitySlot,
  StaffScheduleRecord,
  StaffShift,
  TimeInterval,
} from "./types";
import { calculateBookingDuration } from "./duration";
import { computeAvailableSlots, formatUtcDateString } from "./slots";
import { releaseAbandonedHolds } from "./holds";

export * from "./types";
export * from "./duration";
export * from "./slots";
export * from "./holds";

/**
 * High-level service: computes all bookable availability slots for a set of services and date range.
 * Respects stylist shifts, breaks, leave, bookings, active holds, studio holidays,
 * minimum booking notice, maximum advance days, and slot intervals.
 */
export async function getAvailabilitySlots(
  input: AvailabilityQueryInput
): Promise<{
  slots: AvailabilitySlot[];
  totalDurationMin: number;
  totalPricePesewas: number;
  slotIntervalMin: number;
  serviceCount: number;
}> {
  const now = input.now || new Date();

  if (!input.serviceIds || input.serviceIds.length === 0) {
    throw new AppError("At least one service must be selected", 400, "BAD_REQUEST");
  }

  // 1. Release expired abandoned holds
  await releaseAbandonedHolds(now);

  // 2. Fetch business settings
  const settings = await getSettings();
  const minimumNoticeHours = settings.minimumNoticeHours ?? 2;
  const maxDaysAhead = settings.maxDaysAhead ?? 60;
  const slotIntervalMin = settings.slotIntervalMinutes ?? 30;

  const studioOpeningHours: Record<number, { isOpen: boolean; openTime: string; closeTime: string }> = {};
  for (const oh of settings.openingHours) {
    studioOpeningHours[oh.weekday] = {
      isOpen: oh.isOpen,
      openTime: oh.openTime,
      closeTime: oh.closeTime,
    };
  }

  // 3. Fetch services and add-ons
  const services = await prisma.service.findMany({
    where: {
      id: { in: input.serviceIds },
      deletedAt: null,
      active: true,
    },
    select: {
      id: true,
      name: true,
      durationMin: true,
      bufferMin: true,
      pricePesewas: true,
    },
  });

  if (services.length !== input.serviceIds.length) {
    throw new AppError("One or more selected services are unavailable", 400, "INVALID_SERVICES");
  }

  const addonIds = input.addonIds || [];
  const addons =
    addonIds.length > 0
      ? await prisma.serviceAddon.findMany({
          where: { id: { in: addonIds }, active: true },
          select: { id: true, name: true, durationMin: true, pricePesewas: true },
        })
      : [];

  const { totalDurationMin, totalPricePesewas } = calculateBookingDuration(services, addons);

  // 4. Validate and construct date range
  const startDateObj = new Date(`${input.startDate.slice(0, 10)}T00:00:00.000Z`);
  const endDateObj = new Date(`${input.endDate.slice(0, 10)}T23:59:59.999Z`);

  if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
    throw new AppError("Invalid startDate or endDate format (expected YYYY-MM-DD)", 400, "INVALID_DATE");
  }

  if (startDateObj > endDateObj) {
    throw new AppError("startDate cannot be after endDate", 400, "INVALID_DATE_RANGE");
  }

  const earliestBookableUtc = addHours(now, minimumNoticeHours);
  const maxBookableDate = addDays(now, maxDaysAhead);

  // Generate list of date strings (YYYY-MM-DD)
  const dateStrings: string[] = [];
  const curr = new Date(startDateObj.getTime());
  while (curr <= endDateObj && curr <= maxBookableDate) {
    dateStrings.push(formatUtcDateString(curr));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  if (dateStrings.length === 0) {
    return {
      slots: [],
      totalDurationMin,
      totalPricePesewas,
      slotIntervalMin,
      serviceCount: services.length,
    };
  }

  // 5. Query candidate staff members
  // Invariant: staff must perform ALL selected services
  const isAnyStaff = !input.staffId || input.staffId === "any";
  const staffFilter = isAnyStaff ? {} : { id: input.staffId };

  const staffCandidates = await prisma.staff.findMany({
    where: {
      ...staffFilter,
      active: true,
      deletedAt: null,
      staffServices: {
        some: {
          serviceId: { in: input.serviceIds },
        },
      },
    },
    include: {
      staffServices: true,
      schedules: {
        where: { active: true },
      },
      bookings: {
        where: {
          deletedAt: null,
          status: { in: ["HELD", "PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN"] },
          startUtc: { lte: endDateObj },
          endUtc: { gte: startDateObj },
        },
        select: {
          startUtc: true,
          endUtc: true,
        },
      },
      slotHolds: {
        where: {
          expiresAt: { gt: now },
          startUtc: { lte: endDateObj },
          endUtc: { gte: startDateObj },
        },
        select: {
          startUtc: true,
          endUtc: true,
        },
      },
      timeOffs: {
        where: {
          approved: true,
          startUtc: { lte: endDateObj },
          endUtc: { gte: startDateObj },
        },
        select: {
          startUtc: true,
          endUtc: true,
        },
      },
      blockedTimes: {
        where: {
          startUtc: { lte: endDateObj },
          endUtc: { gte: startDateObj },
        },
        select: {
          startUtc: true,
          endUtc: true,
        },
      },
    },
  });

  // Filter staff who offer all selected services
  const fullyQualifiedStaff = staffCandidates.filter((staff) => {
    const offered = new Set(staff.staffServices.map((ss) => ss.serviceId));
    return input.serviceIds.every((sId) => offered.has(sId));
  });

  // Map into StaffScheduleRecord with consolidated busy intervals and current load
  const staffRecords: StaffScheduleRecord[] = fullyQualifiedStaff.map((staff) => {
    const busyIntervals: TimeInterval[] = [
      ...staff.bookings.map((b) => ({ startUtc: b.startUtc, endUtc: b.endUtc })),
      ...staff.slotHolds.map((h) => ({ startUtc: h.startUtc, endUtc: h.endUtc })),
      ...staff.timeOffs.map((t) => ({ startUtc: t.startUtc, endUtc: t.endUtc })),
      ...staff.blockedTimes.map((bt) => ({ startUtc: bt.startUtc, endUtc: bt.endUtc })),
    ];

    const currentLoad = staff.bookings.length + staff.slotHolds.length;

    const schedules: StaffShift[] = staff.schedules.map((s) => ({
      weekday: s.weekday,
      startTime: s.startTime,
      endTime: s.endTime,
      breakStart: s.breakStart,
      breakEnd: s.breakEnd,
      isDayOff: s.isDayOff,
      active: s.active,
    }));

    return {
      id: staff.id,
      name: staff.name,
      photoUrl: staff.photoUrl,
      specialties: staff.specialties,
      schedules,
      busyIntervals,
      currentLoad,
    };
  });

  // 6. Execute pure computeAvailableSlots function
  const slots = computeAvailableSlots({
    dateStrings,
    staffList: staffRecords,
    totalDurationMin,
    totalPricePesewas,
    slotIntervalMin,
    earliestBookableUtc,
    studioOpeningHours,
    holidays: settings.holidays,
    targetStaffId: input.staffId,
  });

  return {
    slots,
    totalDurationMin,
    totalPricePesewas,
    slotIntervalMin,
    serviceCount: services.length,
  };
}
