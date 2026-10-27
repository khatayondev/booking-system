import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../lib/db";
import {
  calculateBookingDuration,
  isSlotAvailable,
  generateStaffDaySlots,
  computeAvailableSlots,
  createSlotHold,
  extendSlotHold,
  releaseSlotHold,
  releaseAbandonedHolds,
  getAvailabilitySlots,
} from "../lib/availability";
import { AppError } from "../lib/api-response";

describe("Prompt 9: Availability Engine & Slot Holds", () => {
  let staffAId: string;
  let staffBId: string;
  let serviceAId: string;
  let serviceBId: string;
  let addonAId: string;
  const createdHoldTokens: string[] = [];

  beforeAll(async () => {
    // 1. Fetch or create test staff members
    const staffMembers = await prisma.staff.findMany({
      where: { active: true, deletedAt: null },
      take: 2,
    });

    if (staffMembers.length < 2) {
      throw new Error("At least two active staff members required for tests");
    }

    staffAId = staffMembers[0].id;
    staffBId = staffMembers[1].id;

    // 2. Fetch or create test services
    const category = await prisma.serviceCategory.findFirst();
    if (!category) throw new Error("Service category missing");

    const sA = await prisma.service.create({
      data: {
        name: `Test Makeup Service ${Date.now()}`,
        categoryId: category.id,
        durationMin: 60,
        bufferMin: 15,
        pricePesewas: 25000,
        active: true,
      },
    });
    serviceAId = sA.id;

    const sB = await prisma.service.create({
      data: {
        name: `Test Lash Service ${Date.now()}`,
        categoryId: category.id,
        durationMin: 45,
        bufferMin: 15,
        pricePesewas: 18000,
        active: true,
      },
    });
    serviceBId = sB.id;

    const addon = await prisma.serviceAddon.create({
      data: {
        name: "Test Brow Sculpt Addon",
        serviceId: serviceAId,
        durationMin: 15,
        pricePesewas: 5000,
        active: true,
      },
    });
    addonAId = addon.id;

    // Assign both services to staffA and staffB
    await prisma.staffService.upsert({
      where: { staffId_serviceId: { staffId: staffAId, serviceId: serviceAId } },
      create: { staffId: staffAId, serviceId: serviceAId },
      update: {},
    });
    await prisma.staffService.upsert({
      where: { staffId_serviceId: { staffId: staffAId, serviceId: serviceBId } },
      create: { staffId: staffAId, serviceId: serviceBId },
      update: {},
    });
    await prisma.staffService.upsert({
      where: { staffId_serviceId: { staffId: staffBId, serviceId: serviceAId } },
      create: { staffId: staffBId, serviceId: serviceAId },
      update: {},
    });
    await prisma.staffService.upsert({
      where: { staffId_serviceId: { staffId: staffBId, serviceId: serviceBId } },
      create: { staffId: staffBId, serviceId: serviceBId },
      update: {},
    });
  });

  afterAll(async () => {
    // Clean up created holds, addons, and test services
    if (createdHoldTokens.length > 0) {
      await prisma.slotHold.deleteMany({
        where: { token: { in: createdHoldTokens } },
      });
    }

    await prisma.serviceAddon.deleteMany({
      where: { id: addonAId },
    });
    await prisma.staffService.deleteMany({
      where: { serviceId: { in: [serviceAId, serviceBId] } },
    });
    await prisma.service.deleteMany({
      where: { id: { in: [serviceAId, serviceBId] } },
    });

    await prisma.$disconnect();
  });

  // TEST 1: Buffers and Total Duration Calculation
  it("computes duration with service duration, service buffer, and add-on durations", () => {
    const summary = calculateBookingDuration(
      [
        { id: "s1", name: "Bridal Glam", durationMin: 60, bufferMin: 15, pricePesewas: 30000 },
        { id: "s2", name: "Hair Styling", durationMin: 45, bufferMin: 10, pricePesewas: 20000 },
      ],
      [{ id: "a1", name: "Lash Clusters", durationMin: 15, pricePesewas: 5000 }]
    );

    // 60 + 45 service duration = 105 min
    expect(summary.serviceDurationMin).toBe(105);
    // 15 + 10 buffer = 25 min
    expect(summary.bufferMin).toBe(25);
    // 15 min add-on = 15 min
    expect(summary.addonDurationMin).toBe(15);
    // Total = 105 + 25 + 15 = 145 min
    expect(summary.totalDurationMin).toBe(145);
    // Total price = 30000 + 20000 + 5000 = 55000 pesewas
    expect(summary.totalPricePesewas).toBe(55000);
  });

  // TEST 2: Back-to-Back Bookings & Non-Overlapping Adjacent Slots
  it("allows back-to-back adjacent slots but rejects overlapping slots", () => {
    const bookingStart = new Date("2026-11-10T10:00:00.000Z");
    const bookingEnd = new Date("2026-11-10T11:00:00.000Z");
    const busyIntervals = [{ startUtc: bookingStart, endUtc: bookingEnd }];

    // Slot 1: Immediately before (09:00 - 10:00) -> Allowed!
    const slotBefore = {
      startUtc: new Date("2026-11-10T09:00:00.000Z"),
      endUtc: new Date("2026-11-10T10:00:00.000Z"),
    };
    expect(isSlotAvailable(slotBefore, busyIntervals)).toBe(true);

    // Slot 2: Immediately after (11:00 - 12:00) -> Allowed!
    const slotAfter = {
      startUtc: new Date("2026-11-10T11:00:00.000Z"),
      endUtc: new Date("2026-11-10T12:00:00.000Z"),
    };
    expect(isSlotAvailable(slotAfter, busyIntervals)).toBe(true);

    // Slot 3: Overlapping by 1 minute (10:59 - 11:59) -> Rejected!
    const slotOverlapping = {
      startUtc: new Date("2026-11-10T10:59:00.000Z"),
      endUtc: new Date("2026-11-10T11:59:00.000Z"),
    };
    expect(isSlotAvailable(slotOverlapping, busyIntervals)).toBe(false);

    // Slot 4: Completely inside (10:15 - 10:45) -> Rejected!
    const slotInside = {
      startUtc: new Date("2026-11-10T10:15:00.000Z"),
      endUtc: new Date("2026-11-10T10:45:00.000Z"),
    };
    expect(isSlotAvailable(slotInside, busyIntervals)).toBe(false);
  });

  // TEST 3: Holidays block all slots
  it("eliminates slots on studio closure holiday dates", () => {
    const dateStrings = ["2026-12-25", "2026-12-26"];
    const staffList = [
      {
        id: "staff-1",
        name: "Akosua",
        specialties: ["Bridal"],
        schedules: [
          { weekday: 5, startTime: "09:00", endTime: "17:00", isDayOff: false, active: true },
          { weekday: 6, startTime: "09:00", endTime: "17:00", isDayOff: false, active: true },
        ],
        busyIntervals: [],
        currentLoad: 0,
      },
    ];

    const slots = computeAvailableSlots({
      dateStrings,
      staffList,
      totalDurationMin: 60,
      totalPricePesewas: 20000,
      slotIntervalMin: 60,
      earliestBookableUtc: new Date("2026-12-01T00:00:00.000Z"),
      studioOpeningHours: {
        5: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
        6: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
      },
      holidays: [{ date: "2026-12-25", name: "Christmas Day" }],
    });

    // 2026-12-25 (holiday) must have 0 slots
    const christmasSlots = slots.filter((s) => s.startUtc.startsWith("2026-12-25"));
    expect(christmasSlots.length).toBe(0);

    // 2026-12-26 (open) must have slots
    const boxingDaySlots = slots.filter((s) => s.startUtc.startsWith("2026-12-26"));
    expect(boxingDaySlots.length).toBeGreaterThan(0);
  });

  // TEST 4: Stylist Leave & Meal Breaks block candidate slots
  it("blocks slots during stylist leave windows and internal meal breaks", () => {
    const shifts = [
      {
        weekday: 1, // Monday
        startTime: "09:00",
        endTime: "18:00",
        breakStart: "13:00",
        breakEnd: "14:00",
        isDayOff: false,
        active: true,
      },
    ];

    // Leave between 10:00 and 12:00
    const leave = {
      startUtc: new Date("2026-11-09T10:00:00.000Z"),
      endUtc: new Date("2026-11-09T12:00:00.000Z"),
    };

    const slots = generateStaffDaySlots({
      dateStr: "2026-11-09",
      shifts,
      busyIntervals: [leave],
      totalDurationMin: 60,
      slotIntervalMin: 60,
      earliestBookableUtc: new Date("2026-11-01T00:00:00.000Z"),
      studioHours: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
    });

    // 09:00-10:00 is free
    expect(slots.some((s) => s.startUtc.toISOString().includes("09:00:00"))).toBe(true);

    // 10:00-11:00 and 11:00-12:00 are blocked by leave
    expect(slots.some((s) => s.startUtc.toISOString().includes("10:00:00"))).toBe(false);
    expect(slots.some((s) => s.startUtc.toISOString().includes("11:00:00"))).toBe(false);

    // 12:00-13:00 is free
    expect(slots.some((s) => s.startUtc.toISOString().includes("12:00:00"))).toBe(true);

    // 13:00-14:00 is blocked by meal break
    expect(slots.some((s) => s.startUtc.toISOString().includes("13:00:00"))).toBe(false);

    // 14:00-15:00 is free
    expect(slots.some((s) => s.startUtc.toISOString().includes("14:00:00"))).toBe(true);
  });

  // TEST 5: Any Available & Least-Load Fair Rotation
  it("assigns 'any available' slots to the stylist with the lowest load", () => {
    const staffList = [
      {
        id: "staff-heavy",
        name: "Busy Stylist",
        specialties: ["Hair"],
        schedules: [{ weekday: 2, startTime: "09:00", endTime: "12:00", isDayOff: false, active: true }],
        busyIntervals: [],
        currentLoad: 5, // Already has 5 bookings
      },
      {
        id: "staff-light",
        name: "Free Stylist",
        specialties: ["Hair"],
        schedules: [{ weekday: 2, startTime: "09:00", endTime: "12:00", isDayOff: false, active: true }],
        busyIntervals: [],
        currentLoad: 1, // Only 1 booking -> Least load!
      },
    ];

    const slots = computeAvailableSlots({
      dateStrings: ["2026-11-10"],
      staffList,
      totalDurationMin: 60,
      totalPricePesewas: 15000,
      slotIntervalMin: 60,
      earliestBookableUtc: new Date("2026-11-01T00:00:00.000Z"),
      studioOpeningHours: { 2: { isOpen: true, openTime: "09:00", closeTime: "18:00" } },
      holidays: [],
      targetStaffId: "any",
    });

    expect(slots.length).toBeGreaterThan(0);
    // Every slot should assign the stylist with lowest load score (staff-light)
    expect(slots[0].assignedStaff.id).toBe("staff-light");
    expect(slots[0].assignedStaff.loadScore).toBe(1);

    // Both staff members should be listed in availableStaff
    expect(slots[0].availableStaff?.length).toBe(2);
  });

  // TEST 6: Hold Expiry, Clean Up & Single Extension
  it("handles hold expiry cleanup and enforces that a hold can only be extended once", async () => {
    const testNow = new Date("2026-11-15T12:00:00.000Z");

    // 1. Create an active hold
    const hold = await createSlotHold({
      serviceIds: [serviceAId],
      staffId: staffAId,
      startUtc: "2026-11-15T14:00:00.000Z",
      holdDurationMin: 10,
      now: testNow,
    });
    createdHoldTokens.push(hold.token);

    expect(hold.token).toBeDefined();
    expect(hold.extendedCount).toBe(0);
    expect(new Date(hold.expiresAt).getTime()).toBe(testNow.getTime() + 10 * 60000);

    // 2. Extend the hold once (+5 minutes) -> Should succeed!
    const extended = await extendSlotHold(hold.token, 5, testNow);
    expect(extended.extendedCount).toBe(1);
    expect(new Date(extended.expiresAt).getTime()).toBe(testNow.getTime() + 15 * 60000);

    // 3. Attempt to extend a second time -> Should throw AppError HOLD_ALREADY_EXTENDED
    await expect(extendSlotHold(hold.token, 5, testNow)).rejects.toThrowError(
      /Hold has already been extended/i
    );

    // 4. Test releaseAbandonedHolds
    // Move time forward past expiry
    const futureTime = new Date("2026-11-15T13:00:00.000Z");
    // Manually create an expired hold
    const expiredHold = await prisma.slotHold.create({
      data: {
        token: `expired-${Date.now()}`,
        staffId: staffAId,
        serviceId: serviceAId,
        serviceIds: [serviceAId],
        startUtc: new Date("2026-11-15T16:00:00.000Z"),
        endUtc: new Date("2026-11-15T17:00:00.000Z"),
        expiresAt: new Date(futureTime.getTime() - 1000), // in the past
      },
    });

    const released = await releaseAbandonedHolds(futureTime);
    expect(released).toBeGreaterThanOrEqual(1);

    const lookup = await prisma.slotHold.findUnique({ where: { token: expiredHold.token } });
    expect(lookup).toBeNull();
  });

  // TEST 7: Concurrency Race Condition (Two simultaneous requests for one slot produce exactly one winner)
  it("resolves simultaneous concurrent requests for the exact same slot with exactly one winner", async () => {
    const testNow = new Date();
    const raceStart = new Date("2026-12-18T14:00:00.000Z").toISOString();
    const raceEnd = new Date("2026-12-18T15:00:00.000Z").toISOString();

    // Fire two requests concurrently
    const [reqA, reqB] = await Promise.allSettled([
      createSlotHold({
        serviceIds: [serviceAId],
        staffId: staffBId,
        startUtc: raceStart,
        endUtc: raceEnd,
        holdDurationMin: 10,
        now: testNow,
      }),
      createSlotHold({
        serviceIds: [serviceAId],
        staffId: staffBId,
        startUtc: raceStart,
        endUtc: raceEnd,
        holdDurationMin: 10,
        now: testNow,
      }),
    ]);

    // Exactly one must be fulfilled and one rejected
    const fulfilled = [reqA, reqB].filter((r) => r.status === "fulfilled");
    const rejected = [reqA, reqB].filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    if (fulfilled[0].status === "fulfilled") {
      createdHoldTokens.push(fulfilled[0].value.token);
      expect(fulfilled[0].value.staffId).toBe(staffBId);
    }

    if (rejected[0].status === "rejected") {
      const err = rejected[0].reason as AppError;
      expect(err.statusCode).toBe(409);
      expect(["SLOT_ALREADY_HELD", "SLOT_UNAVAILABLE"]).toContain(err.code);
    }

    // Verify in database that exactly 1 hold exists for this slot
    const dbHolds = await prisma.slotHold.findMany({
      where: {
        staffId: staffBId,
        startUtc: new Date(raceStart),
        endUtc: new Date(raceEnd),
      },
    });
    expect(dbHolds.length).toBe(1);
  });

  // TEST 8: Full getAvailabilitySlots Orchestrator with Multi-Service Sequencing
  it("computes slots across multiple sequenced services and add-ons via getAvailabilitySlots", async () => {
    // Both staffA and staffB offer serviceA and serviceB
    const res = await getAvailabilitySlots({
      serviceIds: [serviceAId, serviceBId],
      addonIds: [addonAId],
      staffId: "any",
      startDate: "2026-11-20",
      endDate: "2026-11-22",
      now: new Date("2026-11-01T08:00:00.000Z"),
    });

    // Duration = ServiceA (60m + 15m buffer) + ServiceB (45m + 15m buffer) + Addon (15m) = 150 min
    expect(res.totalDurationMin).toBe(150);
    // Price = 25000 + 18000 + 5000 = 48000 pesewas
    expect(res.totalPricePesewas).toBe(48000);
    expect(res.serviceCount).toBe(2);
  });

  // TEST 9: Rate Limiting Enforcement
  it("enforces rate limits and throws HTTP 429 RATE_LIMIT_EXCEEDED when threshold exceeded", async () => {
    const { checkRateLimit } = await import("../lib/rate-limit");
    const testKey = `test-ip-${Date.now()}`;

    // Limit to 3 requests per 60 seconds
    expect(checkRateLimit(testKey, 3, 60).remaining).toBe(2);
    expect(checkRateLimit(testKey, 3, 60).remaining).toBe(1);
    expect(checkRateLimit(testKey, 3, 60).remaining).toBe(0);

    // 4th request must throw AppError with status 429
    try {
      checkRateLimit(testKey, 3, 60);
      expect.fail("Should have thrown 429 rate limit error");
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(429);
      expect(appErr.code).toBe("RATE_LIMIT_EXCEEDED");
    }
  });

  // TEST 10: Explicit Slot Hold Release
  it("explicitly releases an active hold, immediately making the slot available again", async () => {
    const testNow = new Date();
    const hold = await createSlotHold({
      serviceIds: [serviceAId],
      staffId: staffAId,
      startUtc: "2026-11-28T11:00:00.000Z",
      endUtc: "2026-11-28T12:00:00.000Z",
      now: testNow,
    });

    // Verify hold exists
    const beforeRelease = await prisma.slotHold.findUnique({ where: { token: hold.token } });
    expect(beforeRelease).not.toBeNull();

    // Release hold
    const released = await releaseSlotHold(hold.token);
    expect(released).toBe(true);

    // Verify deleted from database
    const afterRelease = await prisma.slotHold.findUnique({ where: { token: hold.token } });
    expect(afterRelease).toBeNull();
  });
});


