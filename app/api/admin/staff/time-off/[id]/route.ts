import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";

export async function DELETE(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    requirePermission(session, PERMISSION_KEYS.STAFF_MANAGE);

    const timeOff = await prisma.timeOff.findUnique({
      where: { id },
      include: { staff: { select: { name: true } } },
    });

    if (!timeOff) {
      return errorResponse("Time-off record not found", "NOT_FOUND", 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.timeOff.delete({ where: { id } });

      const userRecord = await tx.user.findUnique({ where: { id: session.userId } });

      await tx.auditLog.create({
        data: {
          userId: userRecord ? userRecord.id : null,
          action: "STAFF_TIMEOFF_DELETE",
          entityType: "TIMEOFF",
          entityId: id,
          newValues: {
            staffName: timeOff.staff.name,
            reason: timeOff.reason,
            deletedBy: session.email,
            userRole: session.role,
          },
        },
      });
    });

    return successResponse({ deleted: true, id });
  } catch (err) {
    return handleRouteError(err);
  }
}
