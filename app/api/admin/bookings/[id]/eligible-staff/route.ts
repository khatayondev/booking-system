import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { findEligibleStaffForBooking } from "@/lib/staff-schedule";

export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await props.params;
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    requirePermission(session, PERMISSION_KEYS.BOOKINGS_EDIT);

    const eligible = await findEligibleStaffForBooking(bookingId);
    return successResponse({ eligibleStaff: eligible });
  } catch (err) {
    return handleRouteError(err);
  }
}
