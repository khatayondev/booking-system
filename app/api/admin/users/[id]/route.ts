import { z } from "zod";
import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS, ROLES, UserRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { normalizeGhanaPhone } from "@/lib/sms";

const updateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional().nullable(),
  roleId: z.string().uuid("Invalid role ID").optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id: targetUserId } = await props.params;
  const session = await getCurrentSession();
  if (!session) {
    return errorResponse("Authentication required", "UNAUTHORIZED", 401);
  }

  requirePermission(session, PERMISSION_KEYS.USERS_MANAGE);

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { role: true },
  });

  if (!targetUser || targetUser.deletedAt) {
    return errorResponse("User not found", "NOT_FOUND", 404);
  }

  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message || "Invalid input", "INVALID_INPUT", 400);
  }

  const data = parsed.data;

  // LOCKOUT PROTECTION: Cannot deactivate or demote the last active Owner
  const isTargetOwner = targetUser.role.name === ROLES.OWNER_ADMIN;
  let newRoleName: string | undefined;

  if (data.roleId && data.roleId !== targetUser.roleId) {
    const targetRole = await prisma.role.findUnique({
      where: { id: data.roleId },
    });
    if (!targetRole) {
      return errorResponse("Specified role does not exist", "INVALID_INPUT", 400);
    }
    newRoleName = targetRole.name;

    // Non-owners cannot promote someone to Owner
    if (newRoleName === ROLES.OWNER_ADMIN && session.role !== ROLES.OWNER_ADMIN) {
      return errorResponse("Forbidden: Only an Owner can promote a user to Owner", "FORBIDDEN", 403);
    }
  }

  const isDeactivating = data.active === false && targetUser.active === true;
  const isDemotingOwner = isTargetOwner && newRoleName !== undefined && newRoleName !== ROLES.OWNER_ADMIN;

  if (isTargetOwner && (isDeactivating || isDemotingOwner)) {
    const activeOwnerCount = await prisma.user.count({
      where: {
        role: { name: ROLES.OWNER_ADMIN },
        active: true,
        deletedAt: null,
      },
    });

    if (activeOwnerCount <= 1) {
      return errorResponse(
        "Lockout Protection: Cannot deactivate or demote the last active Owner.",
        "LOCKOUT_PREVENTION",
        400
      );
    }
  }

  // Handle phone normalization
  let normalizedPhone: string | null | undefined = undefined;
  if (data.phone !== undefined) {
    if (data.phone && data.phone.trim().length > 0) {
      try {
        normalizedPhone = normalizeGhanaPhone(data.phone.trim());
      } catch {
        return errorResponse("Invalid Ghana phone number format (+233 or 0XX)", "INVALID_INPUT", 400);
      }
    } else {
      normalizedPhone = null;
    }
  }

  // Build update payload
  const updateData: {
    name?: string;
    email?: string;
    phone?: string | null;
    roleId?: string;
    active?: boolean;
  } = {};

  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.email !== undefined) updateData.email = data.email.toLowerCase().trim();
  if (normalizedPhone !== undefined) updateData.phone = normalizedPhone;
  if (data.roleId !== undefined) updateData.roleId = data.roleId;
  if (data.active !== undefined) updateData.active = data.active;

  // Execute update in transaction with audit logging
  const updatedUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: targetUserId },
      data: updateData,
      include: { role: true },
    });

    // If deactivating user, invalidate their active sessions immediately
    if (data.active === false) {
      await tx.session.deleteMany({
        where: { userId: targetUserId },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "USER_UPDATED",
        entityType: "User",
        entityId: targetUserId,
        oldValues: {
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role.name,
          active: targetUser.active,
        },
        newValues: {
          name: user.name,
          email: user.email,
          role: user.role.name,
          active: user.active,
        },
      },
    });

    return user;
  });

  return successResponse({
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role.name as UserRole,
      active: updatedUser.active,
    },
    message: "User updated successfully.",
  });
}

export async function DELETE(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id: targetUserId } = await props.params;
  const session = await getCurrentSession();
  if (!session) {
    return errorResponse("Authentication required", "UNAUTHORIZED", 401);
  }

  requirePermission(session, PERMISSION_KEYS.USERS_MANAGE);

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { role: true },
  });

  if (!targetUser || targetUser.deletedAt) {
    return errorResponse("User not found", "NOT_FOUND", 404);
  }

  // Lockout protection: Cannot delete the last active Owner
  if (targetUser.role.name === ROLES.OWNER_ADMIN) {
    const activeOwnerCount = await prisma.user.count({
      where: {
        role: { name: ROLES.OWNER_ADMIN },
        active: true,
        deletedAt: null,
      },
    });

    if (activeOwnerCount <= 1) {
      return errorResponse(
        "Lockout Protection: Cannot delete the last active Owner.",
        "LOCKOUT_PREVENTION",
        400
      );
    }
  }

  // Soft delete user and invalidate sessions
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: {
        active: false,
        deletedAt: new Date(),
      },
    });

    await tx.session.deleteMany({
      where: { userId: targetUserId },
    });

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "USER_DELETED",
        entityType: "User",
        entityId: targetUserId,
        oldValues: { email: targetUser.email, role: targetUser.role.name },
      },
    });
  });

  return successResponse({ message: "User deleted successfully." });
}
