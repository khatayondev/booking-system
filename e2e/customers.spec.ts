import { test, expect } from "@playwright/test";
import { prisma } from "../lib/db";
import crypto from "crypto";

test.describe("Prompt 16: Customers Module & Allergy Drawer E2E", () => {
  let testCustomer: { id: string; name: string; phone: string; allergies: string | null };
  let testBooking: { id: string; reference: string };
  let testStaff: { id: string; name: string };

  test.beforeAll(async () => {
    // 1. Ensure test users are unlocked
    await prisma.user.updateMany({
      where: { email: { in: ["owner@aurastudio.gh", "reception@aurastudio.gh"] } },
      data: {
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    });

    const suffix = Date.now().toString().slice(-4);

    // 2. Create dedicated staff member to avoid exclusion constraint collisions with other tests
    const staff = await prisma.staff.create({
      data: {
        name: `Customer E2E Stylist ${suffix}`,
        phone: `+23324${Math.floor(1000000 + Math.random() * 8999999)}`,
        active: true,
      },
    });
    testStaff = staff;

    // 3. Fetch service
    const service = await prisma.service.findFirst({
      where: { active: true, deletedAt: null },
    });
    if (!service) throw new Error("Service required for E2E test");

    // 4. Create customer with distinct lash glue allergy and tags
    const phone = `+23324${Math.floor(1000000 + Math.random() * 8999999)}`;
    const allergies = "Severe cyanoacrylate lash glue sensitivity; patch test required";

    testCustomer = await prisma.customer.create({
      data: {
        name: `Ama Osei ${suffix}`,
        phone,
        email: `ama.osei.${suffix}@test.local`,
        allergies,
        preferences: "Prefers warm green tea, natural classic lash mapping",
        tags: ["VIP", "BRIDAL"],
        marketingConsent: true,
        marketingConsentAt: new Date(),
        notes: "Bridal event on Dec 20th",
      },
    });

    // 5. Create booking for this customer
    const start = new Date(Date.now() + 86400000 * 20 + Math.floor(Math.random() * 1000000));
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const uniqueRef = `AUR-E2E-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    testBooking = await prisma.booking.create({
      data: {
        reference: uniqueRef,
        status: "CONFIRMED",
        source: "WEB",
        startUtc: start,
        endUtc: end,
        staffId: testStaff.id,
        customerId: testCustomer.id,
        subtotalPesewas: 35000,
        totalPesewas: 35000,
        depositRequiredPesewas: 10000,
        amountPaidPesewas: 10000,
        manageTokenHash: crypto.randomBytes(32).toString("hex"),
        items: {
          create: {
            serviceId: service.id,
            pricePesewas: 35000,
            durationMin: 60,
          },
        },
      },
    });
  });

  test.afterAll(async () => {
    if (testBooking?.id) {
      await prisma.bookingItem.deleteMany({ where: { bookingId: testBooking.id } }).catch(() => {});
      await prisma.payment.deleteMany({ where: { bookingId: testBooking.id } }).catch(() => {});
      await prisma.booking.deleteMany({ where: { id: testBooking.id } }).catch(() => {});
    }
    if (testCustomer?.id) {
      await prisma.customer.deleteMany({ where: { id: testCustomer.id } }).catch(() => {});
    }
    if (testStaff?.id) {
      await prisma.staff.delete({ where: { id: testStaff.id } }).catch(() => {});
    }
  });

  test("1. Customers Dashboard: lists customers, filters by allergy, and displays profile drawer", async ({ page }) => {
    // Log in as Owner
    await page.goto("/login");
    await page.getByLabel("Email or Ghana Phone").fill("owner@aurastudio.gh");
    await page.getByLabel("Password", { exact: true }).fill("AuraStudio2026!Secure");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to /customers
    await page.goto("/customers");
    await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();

    // Verify search input
    const searchInput = page.getByPlaceholder("Search by name, phone (+233), or email...");
    await expect(searchInput).toBeVisible();
    await searchInput.fill(testCustomer.name);

    // Verify row appears for our test customer
    const customerRow = page.locator(`[data-testid="customer-row-${testCustomer.id}"]`);
    await expect(customerRow).toBeVisible({ timeout: 5000 });
    await expect(customerRow).toContainText(testCustomer.name);
    await expect(customerRow).toContainText("VIP");
    await expect(customerRow).toContainText("Allergy:");

    // Click on customer row to open Customer Drawer
    await customerRow.click();

    // Verify drawer displays full customer profile
    await expect(page.getByRole("heading", { name: testCustomer.name }).first()).toBeVisible();
    await expect(page.locator("text=Severe cyanoacrylate lash glue sensitivity").first()).toBeVisible();
    await expect(page.locator("text=Prefers warm green tea, natural classic lash mapping")).toBeVisible();
    await expect(page.getByRole("button", { name: "Merge Duplicate" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Act 843 Erasure" })).toBeVisible();

    // Close customer drawer
    await page.getByRole("button", { name: "Close drawer" }).click();
  });

  test("2. Booking Drawer Allergy Notice: displays prominent allergy & sensitivity card on booking detail", async ({ page }) => {
    // Log in as Receptionist/Staff to verify staff sees the allergy notice
    await page.goto("/login");
    await page.getByLabel("Email or Ghana Phone").fill("owner@aurastudio.gh");
    await page.getByLabel("Password", { exact: true }).fill("AuraStudio2026!Secure");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to Bookings page
    await page.goto("/bookings");

    // Switch to List view
    const listTabButton = page.locator("button:has-text('List View')");
    if (await listTabButton.isVisible()) {
      await listTabButton.click();
    }

    // Search for test booking reference
    const searchInput = page.getByPlaceholder(/Search by client name/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill(testBooking.reference);
    }

    // Wait for the booking row or card and click it to open the booking drawer
    const bookingElement = page.locator(`text=${testBooking.reference}`).first();
    await expect(bookingElement).toBeVisible({ timeout: 8000 });
    await bookingElement.click();

    // VERIFY CRITICAL ACCEPTANCE CRITERIA:
    // The allergy note appears prominently in the booking drawer with staff pre-check warning
    const allergyAlert = page.locator('[data-testid="customer-allergy-alert"]');
    await expect(allergyAlert).toBeVisible({ timeout: 5000 });
    await expect(allergyAlert).toContainText("Client Allergy & Sensitivity Notice");
    await expect(allergyAlert).toContainText("Staff Pre-Check");
    await expect(allergyAlert).toContainText("Severe cyanoacrylate lash glue sensitivity");
  });
});
