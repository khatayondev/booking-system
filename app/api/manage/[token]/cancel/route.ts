import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, handleRouteError } from "@/lib/api-response";
import { cancelBookingByCustomer } from "@/lib/self-service/service";

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await props.params;
    let reason: string | undefined;

    try {
      const body = await req.json();
      const parsed = cancelSchema.parse(body);
      reason = parsed.reason;
    } catch {
      // Body is optional
    }

    const result = await cancelBookingByCustomer(token, reason);

    return successResponse(
      result,
      result.alreadyCancelled
        ? "Appointment was already cancelled."
        : "Appointment successfully cancelled."
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
