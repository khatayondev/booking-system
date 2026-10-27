import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { PERMISSION_KEYS, ROLES } from "../lib/rbac";

const prisma = new PrismaClient();

async function bootstrapFirstOwner() {
  console.log("====================================================");
  console.log(" 👑 Aura Studio - First-Owner Bootstrap Script");
  console.log("====================================================\n");

  const email = (process.env.FIRST_OWNER_EMAIL || process.argv[2] || "owner@aurastudio.gh").trim().toLowerCase();
  const name = (process.env.FIRST_OWNER_NAME || process.argv[3] || "Akosua Addo (Owner)").trim();
  const phone = (process.env.FIRST_OWNER_PHONE || process.argv[4] || "+233241112233").trim();
  const password = process.env.FIRST_OWNER_PASSWORD || process.argv[5] || "AuraStudio2026!Secure";

  if (!email || !email.includes("@")) {
    console.error("❌ Invalid email provided.");
    process.exit(1);
  }

  if (password.length < 10) {
    console.error("❌ Password must be at least 10 characters long.");
    process.exit(1);
  }

  console.log(`Target Owner Email: ${email}`);
  console.log(`Target Owner Name:  ${name}`);
  console.log(`Target Phone:       ${phone}`);

  // 1. Ensure OWNER_ADMIN role exists
  let ownerRole = await prisma.role.findUnique({
    where: { name: ROLES.OWNER_ADMIN },
  });

  if (!ownerRole) {
    console.log("⚙️  Creating OWNER_ADMIN role...");
    ownerRole = await prisma.role.create({
      data: {
        name: ROLES.OWNER_ADMIN,
        description: "Full administrative and financial access to the studio",
      },
    });
  }

  // 2. Ensure all permissions are mapped to OWNER_ADMIN
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
  }

  // 3. Check for existing owner
  const existingOwner = await prisma.user.findFirst({
    where: {
      roleId: ownerRole.id,
      deletedAt: null,
    },
  });

  const passwordHash = await hash(password);

  if (existingOwner) {
    console.log(`\nℹ️  An active owner account already exists: ${existingOwner.email} (ID: ${existingOwner.id})`);
    if (existingOwner.email.toLowerCase() === email) {
      console.log("🔄 Updating password and details for existing owner...");
      await prisma.user.update({
        where: { id: existingOwner.id },
        data: {
          name,
          phone,
          passwordHash,
          active: true,
        },
      });
      console.log("✅ Existing owner account updated successfully!");
    } else {
      console.log(`⚠️  Existing owner email differs from target. Creating/updating specific user: ${email}...`);
      await prisma.user.upsert({
        where: { email },
        update: {
          name,
          phone,
          passwordHash,
          roleId: ownerRole.id,
          active: true,
          deletedAt: null,
        },
        create: {
          email,
          name,
          phone,
          passwordHash,
          roleId: ownerRole.id,
          active: true,
        },
      });
      console.log(`✅ Owner account ${email} created/promoted to OWNER_ADMIN!`);
    }
  } else {
    console.log("\n🚀 Creating primary first owner...");
    const user = await prisma.user.create({
      data: {
        email,
        name,
        phone,
        passwordHash,
        roleId: ownerRole.id,
        active: true,
        mustChangePassword: false,
      },
    });
    console.log(`✅ First Owner successfully created! (ID: ${user.id})`);
  }

  console.log("\n----------------------------------------------------");
  console.log(" 🎉 Ready for Go-Live! You can now log in at /login");
  console.log(`    Email:    ${email}`);
  console.log("    Password: [PROTECTED]");
  console.log("----------------------------------------------------\n");
}

bootstrapFirstOwner()
  .catch((err) => {
    console.error("❌ Fatal error bootstrapping first owner:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
