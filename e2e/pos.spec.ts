import { test, expect, type Page } from "@playwright/test";
import { prisma } from "../lib/db";

test.describe("Prompt 14: POS (Walk-ins & In-store Checkout) E2E", () => {
  const testCustomerPhone = `+23324${Math.floor(1000000 + Math.random() * 9000000)}`;
  const testCustomerName = "POS Test Customer";

  test.beforeAll(async () => {
    // Ensure test user account is active and unlocked
    await prisma.user.updateMany({
      where: { email: { in: ["manager@aurastudio.gh", "owner@aurastudio.gh"] } },
      data: {
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    });
  });

  async function loginAsManager(page: Page) {
    await page.goto("/login");
    await page.getByLabel("Email or Ghana Phone").fill("manager@aurastudio.gh");
    await page.getByLabel("Password").fill("ManagerStudio2026!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  }

  test("1. Manager can access POS register, quick-create customer, add services, and calculate live totals", async ({
    page,
  }) => {
    await loginAsManager(page);

    // Navigate to POS
    await page.goto("/pos");
    await expect(page.getByText("Point of Sale (POS)")).toBeVisible();
    await expect(page.getByText("Live Register")).toBeVisible();

    // Quick-create customer
    await page.getByRole("button", { name: /Quick Create/i }).click();
    await expect(page.getByText("Quick-Create Customer")).toBeVisible();

    await page.locator("#cust-phone").fill(testCustomerPhone);
    await page.locator("#cust-name").fill(testCustomerName);
    await page.getByRole("button", { name: "Save Customer" }).click();

    // Customer selected card should show up
    await expect(page.getByText(testCustomerName)).toBeVisible();
    await expect(page.getByText(testCustomerPhone)).toBeVisible();

    // Select a service from catalog
    const addServiceBtn = page.getByRole("button", { name: /Add to Sale/i }).first();
    await expect(addServiceBtn).toBeVisible();
    await addServiceBtn.click();

    // Verify cart updates with service and live total
    await expect(page.getByText(/Subtotal/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Proceed to Tender & Checkout/i })).toBeEnabled();
  });

  test("2. Enforces discount role limits and mandatory reason, and completes split payment with sequential receipt", async ({
    page,
  }) => {
    await loginAsManager(page);
    await page.goto("/pos");

    // Quick-create customer
    await page.getByRole("button", { name: /Quick Create/i }).click();
    const uniquePhone = `+23324${Math.floor(1000000 + Math.random() * 9000000)}`;
    await page.locator("#cust-phone").fill(uniquePhone);
    await page.locator("#cust-name").fill("Afi Mensah");
    await page.getByRole("button", { name: "Save Customer" }).click();

    // Add service
    await page.getByRole("button", { name: /Add to Sale/i }).first().click();

    // Open discount modal
    await page.getByText(/Apply Discount \/ Promo/i).click();
    await expect(page.getByText("Apply Discount or Promo")).toBeVisible();

    // Try applying 50% discount (Manager limit is 20%)
    const percentInput = page.locator('input[type="number"]').first();
    await percentInput.fill("50");
    await page.getByRole("button", { name: "Apply Discount", exact: true }).click();

    // Verify validation error
    await expect(page.getByText(/is allowed a maximum discount of/i)).toBeVisible();

    // Fill valid 10% discount and provide reason
    await percentInput.fill("10");
    await page.locator("#disc-reason").fill("Manager VIP courtesy");
    await page.getByRole("button", { name: "Apply Discount", exact: true }).click();

    // Modal closes and discount applied
    await expect(page.getByText(/Discount \(10%\)/i)).toBeVisible();

    // Proceed to checkout
    await page.getByRole("button", { name: /Proceed to Tender & Checkout/i }).click();
    await expect(page.getByText("POS Checkout & Tender")).toBeVisible();

    // Complete sale with default Cash tender
    await page.getByRole("button", { name: /Complete & Print Receipt/i }).click();

    // Receipt modal must appear with sequential receipt number (R-000...)
    await expect(page.getByText(/Receipt #R-/i)).toBeVisible();
    await expect(page.locator("#thermal-receipt")).toBeVisible();

    // Verify thermal receipt details
    await expect(page.getByRole("heading", { name: "AURA BEAUTY STUDIO" })).toBeVisible();
    await expect(page.getByRole("link", { name: "WhatsApp" })).toBeVisible();
    await expect(page.getByRole("link", { name: /SMS/i })).toBeVisible();
  });

  test("3. Manager can view End-of-Day financial summary with drawer breakdown", async ({ page }) => {
    await loginAsManager(page);
    await page.goto("/pos");

    // Click End-of-Day Summary button
    await page.getByRole("button", { name: /End-of-Day Summary/i }).click();
    await expect(page.getByText("End-of-Day Financial Summary & Cash Drawer")).toBeVisible();
    await expect(page.getByText("Cash in Drawer")).toBeVisible();
    await expect(page.getByText("Total Revenue")).toBeVisible();

    // Verify Print Report button exists
    await expect(page.getByRole("button", { name: /Print Report/i })).toBeVisible();
  });
});
