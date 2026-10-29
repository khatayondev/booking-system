import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
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
    try {
      const view = await getPaymentRequestByToken(token);
      return successResponse({ paymentRequest: view });
    } catch (payErr: unknown) {
      // Graceful fallback: If this token is actually a booking manageToken, redirect customer
      if (token) {
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const booking = await prisma.booking.findFirst({
          where: { manageTokenHash: tokenHash },
          select: { id: true },
        });
        if (booking) {
          return successResponse({ redirectUrl: `/manage/${encodeURIComponent(token)}` });
        }
      }
      throw payErr;
    }
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}
