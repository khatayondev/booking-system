import { NextRequest } from "next/server";
import { z } from "zod";
import { extendSlotHold } from "@/lib/availability";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const extendHoldSchema = z.object({
  token: z.string().min(1, "Hold token is required"),
  additionalMinutes: z.number().int().min(1).max(30).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    checkRateLimit(`hold_extend:${ip}`, 30, 60);

    const body = await req.json();
    const parsed = extendHoldSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message || "Invalid payload",
        "BAD_REQUEST",
        400
      );
    }

    const updatedHold = await extendSlotHold(
      parsed.data.token,
      parsed.data.additionalMinutes || 5
    );

    return successResponse({
      hold: updatedHold,
      message: "Slot hold successfully extended",
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
