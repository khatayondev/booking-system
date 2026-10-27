import { NextRequest } from "next/server";
import { successResponse, handleRouteError } from "@/lib/api-response";
import { getBookingByManageToken } from "@/lib/self-service/service";
import { generateGoogleCalendarUrl } from "@/lib/self-service/ics";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await props.params;
    const booking = await getBookingByManageToken(token);

    const primaryService = booking.services[0]?.name || "Beauty Appointment";
    const googleCalendarUrl = generateGoogleCalendarUrl({
      reference: booking.reference,
      summary: `${primaryService} - Aura Beauty Studio`,
      description: `Appointment for ${booking.customerName}\nReference: ${booking.reference}\nStaff: ${booking.staffName}\nManage Link: ${req.nextUrl.origin}/manage/${token}`,
      startUtc: new Date(booking.startUtc),
      endUtc: new Date(booking.endUtc),
    });

    return successResponse({
      ...booking,
      calendarUrls: {
        google: googleCalendarUrl,
        icsDownload: `/api/manage/${encodeURIComponent(token)}/calendar`,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
