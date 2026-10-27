import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { processDashboardRefund } from "@/lib/self-service/refunds";

const refundBodySchema = z.object({
  paymentId: z.string().optional(),
  amountPesewas: z.number().int().positive("Refund amount must be a positive number in pesewas"),
  refundType: z.enum(["PAYSTACK", "MANUAL"]).default("MANUAL"),
  reason: z.string().min(1, "A refund reason is required"),
});

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await props.params;
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const body = await req.json();
    const parsed = refundBodySchema.parse(body);

    // Enforce base permission and role numeric limits
    requirePermission(session, PERMISSION_KEYS.PAYMENTS_REFUND, {
      refundPesewas: parsed.amountPesewas,
    });

    const result = await processDashboardRefund({
      bookingId,
      paymentId: parsed.paymentId,
      amountPesewas: parsed.amountPesewas,
      refundType: parsed.refundType,
      reason: parsed.reason,
      user: session,
    });

    return successResponse(result, "Refund successfully issued.");
  } catch (error) {
    return handleRouteError(error);
  }
}
