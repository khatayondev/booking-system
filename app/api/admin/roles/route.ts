import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS, ROLE_DEFAULT_LIMITS, UserRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { errorResponse, successResponse, withErrorHandler } from "@/lib/api-response";

export const GET = withErrorHandler(async () => {
  const session = await getCurrentSession();
  if (!session) {
    return errorResponse("Authentication required", "UNAUTHORIZED", 401);
  }

  requirePermission(session, PERMISSION_KEYS.ROLES_MANAGE);

  const roles = await prisma.role.findMany({
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const allPermissions = await prisma.permission.findMany({
    orderBy: { name: "asc" },
  });

  const formattedRoles = roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    limits: ROLE_DEFAULT_LIMITS[role.name as UserRole] || null,
    permissions: role.rolePermissions.map((rp) => rp.permission.name),
  }));

  return successResponse({
    roles: formattedRoles,
    allPermissions: allPermissions.map((p) => ({ id: p.id, name: p.name, description: p.description })),
  });
});
