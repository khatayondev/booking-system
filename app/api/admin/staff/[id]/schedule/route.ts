import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { z } from "zod";
import { validateShiftsDoNotOverlap } from "@/lib/staff-schedule";

const updateScheduleSchema = z.object({
  schedules: z.array(
    z.object({
      id: z.string().optional(),
      weekday: z.number().int().min(0).max(6),
      startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid start time (HH:MM)"),
      endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid end time (HH:MM)"),
      breakStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().or(z.literal("")).nullable(),
      breakEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().or(z.literal("")).nullable(),
      label: z.string().optional().or(z.literal("")).nullable(),
      isDayOff: z.boolean().default(false),
      active: z.boolean().default(true),
    })
  ),
});

export async function PUT(
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

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff || staff.deletedAt) {
      return errorResponse("Staff member not found", "NOT_FOUND", 404);
    }

    const body = await req.json();
    const parsed = updateScheduleSchema.parse(body);

    // Validate that shifts cannot overlap on any weekday!
    validateShiftsDoNotOverlap(parsed.schedules);

    await prisma.$transaction(async (tx) => {
      // Remove previous schedules for this staff
      await tx.staffSchedule.deleteMany({
        where: { staffId },
      });

      // Insert new schedules
      if (parsed.schedules.length > 0) {
        await tx.staffSchedule.createMany({
          data: parsed.schedules.map((s) => ({
            staffId,
            weekday: s.weekday,
            startTime: s.startTime,
            endTime: s.endTime,
            breakStart: s.breakStart || null,
            breakEnd: s.breakEnd || null,
            label: s.label || null,
            isDayOff: s.isDayOff || false,
            active: s.active !== false,
          })),
        });
      }

      const userRecord = await tx.user.findUnique({ where: { id: session.userId } });

      await tx.auditLog.create({
        data: {
          userId: userRecord ? userRecord.id : null,
          action: "STAFF_SCHEDULE_UPDATE",
          entityType: "STAFF_SCHEDULE",
          entityId: staffId,
          newValues: {
            staffName: staff.name,
            totalShifts: parsed.schedules.length,
            updatedBy: session.email,
            userRole: session.role,
          },
        },
      });
    });

    const updatedSchedules = await prisma.staffSchedule.findMany({
      where: { staffId, active: true },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    });

    return successResponse({
      success: true,
      schedules: updatedSchedules,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
