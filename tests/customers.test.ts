import { describe, it, expect, beforeAll } from "vitest";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { normalizeGhanaPhone } from "@/lib/sms";
import {
  listCustomers,
  getCustomerDetail,
  mergeCustomers,
  anonymizeOrDeleteCustomer,
  exportCustomersCsv,
} from "@/lib/customers/service";
import {
  PermissionContextUser,
  UserRole,
  DEFAULT_ROLE_PERMISSIONS,
  ROLES,
} from "@/lib/rbac";

describe("Prompt 16: Customer Management Module", () => {
  let ownerUser: PermissionContextUser;
  let managerUser: PermissionContextUser;
  let staffUser: PermissionContextUser;
  let testStaffId: string;
  let testServiceId: string;

  beforeAll(async () => {
    // 1. Setup test staff and service for booking test cases
    const uniqueSuffix = Date.now().toString().slice(-6);
    const staff = await prisma.staff.create({
      data: {
        name: `Customer Test Stylist ${uniqueSuffix}`,
        phone: `+23324${Math.floor(1000000 + Math.random() * 8999999)}`,
        active: true,
      },
    });
    testStaffId = staff.id;

    let category = await prisma.serviceCategory.findFirst();
    if (!category) {
      category = await prisma.serviceCategory.create({
        data: { name: "Lash & Brow Care", slug: `lash-brow-care-${uniqueSuffix}`, order: 1 },
      });
    }

    const service = await prisma.service.create({
      data: {
        name: `Lash Full Set ${uniqueSuffix}`,
        categoryId: category.id,
        durationMin: 90,
        pricePesewas: 35000, // GHS 350.00
        depositType: "NONE",
        depositValue: 0,
        active: true,
      },
    });
    testServiceId = service.id;

    // 2. Fetch or create users with different roles: OWNER_ADMIN, MANAGER, STAFF_RECEPTIONIST
    const ownerDbUser = await prisma.user.findFirst({
      where: { role: { name: ROLES.OWNER_ADMIN } },
      include: { role: true },
    });
    if (!ownerDbUser) throw new Error("Owner user not found in database");

    ownerUser = {
      userId: ownerDbUser.id,
      role: ownerDbUser.role.name as UserRole,
      staffId: testStaffId,
      permissions: [...DEFAULT_ROLE_PERMISSIONS[ROLES.OWNER_ADMIN]],
    };

    let managerDbUser = await prisma.user.findFirst({
      where: { role: { name: ROLES.MANAGER } },
      include: { role: true },
    });
    if (!managerDbUser) {
      const managerRole = await prisma.role.findUnique({ where: { name: ROLES.MANAGER } });
      managerDbUser = await prisma.user.create({
        data: {
          email: `test.manager.${uniqueSuffix}@auraspa.local`,
          name: "Test Manager",
          passwordHash: "hash",
          roleId: managerRole!.id,
          active: true,
        },
        include: { role: true },
      });
    }

    managerUser = {
      userId: managerDbUser.id,
      role: managerDbUser.role.name as UserRole,
      staffId: null,
      permissions: [...DEFAULT_ROLE_PERMISSIONS[ROLES.MANAGER]],
    };

    let staffDbUser = await prisma.user.findFirst({
      where: { role: { name: ROLES.STAFF_RECEPTIONIST } },
      include: { role: true },
    });
    if (!staffDbUser) {
      const staffRole = await prisma.role.findUnique({ where: { name: ROLES.STAFF_RECEPTIONIST } });
      staffDbUser = await prisma.user.create({
        data: {
          email: `test.staff.${uniqueSuffix}@auraspa.local`,
          name: "Test Staff",
          passwordHash: "hash",
          roleId: staffRole!.id,
          active: true,
        },
        include: { role: true },
      });
    }

    staffUser = {
      userId: staffDbUser.id,
      role: staffDbUser.role.name as UserRole,
      staffId: testStaffId,
      permissions: [...DEFAULT_ROLE_PERMISSIONS[ROLES.STAFF_RECEPTIONIST]],
    };
  });

  describe("1. Auto-create and merge customers by normalised phone from web and POS bookings", () => {
    it("merges guest bookings with differently formatted Ghana phone numbers into one single customer", async () => {
      // Different phone formats for the same customer:
      // Local format with spaces: "024 555 1234"
      // International without plus: "233245551234"
      // E.164: "+233245551234"
      const rawPhone1 = "024 555 1234";
      const rawPhone2 = "233245551234";
      const normalizedPhone = normalizeGhanaPhone(rawPhone1);
      expect(normalizedPhone).toBe("+233245551234");
      expect(normalizeGhanaPhone(rawPhone2)).toBe("+233245551234");

      // Booking 1: Web Booking using local format
      const customer1 = await prisma.customer.upsert({
        where: { phone: normalizedPhone },
        update: { name: "Adjoa Mensah" },
        create: {
          phone: normalizedPhone,
          name: "Adjoa Mensah",
          email: "adjoa.mensah@example.com",
        },
      });

      const uniqueRef1 = `AUR-WB-${Date.now().toString().slice(-4)}`;
      const booking1 = await prisma.booking.create({
        data: {
          reference: uniqueRef1,
          manageTokenHash: crypto.randomBytes(32).toString("hex"),
          customerId: customer1.id,
          staffId: testStaffId,
          startUtc: new Date(Date.now() + 1000000000),
          endUtc: new Date(Date.now() + 1000000000 + 90 * 60 * 1000),
          status: "CONFIRMED",
          source: "WEB",
          subtotalPesewas: 35000,
          totalPesewas: 35000,
          amountPaidPesewas: 10000,
          items: {
            create: {
              serviceId: testServiceId,
              pricePesewas: 35000,
              durationMin: 90,
            },
          },
        },
      });

      // Booking 2: POS Booking using raw international format
      const normPhone2 = normalizeGhanaPhone(rawPhone2);
      const customer2 = await prisma.customer.upsert({
        where: { phone: normPhone2 },
        update: {},
        create: {
          phone: normPhone2,
          name: "Adjoa M.",
        },
      });

      const uniqueRef2 = `AUR-POS-${Date.now().toString().slice(-4)}`;
      const booking2 = await prisma.booking.create({
        data: {
          reference: uniqueRef2,
          manageTokenHash: crypto.randomBytes(32).toString("hex"),
          customerId: customer2.id,
          staffId: testStaffId,
          startUtc: new Date(Date.now() + 1100000000),
          endUtc: new Date(Date.now() + 1100000000 + 90 * 60 * 1000),
          status: "CONFIRMED",
          source: "WALK_IN",
          subtotalPesewas: 35000,
          totalPesewas: 35000,
          amountPaidPesewas: 35000,
          items: {
            create: {
              serviceId: testServiceId,
              pricePesewas: 35000,
              durationMin: 90,
            },
          },
        },
      });

      // Verification: Both bookings link to the exact same customer ID!
      expect(customer1.id).toBe(customer2.id);
      expect(booking1.customerId).toBe(customer1.id);
      expect(booking2.customerId).toBe(customer1.id);

      // Verify customer detail includes both bookings
      const detail = await getCustomerDetail(customer1.id, staffUser);
      expect(detail.id).toBe(customer1.id);
      const bookingIds = detail.bookings.map((b) => b.id);
      expect(bookingIds).toContain(booking1.id);
      expect(bookingIds).toContain(booking2.id);
    });
  });

  describe("2. Customer Profile: Contact, visit count, spend, allergies, preferences, tags", () => {
    let customerWithAllergyId: string;

    it("creates a comprehensive profile with lash glue allergy notes and VIP/Bridal tags", async () => {
      const phone = `+23324${Math.floor(1000000 + Math.random() * 8999999)}`;
      const customer = await prisma.customer.create({
        data: {
          name: "Korkor Owusu",
          phone,
          email: "korkor.owusu@example.com",
          allergies: "Severe cyanoacrylate lash glue sensitivity; patch test required 48h prior",
          preferences: "Prefers warm chamomile tea, silent appointments, natural brown lash mapping",
          tags: ["VIP", "BRIDAL"],
          marketingConsent: true,
          marketingConsentAt: new Date(),
          notes: "Wedding date is December 15th at Kempinski Hotel",
        },
      });
      customerWithAllergyId = customer.id;

      // Add a completed booking in the past
      await prisma.booking.create({
        data: {
          reference: `AUR-PAST-${Date.now().toString().slice(-4)}`,
          manageTokenHash: crypto.randomBytes(32).toString("hex"),
          customerId: customer.id,
          staffId: testStaffId,
          startUtc: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          endUtc: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
          status: "COMPLETED",
          source: "WEB",
          subtotalPesewas: 50000, // GHS 500.00
          totalPesewas: 50000,
          amountPaidPesewas: 50000,
          items: {
            create: {
              serviceId: testServiceId,
              pricePesewas: 50000,
              durationMin: 60,
            },
          },
        },
      });

      // Add an upcoming booking
      const upcomingStart = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      await prisma.booking.create({
        data: {
          reference: `AUR-UP-${Date.now().toString().slice(-4)}`,
          manageTokenHash: crypto.randomBytes(32).toString("hex"),
          customerId: customer.id,
          staffId: testStaffId,
          startUtc: upcomingStart,
          endUtc: new Date(upcomingStart.getTime() + 90 * 60 * 1000),
          status: "CONFIRMED",
          source: "WEB",
          subtotalPesewas: 35000,
          totalPesewas: 35000,
          amountPaidPesewas: 10000,
          items: {
            create: {
              serviceId: testServiceId,
              pricePesewas: 35000,
              durationMin: 90,
            },
          },
        },
      });

      // Fetch customer detail via service
      const detail = await getCustomerDetail(customerWithAllergyId, staffUser);

      expect(detail.name).toBe("Korkor Owusu");
      expect(detail.allergies).toContain("Severe cyanoacrylate lash glue sensitivity");
      expect(detail.preferences).toContain("natural brown lash mapping");
      expect(detail.tags).toEqual(["VIP", "BRIDAL"]);
      expect(detail.marketingConsent).toBe(true);
      expect(detail.visitCount).toBe(2); // 1 completed + 1 confirmed
      expect(detail.lifetimeSpendPesewas).toBe(60000); // 50000 + 10000 paid
      expect(detail.lastVisit).not.toBeNull();
      expect(detail.upcomingBooking).not.toBeNull();
    });

    it("highlights allergy note on booking detail response so staff see it before appointment", async () => {
      // Create a booking for customer with allergy
      const start = new Date(Date.now() + 1200000000);
      const booking = await prisma.booking.create({
        data: {
          reference: `AUR-ALLERGY-${Date.now().toString().slice(-4)}`,
          manageTokenHash: crypto.randomBytes(32).toString("hex"),
          customerId: customerWithAllergyId,
          staffId: testStaffId,
          startUtc: start,
          endUtc: new Date(start.getTime() + 60 * 60 * 1000),
          status: "CONFIRMED",
          source: "WEB",
          subtotalPesewas: 35000,
          totalPesewas: 35000,
          amountPaidPesewas: 35000,
          items: {
            create: {
              serviceId: testServiceId,
              pricePesewas: 35000,
              durationMin: 60,
            },
          },
        },
        include: {
          customer: true,
        },
      });

      // Verify that booking's customer record contains the allergy note
      expect(booking.customer.allergies).toBe(
        "Severe cyanoacrylate lash glue sensitivity; patch test required 48h prior"
      );
      expect(booking.customer.tags).toEqual(["VIP", "BRIDAL"]);
    });
  });

  describe("3. Duplicate merge: Manager and above permission gating & atomic data migration", () => {
    let primaryCustId: string;
    let duplicateCustId: string;
    let dupBookingId: string;
    let dupReceiptId: string;

    beforeAll(async () => {
      const phoneA = `+23324${Math.floor(1000000 + Math.random() * 8999999)}`;
      const phoneB = `+23324${Math.floor(1000000 + Math.random() * 8999999)}`;

      const primary = await prisma.customer.create({
        data: {
          name: "Esi Coffie",
          phone: phoneA,
          email: "esi.coffie@primary.local",
          tags: ["VIP"],
          allergies: "Nut oil allergy",
          preferences: "Prefers morning slots",
          marketingConsent: true,
        },
      });
      primaryCustId = primary.id;

      const duplicate = await prisma.customer.create({
        data: {
          name: "Esi C.",
          phone: phoneB,
          email: "esi.duplicate@work.local",
          tags: ["BRIDAL"],
          allergies: "Lash glue sensitivity",
          preferences: "Prefers quiet appointments",
          notes: "Frequent walk-in guest",
        },
      });
      duplicateCustId = duplicate.id;

      // Add a booking under duplicate
      const b = await prisma.booking.create({
        data: {
          reference: `AUR-DUP-${Date.now().toString().slice(-4)}`,
          manageTokenHash: crypto.randomBytes(32).toString("hex"),
          customerId: duplicateCustId,
          staffId: testStaffId,
          startUtc: new Date(Date.now() + 1300000000),
          endUtc: new Date(Date.now() + 1300000000 + 60 * 60 * 1000),
          status: "CONFIRMED",
          source: "WALK_IN",
          subtotalPesewas: 20000,
          totalPesewas: 20000,
          amountPaidPesewas: 20000,
          items: {
            create: {
              serviceId: testServiceId,
              pricePesewas: 20000,
              durationMin: 60,
            },
          },
        },
      });
      dupBookingId = b.id;

      // Add a receipt under duplicate
      const r = await prisma.receipt.create({
        data: {
          receiptNumber: `RCP-DUP-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
          customerId: duplicateCustId,
          cashierId: managerUser.userId,
          customerName: "Esi C.",
          customerPhone: phoneB,
          status: "PAID",
          subtotalPesewas: 15000,
          totalPesewas: 15000,
          amountPaidPesewas: 15000,
          items: [
            {
              id: "item-1",
              name: "Aftercare Serum",
              quantity: 1,
              pricePesewas: 15000,
              type: "PRODUCT",
            },
          ],
          payments: [
            {
              method: "MOBILE_MONEY",
              amountPesewas: 15000,
            },
          ],
        },
      });
      dupReceiptId = r.id;
    });

    it("forbids Receptionist / Staff without CUSTOMERS_MERGE permission from merging duplicates", async () => {
      await expect(
        mergeCustomers(
          {
            primaryCustomerId: primaryCustId,
            duplicateCustomerId: duplicateCustId,
          },
          staffUser
        )
      ).rejects.toThrow(/Forbidden/);
    });

    it("allows Manager to merge duplicate, moving bookings & receipts and combining allergies & tags", async () => {
      const mergedResult = await mergeCustomers(
        {
          primaryCustomerId: primaryCustId,
          duplicateCustomerId: duplicateCustId,
        },
        managerUser
      );

      expect(mergedResult.id).toBe(primaryCustId);
      // Combined tags: VIP + BRIDAL
      expect(mergedResult.tags).toContain("VIP");
      expect(mergedResult.tags).toContain("BRIDAL");
      // Combined allergies preserved
      expect(mergedResult.allergies).toContain("Nut oil allergy");
      expect(mergedResult.allergies).toContain("Lash glue sensitivity");
      // Combined preferences preserved
      expect(mergedResult.preferences).toContain("Prefers morning slots");
      expect(mergedResult.preferences).toContain("Prefers quiet appointments");

      // Verify booking repointed to primary
      const updatedBooking = await prisma.booking.findUnique({
        where: { id: dupBookingId },
      });
      expect(updatedBooking?.customerId).toBe(primaryCustId);

      // Verify receipt repointed to primary
      const updatedReceipt = await prisma.receipt.findUnique({
        where: { id: dupReceiptId },
      });
      expect(updatedReceipt?.customerId).toBe(primaryCustId);

      // Verify duplicate record is soft-deleted
      const duplicateRecord = await prisma.customer.findUnique({
        where: { id: duplicateCustId },
      });
      expect(duplicateRecord?.deletedAt).not.toBeNull();
      expect(duplicateRecord?.phone).toContain("_merged_");

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: "CUSTOMER_MERGED",
          entityId: primaryCustId,
        },
        orderBy: { createdAt: "desc" },
      });
      expect(audit).not.toBeNull();
      expect(audit?.userId).toBe(managerUser.userId);
    });
  });

  describe("4. Ghana Data Protection Act (Act 843): Owner-only anonymise / erasure", () => {
    let customerToAnonymizeId: string;
    let customerBookingId: string;

    beforeAll(async () => {
      const phone = `+23324${Math.floor(1000000 + Math.random() * 8999999)}`;
      const customer = await prisma.customer.create({
        data: {
          name: "Serwaa Prempeh",
          phone,
          email: "serwaa.prempeh@privacy.test",
          allergies: "Latex allergy",
          preferences: "Likes chamomile tea",
          tags: ["VIP"],
          marketingConsent: true,
          notes: "Requested complete GDPR / Act 843 data erasure",
        },
      });
      customerToAnonymizeId = customer.id;

      // Create a booking with financial transaction
      const b = await prisma.booking.create({
        data: {
          reference: `AUR-DPA-${Date.now().toString().slice(-4)}`,
          manageTokenHash: crypto.randomBytes(32).toString("hex"),
          customerId: customer.id,
          staffId: testStaffId,
          startUtc: new Date(Date.now() + 1400000000),
          endUtc: new Date(Date.now() + 1400000000 + 60 * 60 * 1000),
          status: "CONFIRMED",
          source: "WEB",
          subtotalPesewas: 30000,
          totalPesewas: 30000,
          amountPaidPesewas: 30000,
          items: {
            create: {
              serviceId: testServiceId,
              pricePesewas: 30000,
              durationMin: 60,
            },
          },
        },
      });
      customerBookingId = b.id;
    });

    it("forbids Manager and Staff from performing Ghana Data Protection Act erasure", async () => {
      await expect(
        anonymizeOrDeleteCustomer(
          customerToAnonymizeId,
          { action: "ANONYMIZE", reason: "Client requested deletion" },
          managerUser
        )
      ).rejects.toThrow(/Studio Owner/);

      await expect(
        anonymizeOrDeleteCustomer(
          customerToAnonymizeId,
          { action: "ANONYMIZE", reason: "Client requested deletion" },
          staffUser
        )
      ).rejects.toThrow(/Studio Owner/);
    });

    it("allows Owner to anonymize customer: wipes PII while preserving financial history for accounting", async () => {
      const result = await anonymizeOrDeleteCustomer(
        customerToAnonymizeId,
        { action: "ANONYMIZE", reason: "Ghana Data Protection Act (Act 843) right to erasure" },
        ownerUser
      );

      expect(result.success).toBe(true);

      // Verify Customer record in database
      const anonymized = await prisma.customer.findUnique({
        where: { id: customerToAnonymizeId },
      });

      expect(anonymized).not.toBeNull();
      expect(anonymized?.isAnonymized).toBe(true);
      expect(anonymized?.anonymizedAt).not.toBeNull();
      // PII stripped:
      expect(anonymized?.name).toContain("Anonymized Client");
      expect(anonymized?.email).toBeNull();
      expect(anonymized?.allergies).toBeNull();
      expect(anonymized?.preferences).toBeNull();
      expect(anonymized?.notes).toBeNull();
      expect(anonymized?.tags).toEqual([]);
      expect(anonymized?.marketingConsent).toBe(false);

      // Accounting preservation: Booking still exists and is linked!
      const booking = await prisma.booking.findUnique({
        where: { id: customerBookingId },
      });
      expect(booking?.customerId).toBe(customerToAnonymizeId);
      expect(booking?.totalPesewas).toBe(30000);

      // Audit log recorded
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: "CUSTOMER_ANONYMIZED_ACT843",
          entityId: customerToAnonymizeId,
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.userId).toBe(ownerUser.userId);
    });
  });

  describe("5. CSV Export and Search / Filters", () => {
    it("forbids staff from exporting customer CSV", async () => {
      await expect(exportCustomersCsv({}, staffUser)).rejects.toThrow(/Forbidden/);
    });

    it("allows Manager with CUSTOMERS_EXPORT to generate valid CSV", async () => {
      const csv = await exportCustomersCsv({}, managerUser);
      expect(csv).toContain("Customer ID,Name,Phone,Email");
      expect(csv).toContain("Allergies & Sensitivities");
      expect(csv).toContain("Lifetime Spend (GHS)");
    });

    it("filters customers by tag, allergy, marketing consent, and search query", async () => {
      const results = await listCustomers({ tag: "VIP" }, staffUser);
      expect(Array.isArray(results.customers)).toBe(true);
      for (const c of results.customers) {
        expect(c.tags.map((t) => t.toUpperCase())).toContain("VIP");
      }

      const allergyResults = await listCustomers({ hasAllergies: true }, staffUser);
      for (const c of allergyResults.customers) {
        expect(c.allergies).not.toBeNull();
      }

      const consentResults = await listCustomers({ marketingConsent: true }, staffUser);
      for (const c of consentResults.customers) {
        expect(c.marketingConsent).toBe(true);
      }
    });
  });
});
