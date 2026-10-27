import {
  TimeInterval,
  AvailabilitySlot,
  StaffScheduleRecord,
  StaffShift,
  AvailabilitySlotStaff,
} from "./types";

/**
 * Checks if two half-open intervals [startA, endA) and [startB, endB) overlap.
 * Adjacent intervals (e.g. 10:00-11:00 and 11:00-12:00) do NOT overlap.
 */
export function isOverlapping(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
}

/**
 * Checks if a candidate interval clashes with any busy interval.
 */
export function isSlotAvailable(candidate: TimeInterval, busyIntervals: TimeInterval[]): boolean {
  return !busyIntervals.some((busy) =>
    isOverlapping(candidate.startUtc, candidate.endUtc, busy.startUtc, busy.endUtc)
  );
}

/**
 * Parses a Date string ("YYYY-MM-DD") and a 24h Time string ("HH:mm") into a UTC Date.
 * Timezone: Africa/Accra is UTC+0 with no DST, mapping directly to UTC timestamp representation.
 */
export function parseDateAndTimeToUtc(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
}

/**
 * Converts a Date to "YYYY-MM-DD" in UTC (Africa/Accra).
 */
export function formatUtcDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface GenerateStaffSlotsOptions {
  dateStr: string; // "YYYY-MM-DD"
  shifts: StaffShift[];
  busyIntervals: TimeInterval[];
  totalDurationMin: number;
  slotIntervalMin: number;
  earliestBookableUtc: Date;
  studioHours?: { isOpen: boolean; openTime: string; closeTime: string };
}

/**
 * Generates all valid candidate slots for a staff member on a specific date.
 */
export function generateStaffDaySlots(options: GenerateStaffSlotsOptions): TimeInterval[] {
  const {
    dateStr,
    shifts,
    busyIntervals,
    totalDurationMin,
    slotIntervalMin,
    earliestBookableUtc,
    studioHours,
  } = options;

  if (studioHours && !studioHours.isOpen) {
    return [];
  }

  const dateObj = new Date(`${dateStr}T00:00:00.000Z`);
  const weekday = dateObj.getUTCDay();

  // Find active shifts for this weekday
  const activeShifts = shifts.filter(
    (s) => s.weekday === weekday && !s.isDayOff && s.active !== false
  );

  if (activeShifts.length === 0) {
    return [];
  }

  const validSlots: TimeInterval[] = [];

  for (const shift of activeShifts) {
    let shiftStart = parseDateAndTimeToUtc(dateStr, shift.startTime);
    let shiftEnd = parseDateAndTimeToUtc(dateStr, shift.endTime);

    // Clip shift window to studio operating hours if provided
    if (studioHours) {
      const studioOpen = parseDateAndTimeToUtc(dateStr, studioHours.openTime);
      const studioClose = parseDateAndTimeToUtc(dateStr, studioHours.closeTime);
      if (shiftStart < studioOpen) shiftStart = studioOpen;
      if (shiftEnd > studioClose) shiftEnd = studioClose;
    }

    if (shiftStart >= shiftEnd) continue;

    // Collect all busy intervals including meal break for this shift
    const allBusy: TimeInterval[] = [...busyIntervals];
    if (shift.breakStart && shift.breakEnd) {
      allBusy.push({
        startUtc: parseDateAndTimeToUtc(dateStr, shift.breakStart),
        endUtc: parseDateAndTimeToUtc(dateStr, shift.breakEnd),
      });
    }

    // Step through in increments of slotIntervalMin
    let cursor = new Date(shiftStart.getTime());
    const durationMs = totalDurationMin * 60 * 1000;
    const intervalMs = slotIntervalMin * 60 * 1000;

    while (cursor.getTime() + durationMs <= shiftEnd.getTime()) {
      const candidate: TimeInterval = {
        startUtc: new Date(cursor.getTime()),
        endUtc: new Date(cursor.getTime() + durationMs),
      };

      // Must satisfy minimum booking notice
      if (candidate.startUtc.getTime() >= earliestBookableUtc.getTime()) {
        // Must not conflict with any busy intervals (bookings, holds, breaks, leaves)
        if (isSlotAvailable(candidate, allBusy)) {
          validSlots.push(candidate);
        }
      }

      cursor = new Date(cursor.getTime() + intervalMs);
    }
  }

  return validSlots;
}

export interface ComputeSlotsEngineOptions {
  dateStrings: string[];
  staffList: StaffScheduleRecord[];
  totalDurationMin: number;
  totalPricePesewas: number;
  slotIntervalMin: number;
  earliestBookableUtc: Date;
  studioOpeningHours: Record<number, { isOpen: boolean; openTime: string; closeTime: string }>;
  holidays: Array<{ date: string; name?: string }>;
  targetStaffId?: string; // specific staffId, "any", or undefined
}

/**
 * Pure slot computation engine.
 * Computes available booking slots respecting staff working shifts, breaks,
 * existing bookings, active holds, leave, blocked time, holidays, and studio opening hours.
 * For 'any available', fair rotation / least load prioritizes the stylist with the lowest load.
 */
export function computeAvailableSlots(options: ComputeSlotsEngineOptions): AvailabilitySlot[] {
  const {
    dateStrings,
    staffList,
    totalDurationMin,
    totalPricePesewas,
    slotIntervalMin,
    earliestBookableUtc,
    studioOpeningHours,
    holidays,
    targetStaffId,
  } = options;

  const holidayDateSet = new Set(holidays.map((h) => h.date));
  const isAnyStaff = !targetStaffId || targetStaffId === "any";

  // Filter staff candidates
  const eligibleStaff = isAnyStaff
    ? staffList
    : staffList.filter((s) => s.id === targetStaffId);

  if (eligibleStaff.length === 0) {
    return [];
  }

  // Map to hold aggregated slots: key is startUtc ISO string
  const slotsMap = new Map<
    string,
    {
      candidate: TimeInterval;
      candidates: Array<{ staff: StaffScheduleRecord; loadScore: number }>;
    }
  >();

  for (const dateStr of dateStrings) {
    // If studio is closed on this holiday date, skip
    if (holidayDateSet.has(dateStr)) {
      continue;
    }

    const dateObj = new Date(`${dateStr}T00:00:00.000Z`);
    const weekday = dateObj.getUTCDay();
    const studioHours = studioOpeningHours[weekday];

    if (studioHours && !studioHours.isOpen) {
      continue;
    }

    for (const staff of eligibleStaff) {
      const freeSlots = generateStaffDaySlots({
        dateStr,
        shifts: staff.schedules,
        busyIntervals: staff.busyIntervals,
        totalDurationMin,
        slotIntervalMin,
        earliestBookableUtc,
        studioHours,
      });

      for (const slot of freeSlots) {
        const key = slot.startUtc.toISOString();
        if (!slotsMap.has(key)) {
          slotsMap.set(key, {
            candidate: slot,
            candidates: [],
          });
        }
        slotsMap.get(key)!.candidates.push({
          staff,
          loadScore: staff.currentLoad,
        });
      }
    }
  }

  // Sort and resolve slots
  const result: AvailabilitySlot[] = [];

  for (const [, { candidate, candidates }] of slotsMap.entries()) {
    if (candidates.length === 0) continue;

    // Sort candidates by least load (fair rotation), then name, then id
    candidates.sort((a, b) => {
      if (a.loadScore !== b.loadScore) {
        return a.loadScore - b.loadScore;
      }
      return a.staff.name.localeCompare(b.staff.name);
    });

    const chosen = candidates[0].staff;

    const availableStaffList: AvailabilitySlotStaff[] = candidates.map((c) => ({
      id: c.staff.id,
      name: c.staff.name,
      photoUrl: c.staff.photoUrl,
      specialties: c.staff.specialties,
      loadScore: c.loadScore,
    }));

    result.push({
      startUtc: candidate.startUtc.toISOString(),
      endUtc: candidate.endUtc.toISOString(),
      available: true,
      durationMin: totalDurationMin,
      pricePesewas: totalPricePesewas,
      staffId: chosen.id,
      staffName: chosen.name,
      assignedStaff: {
        id: chosen.id,
        name: chosen.name,
        photoUrl: chosen.photoUrl,
        specialties: chosen.specialties,
        loadScore: candidates[0].loadScore,
      },
      availableStaff: availableStaffList,
    });
  }

  // Sort chronologically
  result.sort((a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime());

  return result;
}
