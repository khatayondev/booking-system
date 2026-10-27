import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { z } from "zod";
import { bulkBlockHoliday } from "@/lib/staff-schedule";

const bulkHolidaySchema = z.object({
  holidayName: z.string().min(2, "Holiday name is required"),
  startUtc: z.string().datetime("Must be valid ISO UTC datetime"),
  endUtc: z.string().datetime("Must be valid ISO UTC datetime"),
  staffIds: z.array(z.string()).optional(),
  force: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    requirePermission(session, PERMISSION_KEYS.STAFF_MANAGE);

    const body = await req.json();
    const parsed = bulkHolidaySchema.parse(body);

    const startUtc = new Date(parsed.startUtc);
    const endUtc = new Date(parsed.endUtc);

    if (startUtc >= endUtc) {
      return errorResponse("Holiday start date/time must be earlier than end date/time", "INVALID_DATE_RANGE", 400);
    }

    const result = await bulkBlockHoliday(
      {
        holidayName: parsed.holidayName,
        startUtc,
        endUtc,
        staffIds: parsed.staffIds,
        force: parsed.force,
      },
      {
        id: session.userId,
        role: session.role,
        name: session.email,
      }
    );

    if (!result.success && result.conflicts) {
      return Response.json(
        {
          success: false,
          conflict: true,
          error: {
            code: "HOLIDAY_BOOKING_CONFLICT",
            message: `This holiday block conflicts with existing bookings across ${result.conflicts.length} staff member(s). Please review and reassign or reschedule them.`,
            staffConflicts: result.conflicts,
          },
        },
        { status: 409 }
      );
    }

    return successResponse({
      success: true,
      blockedCount: result.blockedCount,
      holidayName: parsed.holidayName,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
