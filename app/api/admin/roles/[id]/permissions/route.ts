import { z } from "zod";
import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS, ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

const updatePermissionsSchema = z.object({
  permissionKeys: z.array(z.string()),
});

export async function PUT(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roleId } = await props.params;
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    requirePermission(session, PERMISSION_KEYS.ROLES_MANAGE);

    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return errorResponse("Role not found", "NOT_FOUND", 404);
    }

    const body = await req.json();
    const parsed = updatePermissionsSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid permission keys format", "INVALID_INPUT", 400);
    }

    const targetPermissions = parsed.data.permissionKeys;

    // LOCKOUT PROTECTION: Owner role cannot lose roles.manage
    if (role.name === ROLES.OWNER_ADMIN && !targetPermissions.includes(PERMISSION_KEYS.ROLES_MANAGE)) {
      return errorResponse(
        "Lockout Protection: The Owner role cannot lose the 'roles.manage' permission.",
        "LOCKOUT_PREVENTION",
        400
      );
    }

    // Lookup permission records
    const dbPermissions = await prisma.permission.findMany({
      where: { name: { in: targetPermissions } },
    });

    // Replace role permissions atomically in transaction
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({
        where: { roleId },
      }),
      prisma.rolePermission.createMany({
        data: dbPermissions.map((p) => ({
          roleId,
          permissionId: p.id,
        })),
      }),
      prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: "RBAC_ROLE_PERMISSIONS_UPDATED",
          entityType: "Role",
          entityId: roleId,
          newValues: { roleName: role.name, permissionsCount: targetPermissions.length },
        },
      }),
    ]);

    return successResponse({
      roleId,
      roleName: role.name,
      permissionsCount: targetPermissions.length,
      message: "Permissions updated successfully.",
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "statusCode" in err && "code" in err && "message" in err) {
      const e = err as { message: string; code: string; statusCode: number; details?: unknown };
      return errorResponse(e.message, e.code, e.statusCode, e.details);
    }
    throw err;
  }
}
