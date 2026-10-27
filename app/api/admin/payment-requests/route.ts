import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { createPaymentRequest, listPaymentRequestsForBooking } from "@/lib/payment-requests/service";
import { z } from "zod";

const createPaymentRequestSchema = z.object({
  bookingId: z.string().uuid("Invalid bookingId"),
  amountPesewas: z.number().int().positive().optional(),
  message: z.string().max(255).optional(),
  phone: z.string().optional(),
  channel: z.enum(["ALL", "CARD", "MOBILE_MONEY"]).optional().default("ALL"),
  pushMomo: z.boolean().optional().default(false),
  momoProvider: z.enum(["MTN", "TELECEL", "AT"]).optional(),
  expiryMinutes: z.number().int().min(10).max(10080).optional().default(1440),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const body = await req.json();
    const parsed = createPaymentRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message || "Invalid input data",
        "BAD_REQUEST",
        400,
        parsed.error.flatten()
      );
    }

    const result = await createPaymentRequest(session, parsed.data);
    return successResponse({ paymentRequest: result }, "Payment request created", 201);
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const searchParams = req.nextUrl.searchParams;
    const bookingId = searchParams.get("bookingId");
    if (!bookingId) {
      return errorResponse("bookingId query parameter is required", "BAD_REQUEST", 400);
    }

    const requests = await listPaymentRequestsForBooking(bookingId);
    return successResponse({ paymentRequests: requests });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}
