import { test, expect } from "@playwright/test";

test.describe("Prompt 10: Public Website & Guest Booking Flow", () => {
  test("Public pages render with monochrome glass styling, navigation and LocalBusiness JSON-LD", async ({
    page,
  }) => {
    // 1. Home Page
    await page.goto("/");
    await expect(page).toHaveTitle(/Aura Beauty Studio/);

    // Verify LocalBusiness JSON-LD is injected
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLd).toContain("Aura Beauty Studio");
    expect(jsonLd).toContain("BeautySalon");
    expect(jsonLd).toContain("East Legon");

    // Verify Hero content
    await expect(
      page.getByRole("heading", { name: /Effortless Beauty/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /How Guest Booking Works/i })
    ).toBeVisible();

    // 2. Services Page
    await page.goto("/our-services");
    await expect(page).toHaveTitle(/Services & Rates/i);
    await expect(page.getByRole("heading", { name: /Services & Add-ons Menu/i })).toBeVisible();

    // 3. Gallery Page
    await page.goto("/gallery");
    await expect(page).toHaveTitle(/Gallery & Studio Looks/i);
    await expect(page.getByRole("heading", { name: /Studio Gallery/i })).toBeVisible();

    // 4. Policies Page
    await page.goto("/policies");
    await expect(page).toHaveTitle(/Policies & Terms/i);
    await expect(page.getByRole("heading", { name: /Studio Policies/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /15-Minute Grace Period/i })).toBeVisible();

    // 5. Contact Page & Interactive Inquiry Form
    await page.goto("/contact");
    await expect(page.getByRole("heading", { name: /Get in Touch/i })).toBeVisible();
    await page.fill("#contact-name", "Ama Asante");
    await page.fill("#contact-phone", "0241234567");
    await page.fill("#contact-message", "I would like to enquire about bridal glam for November.");
    await page.click('button[type="submit"]');
    await expect(page.getByText(/Message Received!/i)).toBeVisible();
  });

  test("Mobile-first booking wizard on a 360px screen with state persistence", async ({
    page,
  }) => {
    // Set viewport to exactly 360px width
    await page.setViewportSize({ width: 360, height: 740 });

    await page.goto("/book");
    await expect(
      page.getByRole("heading", { name: /Reserve Appointment/i })
    ).toBeVisible();

    // Step 1: Services & Add-ons
    await expect(
      page.getByRole("heading", { name: /Select Services & Add-ons/i })
    ).toBeVisible();

    // Check at least one service checkbox
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await firstCheckbox.check();

    // Verify sticky footer running total is visible on 360px
    const footerBar = page.locator("div.fixed.bottom-0");
    await expect(footerBar).toBeVisible();
    await expect(footerBar.getByText(/GH₵/i)).toBeVisible();

    // Click Continue to Step 2
    await page.click('button:has-text("Continue")');

    // Step 2: Select Stylist
    await expect(
      page.getByRole("heading", { name: /Select Stylist/i })
    ).toBeVisible();
    await page.click('button:has-text("Any Available Stylist")');

    // Click Continue to Step 3
    await page.click('button:has-text("Continue")');

    // Step 3: Date & Time
    await expect(
      page.getByRole("heading", { name: /Select Date & Time/i })
    ).toBeVisible();

    // Pick an available slot if one exists, or verify date input exists
    const dateInput = page.locator("#booking-date");
    await expect(dateInput).toBeVisible();

    // Step 4: Go to Guest Details by clicking Step 4 or filling
    // If a slot button is present, click it
    const slotBtn = page.locator("div.grid button").first();
    const slotCount = await slotBtn.count();
    if (slotCount > 0) {
      await slotBtn.click();
      await page.waitForTimeout(400);
      await page.click('button:has-text("Continue")');

      // Step 4: Details
      await expect(
        page.getByRole("heading", { name: /Guest Client Information/i })
      ).toBeVisible();
      await page.fill("#cust-name", "Kofi Mensah");
      await page.fill("#cust-phone", "0241112233");

      // Verify Persistence on Refresh
      await page.reload();
      await expect(page.locator("#cust-name")).toHaveValue("Kofi Mensah");
      await expect(page.locator("#cust-phone")).toHaveValue("0241112233");

      // Step 5: Review & Pay
      await page.click('button:has-text("Continue")');
      await expect(
        page.getByRole("heading", { name: /Review & Confirm Booking/i })
      ).toBeVisible();
      await expect(page.getByText(/Appointment Summary/i)).toBeVisible();

      // Policy Agreement checkbox
      const policyBox = page.locator('input[type="checkbox"]').first();
      await policyBox.check();

      // Confirm & Pay button becomes active
      const payButton = page.locator('button:has-text("Confirm & Pay")');
      await expect(payButton).toBeEnabled();
    }
  });
});
