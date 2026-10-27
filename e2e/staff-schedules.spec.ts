import { test, expect } from "@playwright/test";

test.describe("Prompt 8: Staff & Schedules Management E2E", () => {
  test("Owner views staff profiles, specialties, and schedule editor", async ({ page }) => {
    // 1. Log in as Owner
    await page.goto("/login");
    await page.getByLabel("Email or Ghana Phone").fill("owner@aurastudio.gh");
    await page.getByLabel("Password").fill("AuraStudio2026!Secure");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Navigate to Staff & Schedules page
    await page.goto("/staff");
    await expect(page.getByRole("heading", { name: "Staff, Shifts & Rosters" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Team Member" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Bulk Block Holiday" })).toBeVisible();

    // 3. Verify seeded staff members are listed
    await expect(page.getByText("Akosua Addo").first()).toBeVisible();
    await expect(page.getByText("Jessica Kyei").first()).toBeVisible();

    // 4. Open Add Team Member drawer
    await page.getByRole("button", { name: "Add Team Member" }).click();
    await expect(page.getByRole("heading", { name: "Add New Staff Member" })).toBeVisible();
    await expect(page.getByText("Full Name *")).toBeVisible();
    await expect(page.getByText("Specialties (comma-separated)")).toBeVisible();
    await expect(page.getByText("Link to Login Account (Optional)")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    // 5. Open Weekly Schedule editor for Ama Serwaa
    const shiftsBtn = page.getByRole("button", { name: "Shifts", exact: true }).first();
    await shiftsBtn.click();
    await expect(page.getByText(/Weekly Schedule:/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Shift" }).first()).toBeVisible();

    // Verify weekdays and day structure
    await expect(page.getByText("Monday")).toBeVisible();
    await expect(page.getByText("Tuesday")).toBeVisible();
    await expect(page.getByText("Sunday")).toBeVisible();

    // Close schedule dialog
    await page.getByRole("button", { name: "Cancel" }).click();

    // 6. Open Bulk Holiday Block Dialog
    await page.getByRole("button", { name: "Bulk Block Holiday" }).click();
    await expect(page.getByRole("heading", { name: /Bulk Block Holiday/ })).toBeVisible();
    await expect(page.getByText("Holiday / Closure Name *")).toBeVisible();
    await expect(page.getByText("Holiday Date *")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("Staff/Receptionist has read-only access to staff directory and cannot modify schedules", async ({ page }) => {
    // 1. Log in as Receptionist (level 3 staff)
    await page.goto("/login");
    await page.getByLabel("Email or Ghana Phone").fill("reception@aurastudio.gh");
    await page.getByLabel("Password").fill("StaffReception2026!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Navigate to /staff
    await page.goto("/staff");
    await expect(page.getByRole("heading", { name: "Staff, Shifts & Rosters" })).toBeVisible();

    // 3. Verify Read-Only banner
    await expect(page.getByText("Read-Only Access")).toBeVisible();

    // 4. Mutation action buttons should be hidden for read-only staff
    await expect(page.getByRole("button", { name: "Add Team Member" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Bulk Block Holiday" })).not.toBeVisible();
  });
});
