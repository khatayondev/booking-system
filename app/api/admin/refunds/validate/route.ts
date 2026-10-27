import { z } from "zod";
import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS, can } from "@/lib/rbac";
import { errorResponse, successResponse, withErrorHandler } from "@/lib/api-response";
import { formatPesewas } from "@/lib/money";

const refundSchema = z.object({
  refundPesewas: z.number().int().positive(),
});

export const POST = withErrorHandler(async (req: Request) => {
  const session = await getCurrentSession();
  if (!session) {
    return errorResponse("Authentication required", "UNAUTHORIZED", 401);
  }

  const body = await req.json();
  const parsed = refundSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Invalid refund amount in pesewas", "INVALID_INPUT", 400);
  }

  const { refundPesewas } = parsed.data;

  // Check base permission (throws 403 AppError if role lacks payments.refund)
  requirePermission(session, PERMISSION_KEYS.PAYMENTS_REFUND);

  // Check numeric limit
  if (!can(session, PERMISSION_KEYS.PAYMENTS_REFUND, { refundPesewas })) {
    return errorResponse(
      `Forbidden: Your role cannot issue refunds exceeding the role limit. Requested: ${formatPesewas(refundPesewas)}.`,
      "LIMIT_EXCEEDED",
      403
    );
  }

  return successResponse({
    authorized: true,
    refundPesewas,
    formattedAmount: formatPesewas(refundPesewas),
    message: "Refund amount authorized.",
  });
});
