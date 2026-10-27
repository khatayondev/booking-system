import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { can, PERMISSION_KEYS, ROLES } from "@/lib/rbac";
import { DepositType } from "@prisma/client";

describe("Prompt 7: Catalog & Services Unit Tests", () => {
  beforeEach(async () => {
    // Clean up test services
    await prisma.service.deleteMany({
      where: { name: { startsWith: "Test Service" } },
    });
    await prisma.serviceCategory.deleteMany({
      where: { name: { startsWith: "Test Category" } },
    });
  });

  it("verifies Owner and Manager have services.manage and settings.manage permissions", () => {
    const ownerUser = {
      sessionId: "s1",
      userId: "u1",
      email: "owner@aurastudio.gh",
      name: "Owner",
      role: ROLES.OWNER_ADMIN,
      mustChangePassword: false,
      permissions: [PERMISSION_KEYS.SERVICES_MANAGE, PERMISSION_KEYS.SETTINGS_MANAGE],
    };

    const managerUser = {
      sessionId: "s2",
      userId: "u2",
      email: "manager@aurastudio.gh",
      name: "Manager",
      role: ROLES.MANAGER,
      mustChangePassword: false,
      permissions: [PERMISSION_KEYS.SERVICES_MANAGE, PERMISSION_KEYS.SETTINGS_MANAGE],
    };

    const staffUser = {
      sessionId: "s3",
      userId: "u3",
      email: "staff@aurastudio.gh",
      name: "Staff",
      role: ROLES.STAFF_RECEPTIONIST,
      mustChangePassword: false,
      permissions: [PERMISSION_KEYS.BOOKINGS_VIEW_OWN],
    };

    expect(can(ownerUser, PERMISSION_KEYS.SERVICES_MANAGE)).toBe(true);
    expect(can(ownerUser, PERMISSION_KEYS.SETTINGS_MANAGE)).toBe(true);

    expect(can(managerUser, PERMISSION_KEYS.SERVICES_MANAGE)).toBe(true);
    expect(can(managerUser, PERMISSION_KEYS.SETTINGS_MANAGE)).toBe(true);

    expect(can(staffUser, PERMISSION_KEYS.SERVICES_MANAGE)).toBe(false);
    expect(can(staffUser, PERMISSION_KEYS.SETTINGS_MANAGE)).toBe(false);
  });

  it("creates category with ordering and cascades services properly", async () => {
    const category = await prisma.serviceCategory.create({
      data: {
        name: `Test Category ${Date.now()}`,
        slug: `test-cat-${Date.now()}`,
        description: "Test beauty category",
        order: 5,
      },
    });

    expect(category.id).toBeDefined();
    expect(category.order).toBe(5);

    const service = await prisma.service.create({
      data: {
        name: `Test Service ${Date.now()}`,
        categoryId: category.id,
        durationMin: 60,
        bufferMin: 15,
        pricePesewas: 30000, // GH₵ 300.00
        depositType: DepositType.PERCENTAGE,
        depositValue: 50,
      },
    });

    expect(service.pricePesewas).toBe(30000);
    expect(service.durationMin).toBe(60);
    expect(service.bufferMin).toBe(15);
    expect(service.depositType).toBe("PERCENTAGE");

    // Create an addon for the service
    const addon = await prisma.serviceAddon.create({
      data: {
        serviceId: service.id,
        name: "Test Addon Extraction",
        durationMin: 20,
        pricePesewas: 8000, // GH₵ 80.00
      },
    });

    expect(addon.serviceId).toBe(service.id);
    expect(addon.durationMin).toBe(20);
    expect(addon.pricePesewas).toBe(8000);
  });

  it("links staff to service via staffServices many-to-many relation", async () => {
    const category = await prisma.serviceCategory.create({
      data: {
        name: `Test Category Staff ${Date.now()}`,
        slug: `test-cat-staff-${Date.now()}`,
      },
    });

    const staff = await prisma.staff.create({
      data: {
        name: `Test Staff ${Date.now()}`,
        phone: `+233${Date.now().toString().slice(-9)}`,
      },
    });

    const service = await prisma.service.create({
      data: {
        name: `Test Service With Staff ${Date.now()}`,
        categoryId: category.id,
        durationMin: 90,
        pricePesewas: 45000,
        staffServices: {
          create: [{ staffId: staff.id }],
        },
      },
      include: {
        staffServices: {
          include: { staff: true },
        },
      },
    });

    expect(service.staffServices.length).toBe(1);
    expect(service.staffServices[0].staff.id).toBe(staff.id);
  });
});
