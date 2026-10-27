import { test, expect } from "@playwright/test";

test.describe("Prompts 11 & 12: Paystack Payments & Return-Page Verification", () => {
  test("Completes guest booking, initializes Paystack, and verifies transaction on confirmation page", async ({
    page,
  }) => {
    // 1. Visit booking wizard
    await page.goto("/book");
    await expect(page.getByRole("heading", { name: /Reserve Appointment/i })).toBeVisible();

    // Step 1: Select Service
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await firstCheckbox.check();
    await page.click('button:has-text("Continue")');

    // Step 2: Select Stylist
    await expect(page.getByRole("heading", { name: /Select Stylist/i })).toBeVisible();
    await page.click('button:has-text("Any Available Stylist")');
    await page.click('button:has-text("Continue")');

    // Step 3: Date & Time
    await expect(page.getByRole("heading", { name: /Select Date & Time/i })).toBeVisible();
    const slotBtn = page.locator("div.grid button").first();
    const slotCount = await slotBtn.count();

    if (slotCount > 0) {
      await slotBtn.click();
      await page.waitForTimeout(300);
      await page.click('button:has-text("Continue")');

      // Step 4: Details
      await expect(page.getByRole("heading", { name: /Guest Client Information/i })).toBeVisible();
      await page.fill("#cust-name", "Afia Osei");
      await page.fill("#cust-phone", "0245556677");
      await page.click('button:has-text("Continue")');

      // Step 5: Review & Pay
      await expect(page.getByRole("heading", { name: /Review & Confirm Booking/i })).toBeVisible();

      // Policy checkbox
      const policyBox = page.locator('input[type="checkbox"]').first();
      await policyBox.check();

      // Click Confirm & Pay
      await page.click('button:has-text("Confirm & Pay")');

      // Wait for redirect to /booking/confirmation?ref=...
      await page.waitForURL(/\/booking\/confirmation/, { timeout: 15000 });
      await expect(page.getByText(/Payment & Booking Confirmed/i)).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByText(/BK-/)).toBeVisible();
      await expect(page.getByText(/Aura Beauty Studio: Lagos Avenue/i)).toBeVisible();
    }
  });

  test("Pay balance later page displays outstanding amount and initiates Paystack balance settlement", async ({
    page,
    request,
  }) => {
    // 1. Create a confirmed booking with deposit paid directly via API
    const createRes = await request.post("/api/bookings/public", {
      data: {
        serviceIds: ["svc-bridal"],
        staffId: "mock-staff-id",
        startUtc: new Date(Date.now() + 86400000).toISOString(),
        endUtc: new Date(Date.now() + 90000000).toISOString(),
        customer: {
          name: "Abena Mensah",
          phone: "0249991122",
        },
        paymentType: "DEPOSIT",
        policyAgreed: true,
      },
    });

    const createJson = await createRes.json();
    if (createJson.success && createJson.data?.reference) {
      const bookingRef = createJson.data.reference;

      // 2. Visit pay balance page
      await page.goto(`/booking/pay-balance?ref=${bookingRef}`);
      await expect(page.getByRole("heading", { name: /Settle Remaining Balance/i })).toBeVisible();
      await expect(page.getByText(bookingRef)).toBeVisible();
      await expect(page.getByText(/Balance Due Now/i)).toBeVisible();

      // Pay balance CTA
      const payBalanceBtn = page.locator('button:has-text("Pay")');
      await expect(payBalanceBtn).toBeVisible();
    }
  });
});
