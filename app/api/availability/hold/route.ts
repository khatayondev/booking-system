import { NextRequest } from "next/server";
import { z } from "zod";
import { createSlotHold, releaseSlotHold } from "@/lib/availability";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const createHoldSchema = z.object({
  serviceIds: z
    .array(z.string().min(1, "Invalid service ID"))
    .min(1, "At least one service is required"),
  addonIds: z.array(z.string().min(1)).optional(),
  staffId: z.string().optional(),
  startUtc: z.string().min(1, "startUtc is required"),
  endUtc: z.string().optional(),
  holdDurationMin: z.number().int().min(1).max(60).optional(),
  customerPhone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting: 20 hold requests per minute per IP
    const ip = getClientIp(req);
    checkRateLimit(`hold:${ip}`, 20, 60);

    const body = await req.json();
    const parsed = createHoldSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message || "Invalid hold request payload",
        "BAD_REQUEST",
        400,
        parsed.error.flatten()
      );
    }

    const holdResult = await createSlotHold(parsed.data);

    return successResponse(holdResult, "Slot hold placed", 201);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let token = searchParams.get("token");

    if (!token) {
      try {
        const body = await req.json();
        token = body.token;
      } catch {
        // body might be empty
      }
    }

    if (!token) {
      return errorResponse("token is required to release a hold", "BAD_REQUEST", 400);
    }

    const released = await releaseSlotHold(token);

    return successResponse({
      released,
      message: released ? "Hold released successfully" : "Hold not found or already deleted",
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
