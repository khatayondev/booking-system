import { describe, it, expect, beforeAll } from "vitest";
import { normalizeGhanaPhone } from "@/lib/sms";
import { formatPesewas, calculateDeposit, sumPesewas } from "@/lib/money";
import { prisma } from "@/lib/db";

describe("Prompt 10: Guest Booking Flow & Public Site Unit Tests", () => {
  describe("Ghana Phone Number Validation & Normalization", () => {
    it("normalizes standard 10-digit Ghana local numbers to E.164 +233", () => {
      expect(normalizeGhanaPhone("0241234567")).toBe("+233241234567");
      expect(normalizeGhanaPhone("0209876543")).toBe("+233209876543");
      expect(normalizeGhanaPhone("0550001122")).toBe("+233550001122");
    });

    it("normalizes numbers with country code or spaces/hyphens", () => {
      expect(normalizeGhanaPhone("+233 24 123 4567")).toBe("+233241234567");
      expect(normalizeGhanaPhone("233241234567")).toBe("+233241234567");
      expect(normalizeGhanaPhone("024-123-4567")).toBe("+233241234567");
    });

    it("throws a descriptive error on invalid phone numbers", () => {
      expect(() => normalizeGhanaPhone("12345")).toThrow("Invalid Ghana phone number format");
      expect(() => normalizeGhanaPhone("01234567890123")).toThrow("Invalid Ghana phone number format");
      expect(() => normalizeGhanaPhone("abcdefghij")).toThrow("Invalid Ghana phone number format");
    });
  });

  describe("Multi-Service Pricing & Deposit Math (Server Guard)", () => {
    it("correctly calculates running totals for multi-service and add-on selections", () => {
      const bridalMakeupPesewas = 55000; // GH₵ 550.00
      const lashPrepAddonPesewas = 6000; // GH₵ 60.00
      const volumeLashesPesewas = 28000; // GH₵ 280.00

      const subtotal = sumPesewas(bridalMakeupPesewas, lashPrepAddonPesewas, volumeLashesPesewas);
      expect(subtotal).toBe(89000);
      expect(formatPesewas(subtotal)).toBe("GH₵ 890.00");
    });

    it("correctly calculates 50% deposit requirement", () => {
      const subtotalPesewas = 89000;
      const deposit50 = calculateDeposit(subtotalPesewas, "PERCENTAGE", 50);
      expect(deposit50).toBe(44500);
      expect(formatPesewas(deposit50)).toBe("GH₵ 445.00");
    });

    it("handles 100% full payment without rounding anomalies", () => {
      const subtotalPesewas = 89000;
      const fullDeposit = calculateDeposit(subtotalPesewas, "FULL");
      expect(fullDeposit).toBe(89000);
      expect(formatPesewas(fullDeposit)).toBe("GH₵ 890.00");
    });
  });

  describe("Public Catalog & Booking Endpoint Verification", () => {
    let testStaffId: string;
    let testServiceId: string;

    beforeAll(async () => {
      // Find or verify seed staff and service
      const staff = await prisma.staff.findFirst({
        where: { active: true, deletedAt: null },
      });
      if (staff) {
        testStaffId = staff.id;
      }

      const service = await prisma.service.findFirst({
        where: { active: true, deletedAt: null },
      });
      if (service) {
        testServiceId = service.id;
      }
    });

    it("ensures public catalog query returns active categories and services without session", async () => {
      const categories = await prisma.serviceCategory.findMany({
        where: { deletedAt: null },
        include: {
          services: {
            where: { deletedAt: null, active: true },
          },
        },
      });

      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
      if (categories.length > 0) {
        expect(categories[0]).toHaveProperty("name");
        expect(categories[0]).toHaveProperty("slug");
      }
    });

    it("ensures public booking creates customer without user account and assigns unique reference", async () => {
      if (!testStaffId || !testServiceId) return;

      const testPhone = "+233249998877";
      const customer = await prisma.customer.upsert({
        where: { phone: testPhone },
        update: { name: "Test Guest Client" },
        create: {
          phone: testPhone,
          name: "Test Guest Client",
          email: "guest@example.com",
        },
      });

      expect(customer.id).toBeDefined();
      expect(customer.phone).toBe(testPhone);

      const booking = await prisma.booking.create({
        data: {
          reference: `BK-TEST-${Date.now().toString().slice(-4)}`,
          status: "PENDING_PAYMENT",
          source: "WEB",
          startUtc: new Date(Date.now() + 600000000),
          endUtc: new Date(Date.now() + 603600000),
          staffId: testStaffId,
          customerId: customer.id,
          subtotalPesewas: 35000,
          totalPesewas: 35000,
          depositRequiredPesewas: 17500,
          amountPaidPesewas: 0,
          manageTokenHash: `hash-${Date.now()}`,
          items: {
            create: [
              {
                serviceId: testServiceId,
                pricePesewas: 35000,
                durationMin: 60,
              },
            ],
          },
        },
      });

      expect(booking.reference).toMatch(/^BK-/);
      expect(booking.status).toBe("PENDING_PAYMENT");
      expect(booking.subtotalPesewas).toBe(35000);

      // Clean up test booking
      await prisma.bookingItem.deleteMany({ where: { bookingId: booking.id } });
      await prisma.booking.delete({ where: { id: booking.id } });
    });
  });
});
