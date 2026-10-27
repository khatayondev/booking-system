import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { cancelPaymentRequest } from "@/lib/payment-requests/service";
import { z } from "zod";

const cancelSchema = z.object({
  reason: z.string().max(255).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const { id } = await params;
    let reason: string | undefined;
    try {
      const body = await req.json();
      const parsed = cancelSchema.safeParse(body);
      if (parsed.success) reason = parsed.data.reason;
    } catch {
      // Body is optional
    }

    const result = await cancelPaymentRequest(id, session, reason);
    return successResponse({ paymentRequest: result });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}
