import { test, expect } from "@playwright/test";

test.describe("Prompt 6: Dashboard Shell & Home Overview E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as Owner
    await page.goto("/login");
    await page.getByLabel("Email or Ghana Phone").fill("owner@aurastudio.gh");
    await page.getByLabel("Password").fill("AuraStudio2026!Secure");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("renders Header with Greeting, Create dropdown, Live Search, and Notification Bell", async ({ page }) => {
    // 1. Greeting
    await expect(page.getByText(/Hi, Akosua!/i)).toBeVisible();

    // 2. Black Create Dropdown
    const createButton = page.getByRole("button", { name: /^Create/i });
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Dropdown items
    await expect(page.getByText("New Booking")).toBeVisible();
    await expect(page.getByText("Payment Request")).toBeVisible();
    await expect(page.getByText("Walk-in Sale (POS)")).toBeVisible();

    // Close dropdown via Escape key
    await page.keyboard.press("Escape");
    await expect(page.getByText("New Booking")).toBeHidden();

    // 3. Global Search
    const searchTrigger = page.getByRole("button", { name: "Search bookings, customers, phone numbers" });
    await expect(searchTrigger).toBeVisible();
    await searchTrigger.click();

    // Verify search modal appears with correct placeholder
    const searchInput = page.getByPlaceholder(/Type customer name, \+233 phone, or AURA-2026.../i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Efua");

    // Wait for debounce and search results
    await expect(page.getByText("Efua Mensah").first()).toBeVisible();

    // Close search modal
    await page.keyboard.press("Escape");
    await expect(page.getByText("Global Search")).toBeHidden();

    // 4. Notification Bell
    const bellButton = page.getByRole("button", { name: "Notifications" });
    await expect(bellButton).toBeVisible();
    await bellButton.click();
    await expect(page.getByText("Live Studio Feed")).toBeVisible();
    await expect(page.getByText("Mark all as read")).toBeVisible();
  });

  test("renders all 6 Dashboard Widgets with live data", async ({ page }) => {
    // Widget 1: Overall Information (Dark Card)
    await expect(page.getByText("Overall Information", { exact: false })).toBeVisible();
    await expect(page.getByText("Studio Total")).toBeVisible();
    await expect(page.getByText("Completed client appointments to date")).toBeVisible();
    await expect(page.locator("span").filter({ hasText: /^Pending Payments$/ })).toBeVisible();
    await expect(page.locator("span").filter({ hasText: /^Today's$/ })).toBeVisible();

    // Widget 2: Weekly Progress Line Chart
    await expect(page.getByText("Weekly Progress", { exact: false })).toBeVisible();
    await expect(page.getByText("This week vs last week", { exact: false })).toBeVisible();
    // Verify day axis indicators (M, T, W, T, F, S, S)
    await expect(page.getByText("M", { exact: true }).first()).toBeVisible();

    // Widget 3: Month Progress Ring
    await expect(page.getByRole("heading", { name: "Month Progress" })).toBeVisible();
    await expect(page.getByText("Revenue target tracking")).toBeVisible();
    await expect(page.getByRole("button", { name: /Download Report/i })).toBeVisible();

    // Open Download Report modal
    await page.getByRole("button", { name: /Download Report/i }).click();
    await expect(page.getByText("Download Operations & Revenue Report")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    // Widget 4: Today Checklist Card
    await expect(page.getByRole("heading", { name: "Today's Appointments" })).toBeVisible();
    // Look for checkbox item or tick action
    const checklistItems = page.locator("button[title*='Toggle completion']");
    if ((await checklistItems.count()) > 0) {
      const firstCheck = checklistItems.first();
      await firstCheck.click();
      // Verify toast notification appears
      await expect(page.locator("text=Appointment").first()).toBeVisible();
    }

    // Widget 5: Pending Payments Cards
    await expect(page.getByRole("heading", { name: "Pending Payments" })).toBeVisible();
    await expect(page.getByText("Add Booking").first()).toBeVisible();
    const balanceDueElements = page.getByText("Balance Due");
    if ((await balanceDueElements.count()) > 0) {
      await expect(balanceDueElements.first()).toBeVisible();
    }

    // Remind button action
    const remindButtons = page.getByRole("button", { name: /Send Reminder/i });
    if ((await remindButtons.count()) > 0) {
      await remindButtons.first().click();
      // Should show SMS reminder toast
      await expect(page.locator("text=Reminder sent").first()).toBeVisible();
    }

    // Widget 6: Latest Bookings
    await expect(page.getByRole("heading", { name: "Latest Bookings" })).toBeVisible();
    // View toggle (Grid / List)
    const listToggle = page.getByRole("button", { name: "List view" });
    await expect(listToggle).toBeVisible();
    await listToggle.click();

    // Sort by dropdown
    const sortDropdown = page.locator("button:has-text('Most Recent')");
    await expect(sortDropdown).toBeVisible();
  });

  test("stacks cleanly on mobile viewport (360px)", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/dashboard");

    // Greeting visible on mobile
    await expect(page.getByText(/Hi, Akosua!/i)).toBeVisible();

    // Mobile menu trigger exists
    await expect(page.getByRole("button", { name: "Open sidebar menu" })).toBeVisible();

    // Widgets stack cleanly
    await expect(page.getByText("Overall Information")).toBeVisible();
    await expect(page.getByText("Weekly Progress")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Month Progress" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Today's Appointments" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pending Payments" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Latest Bookings" })).toBeVisible();
  });

  test("scopes data by RBAC for Staff role without view_all", async ({ page }) => {
    // Log in as Staff
    await page.goto("/login");
    await page.getByLabel("Email or Ghana Phone").fill("reception@aurastudio.gh");
    await page.getByLabel("Password").fill("StaffReception2026!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify Greeting for Staff
    await expect(page.getByText(/Hi, /i)).toBeVisible();

    // Desk scoped badge on Widget 1
    await expect(page.getByText("My Desk")).toBeVisible();
  });
});
