import {
  PrismaClient,
  DepositType,
  BookingStatus,
  BookingSource,
  PaymentStatus,
} from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { PERMISSION_KEYS, DEFAULT_ROLE_PERMISSIONS, ROLES } from "../lib/rbac";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Seed Roles
  const ownerRole = await prisma.role.upsert({
    where: { name: ROLES.OWNER_ADMIN },
    update: {},
    create: {
      name: ROLES.OWNER_ADMIN,
      description: "Full administrative and financial access to the studio",
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: ROLES.MANAGER },
    update: {},
    create: {
      name: ROLES.MANAGER,
      description: "Operational manager for bookings, staff shifts, POS, and inventory",
    },
  });

  const staffRole = await prisma.role.upsert({
    where: { name: ROLES.STAFF_RECEPTIONIST },
    update: {},
    create: {
      name: ROLES.STAFF_RECEPTIONIST,
      description: "Front-desk receptionist and service staff member",
    },
  });

  // 2. Seed Permissions
  const allPermissions = Object.values(PERMISSION_KEYS);
  for (const permName of allPermissions) {
    const perm = await prisma.permission.upsert({
      where: { name: permName },
      update: {},
      create: {
        name: permName,
        description: `Permission to ${permName}`,
      },
    });

    // Owner gets all
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: ownerRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: ownerRole.id,
        permissionId: perm.id,
      },
    });

    // Manager default permissions
    if (DEFAULT_ROLE_PERMISSIONS[ROLES.MANAGER].includes(permName)) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: managerRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: managerRole.id,
          permissionId: perm.id,
        },
      });
    }

    // Staff default permissions
    if (DEFAULT_ROLE_PERMISSIONS[ROLES.STAFF_RECEPTIONIST].includes(permName)) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: staffRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: staffRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // 3. Seed Users with Argon2id hash
  const ownerPasswordHash = await hash("AuraStudio2026!Secure");
  const ownerUser = await prisma.user.upsert({
    where: { email: "owner@aurastudio.gh" },
    update: {
      passwordHash: ownerPasswordHash,
      phone: "+233241112233",
    },
    create: {
      email: "owner@aurastudio.gh",
      phone: "+233241112233",
      name: "Akosua Addo",
      passwordHash: ownerPasswordHash,
      roleId: ownerRole.id,
      mustChangePassword: false,
    },
  });

  const staffPasswordHash = await hash("StaffReception2026!");
  await prisma.user.upsert({
    where: { email: "reception@aurastudio.gh" },
    update: {
      passwordHash: staffPasswordHash,
      phone: "+233245556677",
      active: true,
      deletedAt: null,
    },
    create: {
      email: "reception@aurastudio.gh",
      phone: "+233245556677",
      name: "Abena Serwaa",
      passwordHash: staffPasswordHash,
      roleId: staffRole.id,
      mustChangePassword: false,
      active: true,
    },
  });

  const managerPasswordHash = await hash("ManagerStudio2026!");
  await prisma.user.upsert({
    where: { email: "manager@aurastudio.gh" },
    update: {
      passwordHash: managerPasswordHash,
      phone: "+233248889900",
      active: true,
      deletedAt: null,
    },
    create: {
      email: "manager@aurastudio.gh",
      phone: "+233248889900",
      name: "Kojo Mensah",
      passwordHash: managerPasswordHash,
      roleId: managerRole.id,
      mustChangePassword: false,
      active: true,
    },
  });

  // 4. Seed Categories
  const makeupCat = await prisma.serviceCategory.upsert({
    where: { slug: "makeup" },
    update: {},
    create: {
      name: "Makeup & Bridal Glam",
      slug: "makeup",
      description: "Professional makeup for weddings, events, photoshoots, and natural glam.",
    },
  });

  const lashCat = await prisma.serviceCategory.upsert({
    where: { slug: "lash-tech" },
    update: {},
    create: {
      name: "Lash Tech & Brow Art",
      slug: "lash-tech",
      description: "Classic, hybrid, and mega volume eyelash extensions and microshading.",
    },
  });

  const hairCat = await prisma.serviceCategory.upsert({
    where: { slug: "hair" },
    update: {},
    create: {
      name: "Hair Styling & Braids",
      slug: "hair",
      description: "Knotless braids, luxury wig installs, silk presses, and treatments.",
    },
  });

  const dressCat = await prisma.serviceCategory.upsert({
    where: { slug: "dress-and-fashion" },
    update: {},
    create: {
      name: "Dress & Fashion Rental",
      slug: "dress-and-fashion",
      description: "Designer evening gowns, luxury bridal robes, and traditional fashion rentals.",
    },
  });

  // 5. Seed Services (idempotent find or create)
  let bridalMakeup = await prisma.service.findFirst({ where: { name: "Bridal Soft Glam" } });
  if (!bridalMakeup) {
    bridalMakeup = await prisma.service.create({
      data: {
        name: "Bridal Soft Glam",
        categoryId: makeupCat.id,
        description: "Skin-prep, HD waterproof foundation, custom lash clusters, and touch-up kit.",
        durationMin: 90,
        bufferMin: 15,
        pricePesewas: 55000, // GH₵ 550.00
        depositType: DepositType.PERCENTAGE,
        depositValue: 50, // 50% deposit
      },
    });
  }

  let hybridLashes = await prisma.service.findFirst({ where: { name: "Hybrid Volume Lash Full Set" } });
  if (!hybridLashes) {
    hybridLashes = await prisma.service.create({
      data: {
        name: "Hybrid Volume Lash Full Set",
        categoryId: lashCat.id,
        description: "Full textured mix of classic individual lashes and volume fans.",
        durationMin: 90,
        bufferMin: 15,
        pricePesewas: 28000, // GH₵ 280.00
        depositType: DepositType.PERCENTAGE,
        depositValue: 50,
      },
    });
  }

  let knotlessBraids = await prisma.service.findFirst({ where: { name: "Goddess Knotless Braids (Mid-Back)" } });
  if (!knotlessBraids) {
    knotlessBraids = await prisma.service.create({
      data: {
        name: "Goddess Knotless Braids (Mid-Back)",
        categoryId: hairCat.id,
        description: "Painless knotless technique with human hair curly curls attached.",
        durationMin: 180,
        bufferMin: 30,
        pricePesewas: 35000, // GH₵ 350.00
        depositType: DepositType.PERCENTAGE,
        depositValue: 50,
      },
    });
  }

  let dressRental = await prisma.service.findFirst({ where: { name: "Luxury Emerald Velvet Evening Gown" } });
  if (!dressRental) {
    dressRental = await prisma.service.create({
      data: {
        name: "Luxury Emerald Velvet Evening Gown",
        categoryId: dressCat.id,
        description: "3-day weekend gala rental including complimentary dry cleaning and fitting.",
        durationMin: 60,
        bufferMin: 30,
        pricePesewas: 45000, // GH₵ 450.00
        depositType: DepositType.FULL, // Full rental deposit
        depositValue: 100,
      },
    });
  }

  // 6. Seed Staff and Schedules (idempotent)
  const staff1 = await prisma.staff.upsert({
    where: { userId: ownerUser.id },
    update: { phone: "+233241112233" },
    create: {
      name: "Akosua Addo",
      phone: "+233241112233",
      bio: "Master Bridal Makeup Artist & Founder with 9 years experience.",
      userId: ownerUser.id,
    },
  });
  await prisma.staffService.upsert({
    where: { staffId_serviceId: { staffId: staff1.id, serviceId: bridalMakeup.id } },
    update: {},
    create: { staffId: staff1.id, serviceId: bridalMakeup.id },
  });

  let staff2 = await prisma.staff.findFirst({ where: { phone: "+233504445566" } });
  if (!staff2) {
    staff2 = await prisma.staff.create({
      data: {
        name: "Yaa Asantewaa",
        phone: "+233504445566",
        bio: "Senior Hairstylist and Braiding Specialist.",
        staffServices: {
          create: [{ serviceId: knotlessBraids.id }],
        },
      },
    });
  }

  let staff3 = await prisma.staff.findFirst({ where: { phone: "+233207778899" } });
  if (!staff3) {
    staff3 = await prisma.staff.create({
      data: {
        name: "Jessica Kyei",
        phone: "+233207778899",
        bio: "Certified Eyelash Technician & Brow Artist.",
        staffServices: {
          create: [{ serviceId: hybridLashes.id }],
        },
      },
    });
  }

  // Seed weekly schedules (Monday = 1 through Saturday = 6 from 09:00 to 18:00)
  const staffMembers = [staff1, staff2, staff3];
  for (const staff of staffMembers) {
    for (let weekday = 1; weekday <= 6; weekday++) {
      const existing = await prisma.staffSchedule.findFirst({
        where: { staffId: staff.id, weekday },
      });
      if (!existing) {
        await prisma.staffSchedule.create({
          data: {
            staffId: staff.id,
            weekday,
            startTime: "09:00",
            endTime: "18:00",
          },
        });
      }
    }
  }

  // 7. Seed Default Settings & Receipt Counter
  await prisma.setting.upsert({
    where: { key: "salon_name" },
    update: {},
    create: {
      key: "salon_name",
      value: "Aura Beauty Studio",
      description: "Official business trade name",
    },
  });

  await prisma.setting.upsert({
    where: { key: "slot_hold_minutes" },
    update: {},
    create: {
      key: "slot_hold_minutes",
      value: "10",
      description: "Minutes a customer can hold a booking slot during payment",
    },
  });

  await prisma.receiptCounter.upsert({
    where: { prefix: "RCP-2026" },
    update: {},
    create: {
      prefix: "RCP-2026",
      lastNumber: 1000,
    },
  });

  // 8. Seed Customers
  const customer1 = await prisma.customer.upsert({
    where: { phone: "+233245551234" },
    update: {},
    create: {
      name: "Ama Pokuaa",
      phone: "+233245551234",
      email: "ama.pokuaa@gmail.com",
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { phone: "+233509987766" },
    update: {},
    create: {
      name: "Serwaa Boateng",
      phone: "+233509987766",
      email: "serwaa.b@yahoo.com",
    },
  });

  const customer3 = await prisma.customer.upsert({
    where: { phone: "+233204456677" },
    update: {},
    create: {
      name: "Abena Osei",
      phone: "+233204456677",
      email: "abena.osei@outlook.com",
    },
  });

  const customer4 = await prisma.customer.upsert({
    where: { phone: "+233271122334" },
    update: {},
    create: {
      name: "Efua Mensah",
      phone: "+233271122334",
      email: "efua.m@gmail.com",
    },
  });

  const customer5 = await prisma.customer.upsert({
    where: { phone: "+233543344556" },
    update: {},
    create: {
      name: "Nana Yaa Asare",
      phone: "+233543344556",
      email: "nanayaa@gmail.com",
    },
  });

  // 9. Seed Bookings & Payments
  const baseDate = new Date();
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const day = baseDate.getDate();

  // Booking 1: Today 09:30 AM - 11:00 AM (Confirmed, Deposit Paid)
  const b1Start = new Date(Date.UTC(year, month, day, 9, 30));
  const b1End = new Date(Date.UTC(year, month, day, 11, 0));
  const booking1 = await prisma.booking.upsert({
    where: { reference: "AURA-2026-001" },
    update: {},
    create: {
      reference: "AURA-2026-001",
      status: BookingStatus.CONFIRMED,
      source: BookingSource.WEB,
      startUtc: b1Start,
      endUtc: b1End,
      staffId: staff1.id,
      customerId: customer1.id,
      subtotalPesewas: 55000,
      totalPesewas: 55000,
      depositRequiredPesewas: 27500,
      amountPaidPesewas: 27500,
      manageTokenHash: "token-hash-seed-001",
      items: {
        create: [
          {
            serviceId: bridalMakeup.id,
            pricePesewas: 55000,
            durationMin: 90,
          },
        ],
      },
    },
  });

  // Booking 2: Today 11:30 AM - 01:00 PM (Completed)
  const b2Start = new Date(Date.UTC(year, month, day, 11, 30));
  const b2End = new Date(Date.UTC(year, month, day, 13, 0));
  await prisma.booking.upsert({
    where: { reference: "AURA-2026-002" },
    update: {},
    create: {
      reference: "AURA-2026-002",
      status: BookingStatus.COMPLETED,
      source: BookingSource.POS,
      startUtc: b2Start,
      endUtc: b2End,
      staffId: staff3.id,
      customerId: customer2.id,
      subtotalPesewas: 28000,
      totalPesewas: 28000,
      depositRequiredPesewas: 14000,
      amountPaidPesewas: 28000,
      manageTokenHash: "token-hash-seed-002",
      items: {
        create: [
          {
            serviceId: hybridLashes.id,
            pricePesewas: 28000,
            durationMin: 90,
          },
        ],
      },
    },
  });

  // Booking 3: Today 02:00 PM - 05:00 PM (Confirmed)
  const b3Start = new Date(Date.UTC(year, month, day, 14, 0));
  const b3End = new Date(Date.UTC(year, month, day, 17, 0));
  await prisma.booking.upsert({
    where: { reference: "AURA-2026-003" },
    update: {},
    create: {
      reference: "AURA-2026-003",
      status: BookingStatus.CONFIRMED,
      source: BookingSource.WEB,
      startUtc: b3Start,
      endUtc: b3End,
      staffId: staff2.id,
      customerId: customer3.id,
      subtotalPesewas: 35000,
      totalPesewas: 35000,
      depositRequiredPesewas: 17500,
      amountPaidPesewas: 17500,
      manageTokenHash: "token-hash-seed-003",
      items: {
        create: [
          {
            serviceId: knotlessBraids.id,
            pricePesewas: 35000,
            durationMin: 180,
          },
        ],
      },
    },
  });

  // Booking 4: Today 05:30 PM - 07:00 PM (Pending Payment)
  const b4Start = new Date(Date.UTC(year, month, day, 17, 30));
  const b4End = new Date(Date.UTC(year, month, day, 19, 0));
  await prisma.booking.upsert({
    where: { reference: "AURA-2026-004" },
    update: {},
    create: {
      reference: "AURA-2026-004",
      status: BookingStatus.PENDING_PAYMENT,
      source: BookingSource.WEB,
      startUtc: b4Start,
      endUtc: b4End,
      staffId: staff1.id,
      customerId: customer4.id,
      subtotalPesewas: 45000,
      totalPesewas: 45000,
      depositRequiredPesewas: 45000,
      amountPaidPesewas: 0,
      manageTokenHash: "token-hash-seed-004",
      items: {
        create: [
          {
            serviceId: dressRental.id,
            pricePesewas: 45000,
            durationMin: 60,
          },
        ],
      },
    },
  });

  // Booking 5: Tomorrow 10:00 AM - 11:30 AM (Pending Payment)
  const b5Start = new Date(Date.UTC(year, month, day + 1, 10, 0));
  const b5End = new Date(Date.UTC(year, month, day + 1, 11, 30));
  await prisma.booking.upsert({
    where: { reference: "AURA-2026-005" },
    update: {},
    create: {
      reference: "AURA-2026-005",
      status: BookingStatus.PENDING_PAYMENT,
      source: BookingSource.WEB,
      startUtc: b5Start,
      endUtc: b5End,
      staffId: staff3.id,
      customerId: customer5.id,
      subtotalPesewas: 28000,
      totalPesewas: 28000,
      depositRequiredPesewas: 14000,
      amountPaidPesewas: 0,
      manageTokenHash: "token-hash-seed-005",
      items: {
        create: [
          {
            serviceId: hybridLashes.id,
            pricePesewas: 28000,
            durationMin: 90,
          },
        ],
      },
    },
  });

  // Seed historical payments for completed/confirmed bookings
  await prisma.payment.upsert({
    where: { reference: "PAY-AURA-001" },
    update: {},
    create: {
      bookingId: booking1.id,
      reference: "PAY-AURA-001",
      amountPesewas: 27500,
      currency: "GHS",
      status: PaymentStatus.PAID,
      channel: "MOBILE_MONEY",
      providerReference: "MTN-MOMO-9918231",
      paidAt: new Date(),
    },
  });

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
