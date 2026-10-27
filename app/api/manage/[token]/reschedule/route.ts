import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, handleRouteError } from "@/lib/api-response";
import { rescheduleBookingByCustomer } from "@/lib/self-service/service";

const rescheduleSchema = z.object({
  newStartUtc: z.string().datetime("newStartUtc must be a valid ISO datetime"),
});

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await props.params;
    const body = await req.json();
    const parsed = rescheduleSchema.parse(body);

    const result = await rescheduleBookingByCustomer(token, parsed.newStartUtc);

    return successResponse(result, "Appointment successfully rescheduled.");
  } catch (error) {
    return handleRouteError(error);
  }
}
