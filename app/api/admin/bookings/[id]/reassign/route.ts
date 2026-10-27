import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { z } from "zod";
import { reassignBooking } from "@/lib/staff-schedule";
import { emitBookingEvent } from "@/lib/booking-events";

const reassignSchema = z.object({
  newStaffId: z.string().uuid("Invalid staff ID"),
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
    const parsed = reassignSchema.parse(body);

    const result = await reassignBooking(bookingId, parsed.newStaffId, {
      id: session.userId,
      role: session.role,
      name: session.email,
    });

    emitBookingEvent({
      type: "REASSIGNED",
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
