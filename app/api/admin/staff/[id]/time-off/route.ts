import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { z } from "zod";
import { findConflictingBookings } from "@/lib/staff-schedule";

const createTimeOffSchema = z.object({
  startUtc: z.string().datetime("Must be valid ISO UTC datetime"),
  endUtc: z.string().datetime("Must be valid ISO UTC datetime"),
  reason: z.string().min(2, "Reason is required"),
  force: z.boolean().default(false),
});

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: staffId } = await props.params;
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    requirePermission(session, PERMISSION_KEYS.STAFF_MANAGE);

    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff || staff.deletedAt) {
      return errorResponse("Staff member not found", "NOT_FOUND", 404);
    }

    const body = await req.json();
    const parsed = createTimeOffSchema.parse(body);

    const startUtc = new Date(parsed.startUtc);
    const endUtc = new Date(parsed.endUtc);

    if (startUtc >= endUtc) {
      return errorResponse("Leave start date/time must be earlier than end date/time", "INVALID_DATE_RANGE", 400);
    }

    // Check for conflicting bookings
    const conflicts = await findConflictingBookings(staffId, startUtc, endUtc);

    if (conflicts.length > 0 && !parsed.force) {
      return Response.json(
        {
          success: false,
          conflict: true,
          error: {
            code: "LEAVE_BOOKING_CONFLICT",
            message: `This leave period conflicts with ${conflicts.length} existing booking(s). Please reassign or reschedule them.`,
            affectedBookings: conflicts,
          },
        },
        { status: 409 }
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const record = await tx.timeOff.create({
        data: {
          staffId,
          startUtc,
          endUtc,
          reason: parsed.reason,
          approved: true,
        },
      });

      const userRecord = await tx.user.findUnique({ where: { id: session.userId } });

      await tx.auditLog.create({
        data: {
          userId: userRecord ? userRecord.id : null,
          action: "STAFF_TIMEOFF_CREATE",
          entityType: "TIMEOFF",
          entityId: record.id,
          newValues: {
            staffName: staff.name,
            reason: parsed.reason,
            startUtc: startUtc.toISOString(),
            endUtc: endUtc.toISOString(),
            hadConflicts: conflicts.length > 0,
            forced: parsed.force,
            createdBy: session.email,
            userRole: session.role,
          },
        },
      });

      return record;
    });

    return successResponse(created, undefined, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
