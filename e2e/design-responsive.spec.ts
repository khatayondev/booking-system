import { test, expect } from "@playwright/test";

test.describe("/design Responsive Verification", () => {
  test("renders every component correctly at 1440px desktop width", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/design");

    // Topbar & Greeting
    await expect(page.getByText("Hi, Akosua!")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create" })).toBeVisible();

    // Floating Sidebar should be visible on desktop
    await expect(page.getByRole("complementary")).toBeVisible();

    // Verify key sections
    await expect(page.getByText("1. Buttons & Controls")).toBeVisible();
    await expect(page.getByText("2. Status Chips (Subtle Tints)")).toBeVisible();
    await expect(page.getByText("3. Card Variants (24–28px Radius)")).toBeVisible();
    await expect(page.getByText("4. KPI Cards with Mini Stat Tiles")).toBeVisible();
    await expect(page.getByText("5. Charts: Thin Black Line & Category Donut")).toBeVisible();
    await expect(page.getByText("6. Tabs & Data Table")).toBeVisible();
    await expect(page.getByText("7. Daily Checklist & Dashed 'Add' Card")).toBeVisible();
    await expect(page.getByText("8. Form Inputs & Date/Time Slot Picker")).toBeVisible();
    await expect(page.getByText("9. Dialog, Drawer, Toast, Skeleton & Empty State")).toBeVisible();

    // Verify table row
    await expect(page.getByText("Efua Mensah")).toBeVisible();
    await expect(page.getByText("Goddess Knotless Braids")).toBeVisible();
  });

  test("renders every component correctly at 360px mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/design");

    // Greeting visible on mobile
    await expect(page.getByText("Hi, Akosua!")).toBeVisible();

    // Hamburger button visible, desktop sidebar hidden
    const hamburger = page.getByRole("button", { name: "Open sidebar menu" });
    await expect(hamburger).toBeVisible();
    await expect(page.getByRole("complementary")).toBeHidden();

    // Test opening mobile drawer
    await hamburger.click();
    await expect(page.getByRole("dialog").getByText("AURA STUDIO")).toBeVisible();

    // Close drawer
    await page.getByRole("button", { name: "Close drawer" }).click();

    // Verify components still render cleanly in single-column mobile view
    await expect(page.getByText("1. Buttons & Controls")).toBeVisible();
    await expect(page.getByText("Daily Revenue")).toBeVisible();
    await expect(page.getByText("GH₵ 12,480.00")).toBeVisible();
  });
});
