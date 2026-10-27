import { NextRequest } from "next/server";
import { successResponse, handleRouteError } from "@/lib/api-response";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getPaymentRequestByToken } from "@/lib/payment-requests/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ip = getClientIp(req);
    // Rate limit: 30 requests per minute per IP to prevent brute-force token guessing
    checkRateLimit(`pay_view:${ip}`, 30, 60);

    const { token } = await params;
    const view = await getPaymentRequestByToken(token);
    return successResponse({ paymentRequest: view });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}
