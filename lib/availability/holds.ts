import crypto from "node:crypto";
import { prisma } from "../db";
import { AppError } from "../api-response";
import { addMinutes } from "../date";
import { HoldSlotInput, SlotHoldResult } from "./types";
import { calculateBookingDuration } from "./duration";
import { isOverlapping } from "./slots";

/**
 * Releases/deletes all expired slot holds from the database.
 * An expiry job releases abandoned holds so that slots become available again.
 */
export async function releaseAbandonedHolds(now = new Date()): Promise<number> {
  const result = await prisma.slotHold.deleteMany({
    where: {
      expiresAt: {
        lte: now,
      },
    },
  });
  return result.count;
}

/**
 * Atomically creates a 10-minute hold on a time slot for a stylist.
 * The PostgreSQL exclusion constraint on SlotHold is the final guard against race conditions.
 */
export async function createSlotHold(input: HoldSlotInput): Promise<SlotHoldResult> {
  const now = input.now || new Date();
  const holdMinutes = input.holdDurationMin || 10;

  if (!input.serviceIds || input.serviceIds.length === 0) {
    throw new AppError("At least one service ID is required to place a hold", 400, "BAD_REQUEST");
  }

  // 1. Clean up abandoned holds
  await releaseAbandonedHolds(now);

  // 2. Fetch services and add-ons
  const services = await prisma.service.findMany({
    where: { id: { in: input.serviceIds }, deletedAt: null, active: true },
    select: { id: true, name: true, durationMin: true, bufferMin: true, pricePesewas: true },
  });

  if (services.length !== input.serviceIds.length) {
    throw new AppError("One or more selected services are unavailable", 400, "INVALID_SERVICES");
  }

  const addonIds = input.addonIds || [];
  const addons = addonIds.length > 0
    ? await prisma.serviceAddon.findMany({
        where: { id: { in: addonIds }, active: true },
        select: { id: true, name: true, durationMin: true, pricePesewas: true },
      })
    : [];

  const { totalDurationMin } = calculateBookingDuration(services, addons);

  const startUtc = new Date(input.startUtc);
  if (isNaN(startUtc.getTime())) {
    throw new AppError("Invalid startUtc timestamp", 400, "INVALID_DATE");
  }

  const endUtc = input.endUtc
    ? new Date(input.endUtc)
    : new Date(startUtc.getTime() + totalDurationMin * 60 * 1000);

  if (startUtc >= endUtc) {
    throw new AppError("Start time must be before end time", 400, "INVALID_INTERVAL");
  }

  // 3. Resolve staff assignment
  let assignedStaffId = input.staffId;

  if (!assignedStaffId || assignedStaffId === "any") {
    // Find all active staff who perform ALL requested services
    const eligibleStaff = await prisma.staff.findMany({
      where: {
        active: true,
        deletedAt: null,
      },
      include: {
        staffServices: true,
        schedules: { where: { active: true } },
        bookings: {
          where: {
            deletedAt: null,
            status: { in: ["HELD", "PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN"] },
            startUtc: { lt: endUtc },
            endUtc: { gt: startUtc },
          },
        },
        slotHolds: {
          where: {
            expiresAt: { gt: now },
            startUtc: { lt: endUtc },
            endUtc: { gt: startUtc },
          },
        },
        timeOffs: {
          where: {
            approved: true,
            startUtc: { lt: endUtc },
            endUtc: { gt: startUtc },
          },
        },
        blockedTimes: {
          where: {
            startUtc: { lt: endUtc },
            endUtc: { gt: startUtc },
          },
        },
      },
    });

    // Filter staff who can perform all services
    const fullyQualified = eligibleStaff.filter((st) => {
      if (eligibleStaff.length === 1 || st.staffServices.length === 0) {
        return true;
      }
      const offered = new Set(st.staffServices.map((ss) => ss.serviceId));
      return input.serviceIds.every((sId) => offered.has(sId));
    });

    // Filter staff who have no conflicts at this time
    const weekday = startUtc.getUTCDay();
    const freeStaff = fullyQualified.filter((st) => {
      // Must have working shift covering [startUtc, endUtc]
      const dayShifts = st.schedules.filter((s) => s.weekday === weekday && !s.isDayOff);
      if (dayShifts.length === 0) return false;

      const hasShiftCoverage = dayShifts.some((shift) => {
        const [sH, sM] = shift.startTime.split(":").map(Number);
        const [eH, eM] = shift.endTime.split(":").map(Number);
        const shiftStart = new Date(Date.UTC(startUtc.getUTCFullYear(), startUtc.getUTCMonth(), startUtc.getUTCDate(), sH, sM));
        const shiftEnd = new Date(Date.UTC(startUtc.getUTCFullYear(), startUtc.getUTCMonth(), startUtc.getUTCDate(), eH, eM));

        if (startUtc < shiftStart || endUtc > shiftEnd) return false;

        // Check internal meal break
        if (shift.breakStart && shift.breakEnd) {
          const [bSH, bSM] = shift.breakStart.split(":").map(Number);
          const [bEH, bEM] = shift.breakEnd.split(":").map(Number);
          const breakStart = new Date(Date.UTC(startUtc.getUTCFullYear(), startUtc.getUTCMonth(), startUtc.getUTCDate(), bSH, bSM));
          const breakEnd = new Date(Date.UTC(startUtc.getUTCFullYear(), startUtc.getUTCMonth(), startUtc.getUTCDate(), bEH, bEM));
          if (isOverlapping(startUtc, endUtc, breakStart, breakEnd)) {
            return false;
          }
        }
        return true;
      });

      if (!hasShiftCoverage) return false;

      // Must have 0 bookings, holds, timeOffs, blockedTimes overlapping
      return (
        st.bookings.length === 0 &&
        st.slotHolds.length === 0 &&
        st.timeOffs.length === 0 &&
        st.blockedTimes.length === 0
      );
    });

    if (freeStaff.length === 0) {
      throw new AppError("No stylist available for this slot", 409, "SLOT_UNAVAILABLE");
    }

    // Sort by least load (load count query for today)
    freeStaff.sort((a, b) => a.bookings.length - b.bookings.length);
    assignedStaffId = freeStaff[0].id;
  }

  // 4. Verify staff existence
  const staffRecord = await prisma.staff.findUnique({
    where: { id: assignedStaffId, deletedAt: null, active: true },
    select: { id: true, name: true },
  });

  if (!staffRecord) {
    throw new AppError("Selected staff member not found or inactive", 404, "STAFF_NOT_FOUND");
  }

  // 5. Check if staff is already booked or held
  const existingBooking = await prisma.booking.findFirst({
    where: {
      staffId: assignedStaffId,
      deletedAt: null,
      status: { in: ["HELD", "PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN"] },
      startUtc: { lt: endUtc },
      endUtc: { gt: startUtc },
    },
  });

  if (existingBooking) {
    throw new AppError("Slot is already booked for this stylist", 409, "SLOT_UNAVAILABLE");
  }

  const existingHold = await prisma.slotHold.findFirst({
    where: {
      staffId: assignedStaffId,
      expiresAt: { gt: now },
      startUtc: { lt: endUtc },
      endUtc: { gt: startUtc },
    },
  });

  if (existingHold) {
    throw new AppError("Slot is currently held by another customer", 409, "SLOT_ALREADY_HELD");
  }

  // 6. Generate cryptographically secure token & hold record
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = addMinutes(now, holdMinutes);

  try {
    const hold = await prisma.slotHold.create({
      data: {
        token,
        staffId: assignedStaffId,
        serviceId: input.serviceIds[0],
        serviceIds: input.serviceIds,
        addonIds: addonIds,
        startUtc,
        endUtc,
        expiresAt,
        extendedCount: 0,
      },
    });

    return {
      id: hold.id,
      token: hold.token,
      staffId: hold.staffId,
      staffName: staffRecord.name,
      serviceId: hold.serviceId,
      serviceIds: hold.serviceIds,
      addonIds: hold.addonIds,
      startUtc: hold.startUtc.toISOString(),
      endUtc: hold.endUtc.toISOString(),
      expiresAt: hold.expiresAt.toISOString(),
      holdDurationMin: holdMinutes,
      extendedCount: hold.extendedCount,
    };
  } catch (err: unknown) {
    // Detect Postgres exclusion constraint violation (race condition where two concurrent requests try to hold the same slot)
    const errorStr = String(err);
    if (
      errorStr.includes("no_overlapping_staff_holds") ||
      errorStr.includes("exclusion") ||
      errorStr.includes("23P01") ||
      (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002")
    ) {
      throw new AppError(
        "This slot was just held by another customer. Please select another time.",
        409,
        "SLOT_ALREADY_HELD"
      );
    }
    throw err;
  }
}

/**
 * Extends a valid slot hold once by a specified number of additional minutes (default 5 min).
 */
export async function extendSlotHold(token: string, additionalMinutes = 5, now = new Date()): Promise<SlotHoldResult> {
  const hold = await prisma.slotHold.findUnique({
    where: { token },
    include: { staff: { select: { name: true } } },
  });

  if (!hold) {
    throw new AppError("Hold not found", 404, "HOLD_NOT_FOUND");
  }

  if (hold.expiresAt.getTime() <= now.getTime()) {
    throw new AppError("Hold has already expired and cannot be extended", 400, "HOLD_EXPIRED");
  }

  if (hold.extendedCount >= 1) {
    throw new AppError(
      "Hold has already been extended. Each slot hold can only be extended once.",
      400,
      "HOLD_ALREADY_EXTENDED"
    );
  }

  const newExpiresAt = addMinutes(hold.expiresAt, additionalMinutes);

  const updated = await prisma.slotHold.update({
    where: { token },
    data: {
      expiresAt: newExpiresAt,
      extendedCount: hold.extendedCount + 1,
    },
    include: { staff: { select: { name: true } } },
  });

  return {
    id: updated.id,
    token: updated.token,
    staffId: updated.staffId,
    staffName: updated.staff.name,
    serviceId: updated.serviceId,
    serviceIds: updated.serviceIds,
    addonIds: updated.addonIds,
    startUtc: updated.startUtc.toISOString(),
    endUtc: updated.endUtc.toISOString(),
    expiresAt: updated.expiresAt.toISOString(),
    holdDurationMin: Math.round((newExpiresAt.getTime() - updated.createdAt.getTime()) / 60000),
    extendedCount: updated.extendedCount,
  };
}

/**
 * Releases/cancels a slot hold explicitly.
 */
export async function releaseSlotHold(token: string): Promise<boolean> {
  try {
    await prisma.slotHold.delete({
      where: { token },
    });
    return true;
  } catch {
    return false;
  }
}
