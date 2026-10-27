import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { z } from "zod";
import { rescheduleBooking } from "@/lib/staff-schedule";
import { emitBookingEvent } from "@/lib/booking-events";

const rescheduleSchema = z.object({
  newStartUtc: z.string().datetime("Must be valid ISO UTC datetime"),
  newEndUtc: z.string().datetime("Must be valid ISO UTC datetime"),
  newStaffId: z.string().uuid("Invalid staff ID").optional(),
});

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await props.params;
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    requirePermission(session, PERMISSION_KEYS.BOOKINGS_EDIT);

    const body = await req.json();
    const parsed = rescheduleSchema.parse(body);

    const startUtc = new Date(parsed.newStartUtc);
    const endUtc = new Date(parsed.newEndUtc);

    if (startUtc >= endUtc) {
      return errorResponse("New start date/time must be earlier than new end date/time", "INVALID_DATE_RANGE", 400);
    }

    const result = await rescheduleBooking(
      bookingId,
      startUtc,
      endUtc,
      parsed.newStaffId,
      {
        id: session.userId,
        role: session.role,
        name: session.email,
      }
    );

    emitBookingEvent({
      type: "RESCHEDULED",
      bookingId,
      reference: "",
      staffId: parsed.newStaffId,
      timestamp: new Date().toISOString(),
    });

    return successResponse(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
