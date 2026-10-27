import { test, expect } from "@playwright/test";

test.describe("Prompt 9: Availability Engine & Slot Holds E2E API", () => {
  test("computes availability slots and manages slot holds lifecycle", async ({ request }) => {
    // 1. Log in as Owner to retrieve active service IDs
    await request.post("/api/auth/login", {
      data: {
        identifier: "owner@aurastudio.gh",
        password: "AuraStudio2026!Secure",
      },
    });

    const catalogRes = await request.get("/api/admin/catalog");
    expect(catalogRes.ok()).toBe(true);
    const catalogJson = await catalogRes.json();
    expect(catalogJson.data.categories.length).toBeGreaterThan(0);

    const categoryWithServices = catalogJson.data.categories.find(
      (c: { services: Array<{ id: string }> }) => c.services && c.services.length > 0
    );
    expect(categoryWithServices).toBeDefined();
    const serviceId = categoryWithServices.services[0].id;

    // 2. Query available slots for the upcoming week
    const now = new Date();
    const nextWeekStart = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const nextWeekEnd = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const availRes = await request.get(
      `/api/availability?serviceIds=${serviceId}&startDate=${nextWeekStart}&endDate=${nextWeekEnd}&staffId=any`
    );
    expect(availRes.status()).toBe(200);
    const availJson = await availRes.json();

    expect(availJson.success).toBe(true);
    expect(availJson.data.slots).toBeDefined();
    expect(Array.isArray(availJson.data.slots)).toBe(true);
    expect(availJson.data.totalDurationMin).toBeGreaterThan(0);

    // If slots are available, test slot hold lifecycle
    if (availJson.data.slots.length > 0) {
      const slotIndex = test.info().project.name === "chromium" ? 0 : Math.min(2, availJson.data.slots.length - 1);
      const targetSlot = availJson.data.slots[slotIndex];

      // 3. Place a 10-minute hold on the slot
      const holdRes = await request.post("/api/availability/hold", {
        data: {
          serviceIds: [serviceId],
          staffId: targetSlot.staffId,
          startUtc: targetSlot.startUtc,
          endUtc: targetSlot.endUtc,
          holdDurationMin: 10,
        },
      });

      expect(holdRes.status()).toBe(201);
      const holdJson = await holdRes.json();
      expect(holdJson.success).toBe(true);
      expect(holdJson.data.token).toBeDefined();
      expect(holdJson.data.extendedCount).toBe(0);
      const holdToken = holdJson.data.token;

      // 4. Extend the hold once (+5 minutes)
      const extendRes = await request.post("/api/availability/hold/extend", {
        data: {
          token: holdToken,
          additionalMinutes: 5,
        },
      });

      expect(extendRes.status()).toBe(200);
      const extendJson = await extendRes.json();
      expect(extendJson.data.hold.extendedCount).toBe(1);

      // 5. Attempt second extension -> Must be rejected with 400
      const secondExtendRes = await request.post("/api/availability/hold/extend", {
        data: {
          token: holdToken,
          additionalMinutes: 5,
        },
      });

      expect(secondExtendRes.status()).toBe(400);
      const secondExtendJson = await secondExtendRes.json();
      expect(secondExtendJson.error.code).toBe("HOLD_ALREADY_EXTENDED");

      // 6. Explicitly release the hold
      const releaseRes = await request.delete(`/api/availability/hold?token=${holdToken}`);
      expect(releaseRes.status()).toBe(200);
      const releaseJson = await releaseRes.json();
      expect(releaseJson.data.released).toBe(true);
    }
  });

  test("validates required query parameters for availability API", async ({ request }) => {
    // Missing serviceIds
    const resNoServices = await request.get("/api/availability?startDate=2026-11-01&endDate=2026-11-05");
    expect(resNoServices.status()).toBe(400);

    // Missing dates
    const resNoDates = await request.get("/api/availability?serviceIds=some-id");
    expect(resNoDates.status()).toBe(400);
  });
});
