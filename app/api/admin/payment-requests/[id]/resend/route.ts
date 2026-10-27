import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { resendPaymentRequest } from "@/lib/payment-requests/service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const { id } = await params;
    const result = await resendPaymentRequest(id, session);
    return successResponse({ paymentRequest: result });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}
