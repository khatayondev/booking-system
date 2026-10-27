import { test, expect } from "@playwright/test";

test.describe("Prompt 5: RBAC Management UI & Privilege Escalation E2E Tests", () => {
  test("Owner logs in, accesses /dashboard/users, views management UI and permission matrix", async ({ page }) => {
    // 1. Log in as Owner
    await page.goto("/login");
    await page.getByLabel("Email or Ghana Phone").fill("owner@aurastudio.gh");
    await page.getByLabel("Password").fill("AuraStudio2026!Secure");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Navigate to Users & Roles
    await page.goto("/dashboard/users");
    await expect(page.getByText("Users & Roles Management")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Staff User" })).toBeVisible();

    // 3. Switch to Permission Matrix tab
    await page.getByRole("tab", { name: /Permission Matrix/i }).click();
    await expect(page.getByText("Dynamic Server-Side Permission Matrix")).toBeVisible();
    await expect(page.getByText("Level 1: Owner/Admin")).toBeVisible();
    await expect(page.getByText("Level 2: Manager")).toBeVisible();
    await expect(page.getByText("Level 3: Staff/Receptionist")).toBeVisible();

    // Verify protected badge on roles.manage for Owner
    await expect(page.getByText("Protected", { exact: true })).toBeVisible();

    // 4. Switch back to Staff & Users tab
    await page.getByRole("tab", { name: /Staff & Users/i }).click();
    await expect(page.getByPlaceholder("Search staff by name")).toBeVisible();
  });

  test("Privilege Escalation Protection: Staff cannot access admin APIs directly", async ({ page }) => {
    // 1. Log in as Staff / Receptionist
    await page.goto("/login");
    await page.getByLabel("Email or Ghana Phone").fill("reception@aurastudio.gh");
    await page.getByLabel("Password").fill("StaffReception2026!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Attempt direct API calls using staff's session cookie
    // Call GET /api/admin/roles -> should be 403 Forbidden
    const rolesRes = await page.request.get("/api/admin/roles");
    expect(rolesRes.status()).toBe(403);
    const rolesJson = await rolesRes.json();
    expect(rolesJson.error.code).toBe("FORBIDDEN");

    // Call GET /api/admin/users -> should be 403 Forbidden
    const usersRes = await page.request.get("/api/admin/users");
    expect(usersRes.status()).toBe(403);
    const usersJson = await usersRes.json();
    expect(usersJson.error.code).toBe("FORBIDDEN");

    // Call GET /api/admin/audit -> should be 403 Forbidden
    const auditRes = await page.request.get("/api/admin/audit");
    expect(auditRes.status()).toBe(403);
    const auditJson = await auditRes.json();
    expect(auditJson.error.code).toBe("FORBIDDEN");

    // Call POST /api/admin/discounts/validate with 10% (exceeds Staff 5% limit) -> 403 Forbidden
    const discountRes = await page.request.post("/api/admin/discounts/validate", {
      data: { discountPercent: 10 },
    });
    expect(discountRes.status()).toBe(403);

    // Call POST /api/admin/refunds/validate with GH₵ 100 -> 403 Forbidden
    const refundRes = await page.request.post("/api/admin/refunds/validate", {
      data: { refundPesewas: 10000 },
    });
    expect(refundRes.status()).toBe(403);
  });
});
