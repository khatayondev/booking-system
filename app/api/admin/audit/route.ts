import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { errorResponse, successResponse, withErrorHandler } from "@/lib/api-response";

export const GET = withErrorHandler(async () => {
  const session = await getCurrentSession();
  if (!session) {
    return errorResponse("Authentication required", "UNAUTHORIZED", 401);
  }

  requirePermission(session, PERMISSION_KEYS.AUDIT_VIEW);

  const logs = await prisma.auditLog.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return successResponse({ logs });
});
