import { z } from "zod";
import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS, can } from "@/lib/rbac";
import { errorResponse, successResponse, withErrorHandler } from "@/lib/api-response";

const discountSchema = z.object({
  discountPercent: z.number().min(1).max(100),
});

export const POST = withErrorHandler(async (req: Request) => {
  const session = await getCurrentSession();
  if (!session) {
    return errorResponse("Authentication required", "UNAUTHORIZED", 401);
  }

  const body = await req.json();
  const parsed = discountSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Invalid discount percent", "INVALID_INPUT", 400);
  }

  const { discountPercent } = parsed.data;

  // Check base permission (throws 403 AppError if role lacks discounts.apply)
  requirePermission(session, PERMISSION_KEYS.DISCOUNTS_APPLY);

  // Check numeric limit
  if (!can(session, PERMISSION_KEYS.DISCOUNTS_APPLY, { discountPercent })) {
    return errorResponse(
      `Forbidden: Your role cannot apply discounts exceeding the role limit. Requested: ${discountPercent}%.`,
      "LIMIT_EXCEEDED",
      403
    );
  }

  return successResponse({
    authorized: true,
    discountPercent,
    message: "Discount percentage authorized.",
  });
});
