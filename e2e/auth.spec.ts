import { test, expect } from "@playwright/test";

test.describe("Staff Authentication Flow", () => {
  test("redirects unauthenticated users from /dashboard to /login", async ({ page }) => {
    await page.goto("/dashboard");
    // Verify redirected to login page
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Staff Portal")).toBeVisible();
    await expect(page.getByLabel("Email or Ghana Phone")).toBeVisible();
  });

  test("shows generic error message on invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email or Ghana Phone").fill("unknown@aurastudio.gh");
    await page.getByLabel("Password").fill("IncorrectPassword999!");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText("Invalid credentials")).toBeVisible();
  });

  test("logs in seeded owner successfully and redirects to dashboard", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email or Ghana Phone").fill("owner@aurastudio.gh");
    await page.getByLabel("Password").fill("AuraStudio2026!Secure");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Verify successful authentication and landing on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/Hi, /)).toBeVisible();
  });
});
