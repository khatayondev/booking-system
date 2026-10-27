import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, handleRouteError, AppError } from "@/lib/api-response";
import { getClientIp } from "@/lib/rate-limit";
import { sendLookupOtp, verifyLookupOtp } from "@/lib/self-service/service";

const otpSchema = z.object({
  reference: z.string().min(3, "Booking reference is required"),
  phone: z.string().min(9, "Phone number is required"),
  action: z.enum(["send", "verify"]),
  code: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = otpSchema.parse(body);
    const clientIp = getClientIp(req);

    if (parsed.action === "send") {
      const result = await sendLookupOtp(parsed.reference, parsed.phone, clientIp);
      return successResponse(result, "Verification code sent via SMS.");
    }

    if (parsed.action === "verify") {
      if (!parsed.code) {
        throw new AppError("Verification code is required.", 400, "CODE_REQUIRED");
      }
      const verified = verifyLookupOtp(parsed.reference, parsed.phone, parsed.code);
      return successResponse({ verified }, "Verification code accepted.");
    }

    throw new AppError("Invalid action", 400, "INVALID_ACTION");
  } catch (error) {
    return handleRouteError(error);
  }
}
