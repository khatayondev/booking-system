import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { processPosCheckout, voidPosReceipt, getEndOfDaySummary } from "@/lib/pos/pos-service";
import { ROLES, type PermissionContextUser, DEFAULT_ROLE_PERMISSIONS, PERMISSION_KEYS } from "@/lib/rbac";
import type { PosCheckoutInput } from "@/lib/pos/types";

describe("Prompt 14: POS (Walk-ins and in-store checkout)", () => {
  let ownerUser: PermissionContextUser;
  let managerUser: PermissionContextUser;
  let staffUser: PermissionContextUser;
  let testServiceId: string;
  let testStaffId: string;

  beforeEach(async () => {
    // 1. Get permanent seeded users
    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: "owner@aurastudio.gh" },
    });
    const manager = await prisma.user.findUniqueOrThrow({
      where: { email: "manager@aurastudio.gh" },
    });
    const staff = await prisma.user.findUniqueOrThrow({
      where: { email: "reception@aurastudio.gh" },
    });

    ownerUser = { userId: owner!.id, role: ROLES.OWNER_ADMIN };
    managerUser = { userId: manager!.id, role: ROLES.MANAGER };
    staffUser = {
      userId: staff!.id,
      role: ROLES.STAFF_RECEPTIONIST,
      permissions: [
        ...DEFAULT_ROLE_PERMISSIONS[ROLES.STAFF_RECEPTIONIST],
        PERMISSION_KEYS.DISCOUNTS_APPLY,
        PERMISSION_KEYS.PAYMENTS_REFUND,
      ],
    };

    // 2. Get active service & addon
    const service = await prisma.service.findFirst({
      where: { active: true },
      include: { addons: true },
    });
    testServiceId = service!.id;

    const staffMember = await prisma.staff.findFirst({
      where: { active: true },
    });
    testStaffId = staffMember!.id;
  });

  describe("1. Split Payments Arithmetic & Balances", () => {
    it("correctly splits payment across Cash and MoMo and calculates cash change", async () => {
      // Subtotal: 300 GHS (30,000 pesewas)
      // Payment 1: Cash 150 GHS (15,000 pesewas), customer tenders 200 GHS (20,000 pesewas) -> Change 50 GHS (5,000 pesewas)
      // Payment 2: MoMo 150 GHS (15,000 pesewas)
      // Total Paid: 300 GHS, Balance: 0 GHS, Status: PAID
      const now = Date.now();
      const uniqueOffset = Math.floor(Math.random() * 500000) + 10000;
      const input: PosCheckoutInput = {
        customer: {
          name: "Akosua Mensah",
          phone: "0241112233",
        },
        staffId: testStaffId,
        isWalkIn: true,
        scheduledStartUtc: new Date(now + uniqueOffset * 60000).toISOString(),
        items: [
          {
            serviceId: testServiceId,
            serviceName: "Bridal Glam Styling",
            pricePesewas: 30000,
            durationMin: 60,
          },
        ],
        payments: [
          {
            method: "CASH",
            amountPesewas: 15000,
            tenderedPesewas: 20000,
          },
          {
            method: "MOBILE_MONEY",
            amountPesewas: 15000,
            provider: "MTN",
            reference: `MOMO-TEST-${now}-1`,
          },
        ],
      };

      const receipt = await processPosCheckout(input, ownerUser);

      expect(receipt.subtotalPesewas).toBe(30000);
      expect(receipt.totalPesewas).toBe(30000);
      expect(receipt.amountPaidPesewas).toBe(30000);
      expect(receipt.changePesewas).toBe(5000); // 20000 - 15000
      expect(receipt.balanceDuePesewas).toBe(0);
      expect(receipt.status).toBe("PAID");
      expect(receipt.payments).toHaveLength(2);
      expect(receipt.payments[0].method).toBe("CASH");
      expect(receipt.payments[0].changePesewas).toBe(5000);
      expect(receipt.payments[1].method).toBe("MOBILE_MONEY");
      expect(receipt.payments[1].reference).toBe(`MOMO-TEST-${now}-1`);
    });

    it("handles partial payment with remaining balance due and optional tips", async () => {
      // Subtotal: 200 GHS (20,000 pesewas), Tip: 20 GHS (2,000 pesewas) -> Total: 220 GHS (22,000 pesewas)
      // Paid: Card 100 GHS (10,000 pesewas)
      // Remaining Balance: 120 GHS (12,000 pesewas), Status: PARTIALLY_PAID
      const now = Date.now();
      const uniqueOffset = Math.floor(Math.random() * 500000) + 600000;
      const input: PosCheckoutInput = {
        customer: {
          name: "Kofi Boateng",
          phone: "0509876543",
        },
        staffId: testStaffId,
        isWalkIn: true,
        scheduledStartUtc: new Date(now + uniqueOffset * 60000).toISOString(),
        items: [
          {
            serviceId: testServiceId,
            serviceName: "Deluxe Pedicure",
            pricePesewas: 20000,
            durationMin: 45,
          },
        ],
        tipPesewas: 2000,
        payments: [
          {
            method: "CARD",
            amountPesewas: 10000,
            provider: "VISA",
            reference: `AUTH-SLIP-${now}-2`,
          },
        ],
      };

      const receipt = await processPosCheckout(input, managerUser);

      expect(receipt.subtotalPesewas).toBe(20000);
      expect(receipt.tipPesewas).toBe(2000);
      expect(receipt.totalPesewas).toBe(22000);
      expect(receipt.amountPaidPesewas).toBe(10000);
      expect(receipt.balanceDuePesewas).toBe(12000);
      expect(receipt.status).toBe("PARTIALLY_PAID");
    });

    it("successfully processes checkout for walk-in guest with no customerId or phone provided", async () => {
      const now = Date.now();
      const uniqueOffset = Math.floor(Math.random() * 500000) + 10000;
      const input: PosCheckoutInput = {
        // No customerId and no customer specified (anonymous walk-in)
        staffId: testStaffId,
        isWalkIn: true,
        scheduledStartUtc: new Date(now + uniqueOffset * 60000).toISOString(),
        items: [
          {
            serviceId: testServiceId,
            serviceName: "Walk-in Quick Service",
            pricePesewas: 14000,
            durationMin: 60,
          },
        ],
        payments: [
          {
            method: "CASH",
            amountPesewas: 14000,
            tenderedPesewas: 14000,
          },
        ],
      };

      const receipt = await processPosCheckout(input, ownerUser);

      expect(receipt.totalPesewas).toBe(14000);
      expect(receipt.amountPaidPesewas).toBe(14000);
      expect(receipt.status).toBe("PAID");
      expect(receipt.customerName).toBe("Walk-in Guest");
      expect(receipt.customerId).toBeDefined();
    });
  });

  describe("2. Role-Based Discount Limits & Reason Enforcement", () => {
    it("allows Staff up to 5% discount with reason, but rejects discounts > 5%", async () => {
      // 5% discount by Staff -> Allowed
      const now = Date.now();
      const allowedInput: PosCheckoutInput = {
        customer: { name: "Ama Serwaa", phone: "0271234567" },
        staffId: testStaffId,
        scheduledStartUtc: new Date(now + 1200000 * 60000).toISOString(),
        items: [{ serviceId: testServiceId, serviceName: "Lash Refill", pricePesewas: 10000, durationMin: 30 }],
        discountPercent: 5,
        discountReason: "Loyal customer returning",
        payments: [{ method: "CASH", amountPesewas: 9500 }],
      };

      const receipt = await processPosCheckout(allowedInput, staffUser);
      expect(receipt.discountPesewas).toBe(500);
      expect(receipt.totalPesewas).toBe(9500);

      // 10% discount by Staff -> Forbidden (Staff limit is 5%)
      const excessInput: PosCheckoutInput = {
        ...allowedInput,
        scheduledStartUtc: new Date(now + 1300000 * 60000).toISOString(),
        discountPercent: 10,
        payments: [{ method: "CASH", amountPesewas: 9000 }],
      };

      await expect(processPosCheckout(excessInput, staffUser)).rejects.toThrow(
        /exceeds your role's allowed maximum of 5%/
      );
    });

    it("allows Manager up to 20% discount with reason, but rejects discounts > 20%", async () => {
      // 20% discount by Manager -> Allowed
      const now = Date.now();
      const allowedInput: PosCheckoutInput = {
        customer: { name: "Yaw Osei", phone: "0245556677" },
        staffId: testStaffId,
        scheduledStartUtc: new Date(now + 1400000 * 60000).toISOString(),
        items: [{ serviceId: testServiceId, serviceName: "Bridal Gown Prep", pricePesewas: 20000, durationMin: 60 }],
        discountPercent: 20,
        discountReason: "Promotional event voucher",
        payments: [{ method: "CASH", amountPesewas: 16000 }],
      };

      const receipt = await processPosCheckout(allowedInput, managerUser);
      expect(receipt.discountPesewas).toBe(4000);
      expect(receipt.totalPesewas).toBe(16000);

      // 25% discount by Manager -> Forbidden (Manager limit is 20%)
      const excessInput: PosCheckoutInput = {
        ...allowedInput,
        scheduledStartUtc: new Date(now + 1500000 * 60000).toISOString(),
        discountPercent: 25,
        payments: [{ method: "CASH", amountPesewas: 15000 }],
      };

      await expect(processPosCheckout(excessInput, managerUser)).rejects.toThrow(
        /exceeds your role's allowed maximum of 20%/
      );
    });

    it("allows Owner up to 100% discount with reason", async () => {
      const now = Date.now();
      const ownerInput: PosCheckoutInput = {
        customer: { name: "VIP Partner", phone: "0201122334" },
        staffId: testStaffId,
        scheduledStartUtc: new Date(now + 1600000 * 60000).toISOString(),
        items: [{ serviceId: testServiceId, serviceName: "Full Glam", pricePesewas: 25000, durationMin: 60 }],
        discountPercent: 100,
        discountReason: "Owner courtesy VIP complimentary session",
        payments: [{ method: "CASH", amountPesewas: 0 }],
      };

      const receipt = await processPosCheckout(ownerInput, ownerUser);
      expect(receipt.discountPesewas).toBe(25000);
      expect(receipt.totalPesewas).toBe(0);
      expect(receipt.status).toBe("PAID");
    });

    it("strictly requires a reason when any discount is applied", async () => {
      const now = Date.now();
      const missingReasonInput: PosCheckoutInput = {
        customer: { name: "Test Reason", phone: "0243334455" },
        staffId: testStaffId,
        scheduledStartUtc: new Date(now + 1700000 * 60000).toISOString(),
        items: [{ serviceId: testServiceId, serviceName: "Service", pricePesewas: 10000, durationMin: 30 }],
        discountPercent: 5,
        discountReason: "", // Empty reason!
        payments: [{ method: "CASH", amountPesewas: 9500 }],
      };

      await expect(processPosCheckout(missingReasonInput, staffUser)).rejects.toThrow(
        /Reason is required when applying a discount/
      );
    });
  });

  describe("3. Sequential Gapless Receipt Numbers Under Concurrent Sales", () => {
    it("generates sequential receipt numbers with NO gaps across 10 concurrent checkouts", async () => {
      // Run 10 checkout transactions simultaneously in parallel
      const CONCURRENT_SALES_COUNT = 10;
      const baseTime = Date.now() + 2000000 * 60000;
      const checkoutPromises = Array.from({ length: CONCURRENT_SALES_COUNT }, (_, i) => {
        const input: PosCheckoutInput = {
          customer: {
            name: `Concurrent Client ${i + 1}`,
            phone: `024000${String(i + 1).padStart(4, "0")}`,
          },
          staffId: testStaffId,
          isWalkIn: true,
          scheduledStartUtc: new Date(baseTime + i * 3600000).toISOString(),
          items: [
            {
              serviceId: testServiceId,
              serviceName: "Express Manicure",
              pricePesewas: 5000,
              durationMin: 20,
            },
          ],
          payments: [
            {
              method: "CASH",
              amountPesewas: 5000,
            },
          ],
        };

        return processPosCheckout(input, staffUser);
      });

      const receipts = await Promise.all(checkoutPromises);

      // Extract receipt numbers
      const receiptNumbers = receipts.map((r) => r.receiptNumber);
      expect(receiptNumbers).toHaveLength(CONCURRENT_SALES_COUNT);

      // Verify all receipt numbers match format R-000123
      for (const num of receiptNumbers) {
        expect(num).toMatch(/^R-\d{6}$/);
      }

      // Verify uniqueness (no duplicate receipt numbers)
      const uniqueNumbers = new Set(receiptNumbers);
      expect(uniqueNumbers.size).toBe(CONCURRENT_SALES_COUNT);

      // Parse the numeric counter parts
      const numbers = receiptNumbers
        .map((num) => parseInt(num.replace("R-", ""), 10))
        .sort((a, b) => a - b);

      // Verify strict sequential gapless progression: each number = previous + 1
      for (let i = 1; i < numbers.length; i++) {
        expect(numbers[i]).toBe(numbers[i - 1] + 1);
      }
    });
  });

  describe("4. Voids & Refunds", () => {
    it("allows voiding a receipt with reason and permission, enforcing role refund limits", async () => {
      const now = Date.now();
      // Create a sale of 40 GHS (4,000 pesewas)
      const input: PosCheckoutInput = {
        customer: { name: "Void Test", phone: "0249998877" },
        staffId: testStaffId,
        scheduledStartUtc: new Date(now + 2500000 * 60000).toISOString(),
        items: [{ serviceId: testServiceId, serviceName: "Test Sale", pricePesewas: 4000, durationMin: 20 }],
        payments: [{ method: "CASH", amountPesewas: 4000 }],
      };
      const receipt = await processPosCheckout(input, staffUser);

      // Staff voiding 40 GHS (limit is 50 GHS / 5,000 pesewas) -> Allowed with reason
      const voided = await voidPosReceipt(receipt.id, "Customer changed mind before service started", staffUser);
      expect(voided.status).toBe("VOIDED");
      expect(voided.voidReason).toBe("Customer changed mind before service started");

      // Verify associated booking was cancelled
      const booking = await prisma.booking.findUnique({
        where: { id: voided.bookingId! },
      });
      expect(booking?.status).toBe("CANCELLED");
      expect(booking?.amountPaidPesewas).toBe(0);
    });

    it("rejects voiding if reason is missing", async () => {
      const now = Date.now();
      const input: PosCheckoutInput = {
        customer: { name: "Void Reason Test", phone: "0249998866" },
        staffId: testStaffId,
        scheduledStartUtc: new Date(now + 2600000 * 60000).toISOString(),
        items: [{ serviceId: testServiceId, serviceName: "Test Sale", pricePesewas: 3000, durationMin: 20 }],
        payments: [{ method: "CASH", amountPesewas: 3000 }],
      };
      const receipt = await processPosCheckout(input, staffUser);

      await expect(voidPosReceipt(receipt.id, "", staffUser)).rejects.toThrow(
        /A reason is required to void a receipt/
      );
    });

    it("enforces role refund limit on void: Staff cannot void a 100 GHS sale", async () => {
      const now = Date.now();
      // 100 GHS sale (10,000 pesewas)
      const input: PosCheckoutInput = {
        customer: { name: "Staff Refund Limit Test", phone: "0249998855" },
        staffId: testStaffId,
        scheduledStartUtc: new Date(now + 2700000 * 60000).toISOString(),
        items: [{ serviceId: testServiceId, serviceName: "Large Sale", pricePesewas: 10000, durationMin: 30 }],
        payments: [{ method: "CASH", amountPesewas: 10000 }],
      };
      const receipt = await processPosCheckout(input, managerUser);

      // Staff attempting to refund 100 GHS -> Exceeds Staff limit of 50 GHS
      await expect(voidPosReceipt(receipt.id, "Staff trying to refund", staffUser)).rejects.toThrow(
        /exceeds your role's allowed maximum of GH₵ 50.00/
      );

      // Manager can void 100 GHS (Manager limit is GH₵ 500.00)
      const managerVoided = await voidPosReceipt(receipt.id, "Manager authorized refund", managerUser);
      expect(managerVoided.status).toBe("VOIDED");
    });
  });

  describe("5. End of Day Summary", () => {
    it("aggregates Cash, MoMo, Card, Tips, and Voids correctly", async () => {
      const summary = await getEndOfDaySummary(undefined, managerUser);

      expect(summary.totalSalesCount).toBeGreaterThan(0);
      expect(summary.totalRevenuePesewas).toBeGreaterThan(0);
      expect(summary.methods.cash.transactionCount).toBeGreaterThan(0);
      expect(summary.methods.mobileMoney.transactionCount).toBeGreaterThan(0);
      expect(summary.methods.card.transactionCount).toBeGreaterThan(0);
      expect(summary.voids.count).toBeGreaterThan(0);
    });
  });
});
