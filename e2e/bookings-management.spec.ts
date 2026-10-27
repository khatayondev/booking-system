import { test, expect } from "@playwright/test";
import { prisma } from "../lib/db";
import crypto from "crypto";

test.describe("Prompt 13: Bookings Management E2E", () => {
  let staff1: { id: string; name: string };
  let staff2: { id: string; name: string };
  let testCustomer: { id: string; name: string; phone: string };
  let conflictBookingA: { id: string; reference: string };
  let conflictBookingB: { id: string; reference: string };
  let cancelBooking: { id: string; reference: string };
  let staff2Booking: { id: string; reference: string };

  test.beforeAll(async () => {
    // 1. Ensure staff profiles exist
    const staffRecords = await prisma.staff.findMany({
      where: { deletedAt: null },
      take: 2,
    });

    if (staffRecords.length < 2) {
      throw new Error("At least 2 staff members required for bookings management tests");
    }

    staff1 = { id: staffRecords[0].id, name: staffRecords[0].name };
    staff2 = { id: staffRecords[1].id, name: staffRecords[1].name };

    // Ensure test users are not locked out from previous tests
    await prisma.user.updateMany({
      where: { email: { in: ["owner@aurastudio.gh", "reception@aurastudio.gh"] } },
      data: {
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    });

    // Link reception staff user to staff2
    const staffUser = await prisma.user.findUnique({
      where: { email: "reception@aurastudio.gh" },
    });
    if (staffUser) {
      await prisma.staff.update({
        where: { id: staff2.id },
        data: { userId: staffUser.id },
      });
    }

    const randomDayOffset = 100 + Math.floor(Math.random() * 5000) + (process.pid % 500);
    const testPhone = `+23324${Math.floor(1000000 + Math.random() * 9000000)}`;

    testCustomer = await prisma.customer.create({
      data: {
        name: `E2E Booking Client ${Date.now().toString().slice(-4)}`,
        phone: testPhone,
      },
    });

    const service = await prisma.service.findFirst({
      where: { active: true, deletedAt: null },
    });

    // 3. Seed two bookings for Reschedule Conflict test
    // Booking A for Staff 1 at target date 10:00 UTC
    const target10am = new Date();
    target10am.setDate(target10am.getDate() + randomDayOffset);
    target10am.setUTCHours(10, 0, 0, 0);

    const target11am = new Date(target10am);
    target11am.setUTCHours(11, 0, 0, 0);

    conflictBookingA = await prisma.booking.create({
      data: {
        reference: `BK-CONF-A-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`,
        status: "CONFIRMED",
        source: "WEB",
        startUtc: target10am,
        endUtc: target11am,
        staffId: staff1.id,
        customerId: testCustomer.id,
        subtotalPesewas: 30000,
        totalPesewas: 30000,
        depositRequiredPesewas: 15000,
        amountPaidPesewas: 15000,
        manageTokenHash: crypto.randomBytes(32).toString("hex"),
        items: {
          create: {
            serviceId: service!.id,
            pricePesewas: 30000,
            durationMin: 60,
          },
        },
      },
    });

    // Booking B for Staff 1 at target date 14:00 UTC
    const target2pm = new Date(target10am);
    target2pm.setUTCHours(14, 0, 0, 0);
    const target3pm = new Date(target10am);
    target3pm.setUTCHours(15, 0, 0, 0);

    conflictBookingB = await prisma.booking.create({
      data: {
        reference: `BK-CONF-B-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`,
        status: "CONFIRMED",
        source: "WEB",
        startUtc: target2pm,
        endUtc: target3pm,
        staffId: staff1.id,
        customerId: testCustomer.id,
        subtotalPesewas: 30000,
        totalPesewas: 30000,
        depositRequiredPesewas: 15000,
        amountPaidPesewas: 15000,
        manageTokenHash: crypto.randomBytes(32).toString("hex"),
        items: {
          create: {
            serviceId: service!.id,
            pricePesewas: 30000,
            durationMin: 60,
          },
        },
      },
    });

    // 4. Seed booking for Cancellation test
    const target4pm = new Date(target10am);
    target4pm.setUTCHours(16, 0, 0, 0);
    const target5pm = new Date(target10am);
    target5pm.setUTCHours(17, 0, 0, 0);

    cancelBooking = await prisma.booking.create({
      data: {
        reference: `BK-CAN-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`,
        status: "CONFIRMED",
        source: "WEB",
        startUtc: target4pm,
        endUtc: target5pm,
        staffId: staff1.id,
        customerId: testCustomer.id,
        subtotalPesewas: 25000,
        totalPesewas: 25000,
        depositRequiredPesewas: 12500,
        amountPaidPesewas: 12500,
        manageTokenHash: crypto.randomBytes(32).toString("hex"),
        items: {
          create: {
            serviceId: service!.id,
            pricePesewas: 25000,
            durationMin: 60,
          },
        },
      },
    });

    // 5. Seed booking specifically for Staff 2 (Yaa Asantewaa) for role scoping test
    const staff2BookingTime = new Date(target10am);
    staff2BookingTime.setUTCHours(12, 0, 0, 0);
    const staff2BookingEnd = new Date(target10am);
    staff2BookingEnd.setUTCHours(13, 0, 0, 0);

    staff2Booking = await prisma.booking.create({
      data: {
        reference: `BK-STAFF2-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`,
        status: "CONFIRMED",
        source: "WEB",
        startUtc: staff2BookingTime,
        endUtc: staff2BookingEnd,
        staffId: staff2.id,
        customerId: testCustomer.id,
        subtotalPesewas: 20000,
        totalPesewas: 20000,
        depositRequiredPesewas: 10000,
        amountPaidPesewas: 10000,
        manageTokenHash: crypto.randomBytes(32).toString("hex"),
        items: {
          create: {
            serviceId: service!.id,
            pricePesewas: 20000,
            durationMin: 60,
          },
        },
      },
    });
  });

  test.afterAll(async () => {
    // Clean up created test bookings
    if (testCustomer?.id) {
      await prisma.bookingItem.deleteMany({
        where: { booking: { customerId: testCustomer.id } },
      }).catch(() => {});
      await prisma.payment.deleteMany({
        where: { booking: { customerId: testCustomer.id } },
      }).catch(() => {});
      await prisma.booking.deleteMany({
        where: { customerId: testCustomer.id },
      }).catch(() => {});
      await prisma.customer.delete({
        where: { id: testCustomer.id },
      }).catch(() => {});
    }
  });

  test("1. Reschedule Conflict: shows conflict error when rescheduling onto an occupied slot", async ({ page }) => {
    page.on("pageerror", (err) => console.error("!!!PAGEERROR!!!", err.stack || err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error("!!!BROWSER_LOG_ERROR!!!", msg.text());
    });

    // Log in as Owner
    await page.goto("/login");
    await page.getByLabel("Email or Ghana Phone").fill("owner@aurastudio.gh");
    await page.getByLabel("Password", { exact: true }).fill("AuraStudio2026!Secure");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to Bookings module
    await page.goto("/bookings");
    await expect(page.getByRole("heading", { name: "Appointments & Bookings" })).toBeVisible();

    // Switch to List View to reliably find Booking B
    await page.getByRole("button", { name: "List View" }).click();

    // Search for Booking B
    const searchInput = page.getByPlaceholder("Search by client name, +233 phone, or BK-XXXX...");
    await searchInput.fill(conflictBookingB.reference);

    // Wait for search result and click table row
    const row = page.getByText(conflictBookingB.reference);
    await expect(row).toBeVisible();
    await row.click();

    // Booking Drawer opens
    await expect(page.getByText(conflictBookingB.reference).first()).toBeVisible();
    await expect(page.getByText("Quick Actions")).toBeVisible();

    // Click Reschedule button in Drawer
    await page.getByRole("button", { name: "Reschedule" }).click();
    await expect(page.getByText("Reschedule Appointment")).toBeVisible();

    // Set date to tomorrow date
    const targetDate = conflictBookingA;
    const aRecord = await prisma.booking.findUnique({ where: { id: targetDate.id } });
    const targetDateStr = aRecord!.startUtc.toISOString().split("T")[0];

    // Attempt to reschedule to 10:00 (the exact time of Booking A)
    const dateInput = page.locator('input[type="date"]');
    await dateInput.fill(targetDateStr);

    const timeInput = page.locator('input[type="time"]');
    await timeInput.fill("10:00");

    // Click Apply Reschedule
    await page.getByRole("button", { name: "Apply Reschedule" }).click();

    // Verify error banner is visible with conflict message
    await expect(
      page.getByText(/conflicting booking/i)
    ).toBeVisible();
  });

  test("2. Cancellation Flow: requires reason, marks CANCELLED and creates audit log", async ({ page }) => {
    // Log in as Owner
    await page.goto("/login");
    await page.getByLabel("Email or Ghana Phone").fill("owner@aurastudio.gh");
    await page.getByLabel("Password", { exact: true }).fill("AuraStudio2026!Secure");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to Bookings module
    await page.goto("/bookings");
    await expect(page.getByRole("heading", { name: "Appointments & Bookings" })).toBeVisible();
    await page.getByRole("button", { name: "List View" }).click();

    // Search for cancel target
    const searchInput = page.getByPlaceholder("Search by client name, +233 phone, or BK-XXXX...");
    await searchInput.fill(cancelBooking.reference);

    const row = page.getByText(cancelBooking.reference);
    await expect(row).toBeVisible();
    await row.click();

    // Drawer opens
    await expect(page.getByText(cancelBooking.reference).first()).toBeVisible();

    // Click Cancel Appointment button
    await page.getByRole("button", { name: "Cancel Appointment" }).click();
    await expect(page.getByRole("heading", { name: "Cancel Appointment" })).toBeVisible();

    // Fill mandatory cancellation reason
    const reasonText = "Client rescheduled wedding reception date to next month";
    await page.getByPlaceholder(/Client requested cancellation/i).fill(reasonText);

    // Confirm Cancellation
    await page.getByRole("button", { name: "Confirm Cancellation" }).click();

    // Drawer should refresh with Cancelled badge
    await expect(page.getByText("Cancelled").first()).toBeVisible();

    // Audit Trail should record cancellation with reason
    await expect(page.getByText(/STATUS_CANCELLED/i).first()).toBeVisible();
  });

  test("3. Role-Scoped Visibility: Staff receptionist only sees bookings assigned to themselves", async ({ page }) => {
    // Log in as Receptionist (staff2)
    await page.goto("/login");
    await page.getByLabel("Email or Ghana Phone").fill("reception@aurastudio.gh");
    await page.getByLabel("Password", { exact: true }).fill("StaffReception2026!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to Bookings module
    await page.goto("/bookings");
    await expect(page.getByRole("heading", { name: "Appointments & Bookings" })).toBeVisible();

    // Switch to List View
    await page.getByRole("button", { name: "List View" }).click();

    // Staff 2 should see their assigned appointment
    await expect(page.getByText(staff2Booking.reference, { exact: true })).toBeVisible();

    // Staff 2 should NOT see Staff 1's appointments
    await expect(page.getByText(conflictBookingA.reference, { exact: true })).toBeHidden();
  });
});
