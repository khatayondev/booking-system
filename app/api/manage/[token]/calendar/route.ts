import { NextRequest, NextResponse } from "next/server";
import { getBookingByManageToken } from "@/lib/self-service/service";
import { generateIcsCalendar } from "@/lib/self-service/ics";
import { handleRouteError } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await props.params;
    const booking = await getBookingByManageToken(token);

    const primaryService = booking.services[0]?.name || "Beauty Appointment";
    const icsContent = generateIcsCalendar({
      reference: booking.reference,
      summary: `${primaryService} - Aura Beauty Studio`,
      description: `Appointment for ${booking.customerName}\\nReference: ${booking.reference}\\nStaff: ${booking.staffName}\\nManage: ${req.nextUrl.origin}/manage/${token}`,
      startUtc: new Date(booking.startUtc),
      endUtc: new Date(booking.endUtc),
      url: `${req.nextUrl.origin}/manage/${token}`,
    });

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="aura-booking-${booking.reference}.ics"`,
        "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
