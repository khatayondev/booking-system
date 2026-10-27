import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  getSettings,
  saveSettings,
  STUDIO_CURRENCY,
  STUDIO_TIMEZONE,
  updateSettingsSchema,
} from "@/lib/settings";
import { encryptSecret, decryptSecret, maskSecretKey } from "@/lib/encryption";
import { ROLES } from "@/lib/rbac";
import { AppError } from "@/lib/api-response";

describe("Prompt 7: Business Settings & Encryption Unit Tests", () => {
  beforeEach(async () => {
    // Clean up any modified settings from tests to ensure deterministic baseline
    await prisma.setting.deleteMany({
      where: {
        key: {
          in: [
            "business_name",
            "booking_slot_interval_min",
            "booking_minimum_notice_hours",
            "paystack_public_key",
            "paystack_secret_key",
          ],
        },
      },
    });
  });

  it("exposes typed getSettings() with fixed currency (GHS) and timezone (Africa/Accra)", async () => {
    const settings = await getSettings();

    expect(settings.currency).toBe(STUDIO_CURRENCY);
    expect(settings.currency).toBe("GHS");
    expect(settings.timezone).toBe(STUDIO_TIMEZONE);
    expect(settings.timezone).toBe("Africa/Accra");
    expect(settings.businessName).toBeDefined();
    expect(settings.openingHours.length).toBe(7);
    expect([15, 30, 60]).toContain(settings.slotIntervalMinutes);
  });

  it("encrypts and decrypts secret keys using AES-256-GCM authenticated cipher", () => {
    const rawSecret = "sk_live_9876543210fedcba";
    const encrypted = encryptSecret(rawSecret);

    expect(encrypted).not.toBe(rawSecret);
    expect(encrypted).toContain(":"); // iv:authTag:ciphertext

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawSecret);
  });

  it("masks secret keys securely for UI presentation", () => {
    const key = "sk_live_1234567890abcdef";
    const masked = maskSecretKey(key);

    expect(masked).toContain("sk_live_");
    expect(masked).toContain("••••••••");
    expect(masked.endsWith("cdef")).toBe(true);
    expect(masked).not.toContain("1234567890");
  });

  it("validates slotIntervalMinutes strictly permits only 15, 30, or 60 minutes", () => {
    // Valid values
    expect(updateSettingsSchema.safeParse({ slotIntervalMinutes: 15 }).success).toBe(true);
    expect(updateSettingsSchema.safeParse({ slotIntervalMinutes: 30 }).success).toBe(true);
    expect(updateSettingsSchema.safeParse({ slotIntervalMinutes: 60 }).success).toBe(true);

    // Invalid values
    expect(updateSettingsSchema.safeParse({ slotIntervalMinutes: 10 }).success).toBe(false);
    expect(updateSettingsSchema.safeParse({ slotIntervalMinutes: 45 }).success).toBe(false);
  });

  it("validates minimumNoticeHours (1 to 72) and maxDaysAhead (7 to 365)", () => {
    expect(updateSettingsSchema.safeParse({ minimumNoticeHours: 0 }).success).toBe(false);
    expect(updateSettingsSchema.safeParse({ minimumNoticeHours: 24 }).success).toBe(true);
    expect(updateSettingsSchema.safeParse({ minimumNoticeHours: 100 }).success).toBe(false);

    expect(updateSettingsSchema.safeParse({ maxDaysAhead: 5 }).success).toBe(false);
    expect(updateSettingsSchema.safeParse({ maxDaysAhead: 90 }).success).toBe(true);
  });

  it("validates Ghana SMS Sender ID cannot exceed 11 characters", () => {
    expect(updateSettingsSchema.safeParse({ smsSenderId: "AURA STUDIO" }).success).toBe(true);
    expect(updateSettingsSchema.safeParse({ smsSenderId: "AURA BEAUTY STUDIO GHANA" }).success).toBe(false);
  });

  it("rejects non-Owner role from updating payment credentials", async () => {
    const managerUser = {
      id: "manager-test-id",
      role: ROLES.MANAGER,
      name: "Test Manager",
    };

    await expect(
      saveSettings(
        {
          paystackSecretKey: "sk_live_new_secret_key_123",
        },
        managerUser
      )
    ).rejects.toThrowError(AppError);

    await expect(
      saveSettings(
        {
          paystackSecretKey: "sk_live_new_secret_key_123",
        },
        managerUser
      )
    ).rejects.toMatchObject({
      code: "PAYMENT_KEYS_OWNER_ONLY",
      statusCode: 403,
    });
  });

  it("allows Owner role to save settings with encrypted payment keys and audit logging", async () => {
    const seededOwner = await prisma.user.findUnique({
      where: { email: "owner@aurastudio.gh" },
    });

    const ownerUser = {
      id: seededOwner?.id || "owner-test-id",
      role: ROLES.OWNER_ADMIN,
      name: "Akosua Addo",
    };

    const updated = await saveSettings(
      {
        businessName: "Aura Luxury Beauty Lounge",
        minimumNoticeHours: 3,
        slotIntervalMinutes: 60,
        paystackPublicKey: "pk_live_test_pub_12345",
      },
      ownerUser
    );

    expect(updated.businessName).toBe("Aura Luxury Beauty Lounge");
    expect(updated.minimumNoticeHours).toBe(3);
    expect(updated.slotIntervalMinutes).toBe(60);

    // Verify stored in DB encrypted
    const dbRecord = await prisma.setting.findUnique({
      where: { key: "paystack_public_key" },
    });
    expect(dbRecord?.value).toContain(":"); // IV:Tag:Cipher format
    expect(decryptSecret(dbRecord!.value)).toBe("pk_live_test_pub_12345");

    // Verify audit log entry was written
    const audit = await prisma.auditLog.findFirst({
      where: { action: "SETTINGS_UPDATE" },
      orderBy: { createdAt: "desc" },
    });
    expect(audit).toBeDefined();
    expect(audit?.entityType).toBe("SETTING");
  });
});
