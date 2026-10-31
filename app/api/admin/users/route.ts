import { z } from "zod";
import { getCurrentSession, hashPassword } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS, UserRole, ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { errorResponse, successResponse, withErrorHandler } from "@/lib/api-response";
import { normalizeGhanaPhone } from "@/lib/sms";

const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().nullable(),
  roleId: z.string().uuid("Invalid role ID"),
  temporaryPassword: z.string().min(8, "Temporary password must be at least 8 characters").optional(),
});

export const GET = withErrorHandler(async () => {
  const session = await getCurrentSession();
  if (!session) {
    return errorResponse("Authentication required", "UNAUTHORIZED", 401);
  }

  requirePermission(session, PERMISSION_KEYS.USERS_MANAGE);

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    include: {
      role: true,
      staff: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const formattedUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: {
      id: u.role.id,
      name: u.role.name as UserRole,
      description: u.role.description,
    },
    active: u.active,
    mustChangePassword: u.mustChangePassword,
    totpEnabled: u.totpEnabled,
    staffId: u.staff?.id ?? null,
    staffBio: u.staff?.bio ?? null,
    createdAt: u.createdAt.toISOString(),
  }));

  return successResponse({ users: formattedUsers });
});

export const POST = withErrorHandler(async (req: Request) => {
  const session = await getCurrentSession();
  if (!session) {
    return errorResponse("Authentication required", "UNAUTHORIZED", 401);
  }

  requirePermission(session, PERMISSION_KEYS.USERS_MANAGE);

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message || "Invalid input", "INVALID_INPUT", 400);
  }

  const { name, email, phone, roleId, temporaryPassword } = parsed.data;

  // Validate role exists
  const role = await prisma.role.findUnique({
    where: { id: roleId },
  });
  if (!role) {
    return errorResponse("Role does not exist", "INVALID_INPUT", 400);
  }

  // Hierarchy check: Non-owners cannot create an Owner
  if (role.name === ROLES.OWNER_ADMIN && session.role !== ROLES.OWNER_ADMIN) {
    return errorResponse("Forbidden: Only an Owner can create another Owner", "FORBIDDEN", 403);
  }

  // Check unique email
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existingUser) {
    return errorResponse("A user with this email address already exists", "CONFLICT", 409);
  }

  // Normalize phone if provided
  let normalizedPhone: string | null = null;
  if (phone && phone.trim().length > 0) {
    try {
      normalizedPhone = normalizeGhanaPhone(phone.trim());
      const existingPhone = await prisma.user.findFirst({
        where: { phone: normalizedPhone },
      });
      if (existingPhone) {
        return errorResponse("A user with this phone number already exists", "CONFLICT", 409);
      }
    } catch {
      return errorResponse("Invalid Ghana phone number format (+233 or 0XX)", "INVALID_INPUT", 400);
    }
  }

  const tempPassword = temporaryPassword || Math.random().toString(36).slice(-10) + "Aa1!";
  const passwordHash = await hashPassword(tempPassword);

  const newUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: normalizedPhone,
        passwordHash,
        roleId,
        mustChangePassword: true,
        active: true,
      },
      include: {
        role: true,
      },
    });

    // Auto-create linked Staff record if role is STAFF_RECEPTIONIST, FRONT_DESK or MANAGER
    if (role.name === ROLES.STAFF_RECEPTIONIST || role.name === ROLES.MANAGER || role.name === ROLES.FRONT_DESK) {
      await tx.staff.create({
        data: {
          userId: user.id,
          name: user.name,
          phone: user.phone || "0000000000",
          bio: role.name === ROLES.MANAGER ? "Manager" : role.name === ROLES.FRONT_DESK ? "Front Desk" : "Beauty Specialist",
          active: true,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "USER_CREATED",
        entityType: "User",
        entityId: user.id,
        newValues: {
          email: user.email,
          role: role.name,
          name: user.name,
        },
      },
    });

    return user;
  });

  return successResponse(
    {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role.name,
      },
      temporaryPassword: tempPassword,
    },
    "User created successfully with temporary password.",
    201
  );
});
