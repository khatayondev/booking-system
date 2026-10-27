import { NextRequest } from "next/server";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { payPaymentRequest } from "@/lib/payment-requests/service";
import { z } from "zod";

const paySchema = z.object({
  method: z.enum(["MOBILE_MONEY", "CARD"]),
  phone: z.string().optional(),
  provider: z.enum(["MTN", "TELECEL", "AT"]).optional(),
  cardReference: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ip = getClientIp(req);
    // Rate limit: 10 payment attempts per 5 minutes per IP
    checkRateLimit(`pay_submit:${ip}`, 10, 300);

    const { token } = await params;
    const body = await req.json();
    const parsed = paySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message || "Invalid payment details",
        "BAD_REQUEST",
        400,
        parsed.error.flatten()
      );
    }

    const result = await payPaymentRequest(token, parsed.data);
    return successResponse(result);
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}
