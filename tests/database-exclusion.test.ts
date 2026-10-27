import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient, BookingStatus, BookingSource } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();

describe("PostgreSQL Exclusion Constraint (No Double Booking)", () => {
  let staffAId: string;
  let staffBId: string;
  let customerId: string;
  const createdBookingIds: string[] = [];

  beforeAll(async () => {
    // Fetch seeded staff
    const staffMembers = await prisma.staff.findMany({ take: 2 });
    if (staffMembers.length < 2) {
      throw new Error("Seeded staff members not found. Please run prisma db seed first.");
    }
    staffAId = staffMembers[0].id;
    staffBId = staffMembers[1].id;

    // Create a dedicated test customer
    const customer = await prisma.customer.upsert({
      where: { phone: "+233240009999" },
      update: {},
      create: {
        phone: "+233240009999",
        name: "Test Customer Constraint",
      },
    });
    customerId = customer.id;
  });

  afterAll(async () => {
    if (createdBookingIds.length > 0) {
      await prisma.booking.deleteMany({
        where: { id: { in: createdBookingIds } },
      });
    }
    await prisma.customer.deleteMany({
      where: { phone: "+233240009999" },
    });
    await prisma.$disconnect();
  });

  it("permits creating an initial booking", async () => {
    const startUtc = new Date("2026-12-01T10:00:00.000Z");
    const endUtc = new Date("2026-12-01T11:30:00.000Z");

    const booking1 = await prisma.booking.create({
      data: {
        reference: `TST-EXCL-${Date.now()}-1`,
        manageTokenHash: crypto.randomBytes(16).toString("hex"),
        staffId: staffAId,
        customerId,
        startUtc,
        endUtc,
        status: BookingStatus.CONFIRMED,
        source: BookingSource.WEB,
        subtotalPesewas: 35000,
        totalPesewas: 35000,
      },
    });

    createdBookingIds.push(booking1.id);
    expect(booking1.id).toBeDefined();
    expect(booking1.status).toBe(BookingStatus.CONFIRMED);
  });

  it("rejects an overlapping booking for the same staff member at the database level", async () => {
    // Overlaps with 10:00 - 11:30 (starts at 11:00)
    const overlappingStart = new Date("2026-12-01T11:00:00.000Z");
    const overlappingEnd = new Date("2026-12-01T12:00:00.000Z");

    let errorThrown: unknown = null;

    try {
      await prisma.booking.create({
        data: {
          reference: `TST-EXCL-${Date.now()}-2`,
          manageTokenHash: crypto.randomBytes(16).toString("hex"),
          staffId: staffAId, // SAME staff member
          customerId,
          startUtc: overlappingStart,
          endUtc: overlappingEnd,
          status: BookingStatus.CONFIRMED, // Active status covered by exclusion constraint
          source: BookingSource.WEB,
          subtotalPesewas: 25000,
          totalPesewas: 25000,
        },
      });
    } catch (err) {
      errorThrown = err;
    }

    // The database itself MUST have rejected this insertion!
    expect(errorThrown).not.toBeNull();
    // Verify it is a PostgreSQL exclusion constraint violation
    const errorMessage = String(errorThrown);
    const isExclusionViolation =
      errorMessage.includes("no_overlapping_staff_bookings") ||
      errorMessage.includes("exclusion") ||
      errorMessage.includes("23P01");

    expect(isExclusionViolation).toBe(true);
  });

  it("permits a concurrent booking at the exact same time for a different staff member", async () => {
    const startUtc = new Date("2026-12-01T10:00:00.000Z");
    const endUtc = new Date("2026-12-01T11:30:00.000Z");

    const bookingStaffB = await prisma.booking.create({
      data: {
        reference: `TST-EXCL-${Date.now()}-3`,
        manageTokenHash: crypto.randomBytes(16).toString("hex"),
        staffId: staffBId, // DIFFERENT staff member
        customerId,
        startUtc,
        endUtc,
        status: BookingStatus.CONFIRMED,
        source: BookingSource.WEB,
        subtotalPesewas: 35000,
        totalPesewas: 35000,
      },
    });

    createdBookingIds.push(bookingStaffB.id);
    expect(bookingStaffB.id).toBeDefined();
    expect(bookingStaffB.staffId).toBe(staffBId);
  });
});
