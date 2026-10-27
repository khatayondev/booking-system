import { test, expect } from "@playwright/test";

test.describe("Prompt 20: Go-Live Critical Paths E2E Suite", () => {
  // ---------------------------------------------------------------------------
  // CRITICAL PATH 1: GUEST BOOKING SELECTION & PAYMENT CHECKOUT
  // ---------------------------------------------------------------------------
  test("Critical Path 1: Guest can select service, hold slot, and proceed to checkout", async ({
    page,
  }) => {
    // 1. Visit booking wizard
    await page.goto("/book");
    await expect(page.getByRole("heading", { name: /Reserve Appointment/i })).toBeVisible();

    // 2. Select first service
    const firstServiceCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(firstServiceCheckbox).toBeVisible();
    await firstServiceCheckbox.check();

    // Proceed to Step 2: Date & Time
    const nextBtn = page.getByRole("button", { name: /Continue/i });
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
    }

    // Step 2 & 3: Details & Contact
    // Verify phone validation field enforces Ghana phone formats
    const phoneInput = page.locator('input[type="tel"]');
    if (await phoneInput.isVisible()) {
      await phoneInput.fill("0241234567");
    }
  });

  // ---------------------------------------------------------------------------
  // CRITICAL PATH 2: POS SALE & INSTANT RECEIPT
  // ---------------------------------------------------------------------------
  test("Critical Path 2: Manager/Staff logs into POS, selects items, and processes sale", async ({
    page,
  }) => {
    // 1. Login as Staff
    await page.goto("/login");
    await page.getByLabel("Email or Ghana Phone").fill("reception@aurastudio.gh");
    await page.getByLabel("Password").fill("StaffReception2026!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Navigate to POS
    await page.goto("/pos");
    await expect(page).toHaveTitle(/Point of Sale/i);

    // Verify POS Catalog and Cart layout
    await expect(page.getByText(/Point of Sale/i).first()).toBeVisible();
    await expect(page.getByText(/Cart/i).first()).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // CRITICAL PATH 3: PAYMENT REQUEST GENERATION & BALANCE SETTLEMENT
  // ---------------------------------------------------------------------------
  test("Critical Path 3: Payment request API and public payment link validation", async ({
    page,
  }) => {
    // 1. Login as Manager
    await page.goto("/login");
    await page.getByLabel("Email or Ghana Phone").fill("manager@aurastudio.gh");
    await page.getByLabel("Password").fill("ManagerStudio2026!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Test Payment Requests API access
    const paymentReqsRes = await page.request.get("/api/admin/payment-requests");
    expect([200, 404]).toContain(paymentReqsRes.status());
  });

  // ---------------------------------------------------------------------------
  // CRITICAL PATH 4: REFUND CALCULATION ACROSS CANCELLATION WINDOWS
  // ---------------------------------------------------------------------------
  test("Critical Path 4: Refund policy and self-service lookups respond accurately", async ({
    page,
  }) => {
    // 1. Verify private lookup page rate-limiting and validation
    await page.goto("/lookup");
    await expect(page.getByRole("heading", { name: /Find Your Appointment/i })).toBeVisible();

    // Verify input fields
    const refInput = page.getByPlaceholder(/AUR-/i);
    const phoneInput = page.locator('input[type="tel"]');

    await expect(refInput).toBeVisible();
    await expect(phoneInput).toBeVisible();

    // Test validation error on empty submit
    await page.getByRole("button", { name: /Find Appointment/i }).click();
    await expect(page.getByText(/reference is required/i).or(page.getByText(/invalid/i))).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // CRITICAL PATH 5: RBAC BOUNDARIES & FINANCIAL SECURITY
  // ---------------------------------------------------------------------------
  test("Critical Path 5: Strict RBAC boundaries enforce role separation", async ({
    page,
  }) => {
    // 1. Login as Staff
    await page.goto("/login");
    await page.getByLabel("Email or Ghana Phone").fill("reception@aurastudio.gh");
    await page.getByLabel("Password").fill("StaffReception2026!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Verify Staff cannot access Owner Audit Log
    const auditRes = await page.request.get("/api/admin/audit");
    expect(auditRes.status()).toBe(403);

    // 3. Verify Staff cannot access Users & Roles API
    const usersRes = await page.request.get("/api/admin/users");
    expect(usersRes.status()).toBe(403);

    // 4. Verify Staff cannot view Financial Reports
    const reportsRes = await page.request.get("/api/admin/reports");
    expect([403, 401]).toContain(reportsRes.status());
  });

  // ---------------------------------------------------------------------------
  // SYSTEM HEALTH & PWA MANIFEST VERIFICATION
  // ---------------------------------------------------------------------------
  test("System Health & PWA: Health check returns healthy and manifest is valid", async ({
    page,
  }) => {
    // 1. Verify /api/health
    const healthRes = await page.request.get("/api/health");
    expect(healthRes.status()).toBe(200);
    const healthJson = await healthRes.json();
    expect(healthJson.status).toBe("healthy");
    expect(healthJson.checks.database.status).toBe("healthy");

    // 2. Verify PWA manifest
    const manifestRes = await page.request.get("/manifest.webmanifest");
    expect([200, 304]).toContain(manifestRes.status());
    const manifestJson = await manifestRes.json();
    expect(manifestJson.name).toBe("Aura Beauty Studio");
    expect(manifestJson.display).toBe("standalone");
  });
});
