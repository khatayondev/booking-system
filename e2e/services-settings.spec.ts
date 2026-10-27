import { test, expect } from "@playwright/test";

test.describe("Prompt 7: Services, Add-ons & Business Settings E2E", () => {
  test("Owner views and manages Services catalogue and add-ons", async ({ page }) => {
    // 1. Log in as Owner
    await page.goto("/login");
    await page.getByLabel("Email or Ghana Phone").fill("owner@aurastudio.gh");
    await page.getByLabel("Password").fill("AuraStudio2026!Secure");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Navigate to Services page
    await page.goto("/services");
    await expect(page.getByText("Services & Pricing Catalogue")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Service" })).toBeVisible();

    // Verify existing seeded services and pricing formatted in GHS
    await expect(page.getByText("Bridal Soft Glam").first()).toBeVisible();
    await expect(page.getByText("GH₵ 550.00").first()).toBeVisible();
    await expect(page.getByText("Hybrid Volume Lash Full Set").first()).toBeVisible();

    // 3. Open Add Service Drawer
    await page.getByRole("button", { name: "Add Service" }).click();
    await expect(page.getByRole("heading", { name: "Add New Service" })).toBeVisible();
    await expect(page.getByText("Duration (Minutes) *")).toBeVisible();
    await expect(page.getByText("Deposit Policy")).toBeVisible();
    await expect(page.getByText("Who can perform this service?")).toBeVisible();

    // Close drawer
    await page.getByRole("button", { name: "Cancel" }).click();

    // 4. Open Categories Dialog & Reorder
    await page.getByRole("button", { name: "Categories" }).click();
    await expect(page.getByRole("heading", { name: "Manage Categories" })).toBeVisible();
    await expect(page.getByRole("button", { name: "New Category" })).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();

    // 5. Open Add-on dialog
    const addonBtn = page.getByTitle("Add an add-on item").first();
    if ((await addonBtn.count()) > 0) {
      await addonBtn.click();
      await expect(page.getByText("Add Add-On Item")).toBeVisible();
      await expect(page.getByText("Extra Time (Minutes)")).toBeVisible();
      await expect(page.getByText("Extra Price (GH₵) *")).toBeVisible();
      await page.getByRole("button", { name: "Cancel" }).click();
    }
  });

  test("Owner views and updates Business Settings", async ({ page }) => {
    // 1. Log in as Owner
    await page.goto("/login");
    await page.getByLabel("Email or Ghana Phone").fill("owner@aurastudio.gh");
    await page.getByLabel("Password").fill("AuraStudio2026!Secure");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Navigate to Settings page
    await page.goto("/settings");
    await expect(page.getByText("Business & Operating Settings")).toBeVisible();

    // 3. Check Profile tab & Regional Standards
    await expect(page.getByText("Currency: GHS (GH₵)")).toBeVisible();
    await expect(page.getByText("Timezone: Africa/Accra (GMT)")).toBeVisible();

    // 4. Check Booking Rules tab
    await page.getByRole("button", { name: /Booking Rules/i }).click();
    await expect(page.getByText("Slot Interval (Grid Granularity) *")).toBeVisible();
    await expect(page.getByRole("button", { name: "15 Minutes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "30 Minutes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "60 Minutes" })).toBeVisible();

    // 5. Check Cancellation Policy tab
    await page.getByRole("button", { name: /Cancellation Policy/i }).click();
    await expect(page.getByText("Free Cancellation Cutoff (Hours before appointment) *")).toBeVisible();
    await expect(page.getByText("Deposit Refund Policy *")).toBeVisible();

    // 6. Check Payment Keys tab (Owner Only)
    await page.getByRole("button", { name: /Payment Keys/i }).click();
    await expect(page.getByText("Paystack Gateway Credentials")).toBeVisible();
    await expect(page.getByText("Owner Access Only")).toBeVisible();
    await expect(page.getByText("Paystack Public Key (Client-Safe)")).toBeVisible();

    // 7. Check SMS Sender ID tab
    await page.getByRole("button", { name: /SMS Sender ID/i }).click();
    await expect(page.getByText("Ghana SMS Sender ID")).toBeVisible();
    await expect(page.getByPlaceholder("e.g. AURA STUDIO")).toBeVisible();

    // 8. Save Settings and verify toast
    await page.getByRole("button", { name: "Save All Changes" }).first().click();
    await expect(page.getByText(/Business settings saved/i)).toBeVisible();
  });

  test("Staff role is Read-Only across Catalogue and Business Settings", async ({ page }) => {
    // 1. Log in as Staff / Receptionist
    await page.goto("/login");
    await page.getByLabel("Email or Ghana Phone").fill("reception@aurastudio.gh");
    await page.getByLabel("Password").fill("StaffReception2026!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Visit /services -> should see Read-Only banner
    await page.goto("/services");
    await expect(page.getByText("Read-Only Mode:")).toBeVisible();
    // Buttons for adding services or categories must NOT be visible
    await expect(page.getByRole("button", { name: "Add Service" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Categories" })).toBeHidden();

    // 3. Visit /settings -> should see Read-Only banner
    await page.goto("/settings");
    await expect(page.getByText("Read-Only Mode:")).toBeVisible();
    // Save button must NOT be visible
    await expect(page.getByRole("button", { name: "Save All Changes" })).toBeHidden();

    // 4. Privilege Escalation Prevention on Server:
    // Attempting direct POST /api/admin/catalog/services as Staff -> 403 Forbidden
    const svcPostRes = await page.request.post("/api/admin/catalog/services", {
      data: {
        name: "Hacked VIP Hair Treatment",
        categoryId: "00000000-0000-0000-0000-000000000000",
        durationMin: 60,
        pricePesewas: 50000,
      },
    });
    expect(svcPostRes.status()).toBe(403);
    const svcJson = await svcPostRes.json();
    expect(svcJson.error.code).toBe("FORBIDDEN");

    // Attempting direct PATCH /api/admin/settings as Staff -> 403 Forbidden
    const settingsPatchRes = await page.request.patch("/api/admin/settings", {
      data: {
        businessName: "Hacked Salon",
      },
    });
    expect(settingsPatchRes.status()).toBe(403);
    const settingsJson = await settingsPatchRes.json();
    expect(settingsJson.error.code).toBe("FORBIDDEN");
  });
});
