import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { errorResponse, successResponse, withErrorHandler } from "@/lib/api-response";

export const GET = withErrorHandler(async (req: Request) => {
  const session = await getCurrentSession();
  if (!session) {
    return errorResponse("Authentication required", "UNAUTHORIZED", 401);
  }

  const { searchParams } = new URL(req.url);
  const isExport = searchParams.get("export") === "true";

  if (isExport) {
    requirePermission(session, PERMISSION_KEYS.REPORTS_EXPORT);
  } else {
    requirePermission(session, PERMISSION_KEYS.REPORTS_VIEW);
  }

  return successResponse({
    report: "Monthly Revenue & Booking Performance",
    generatedAt: new Date().toISOString(),
    isExport,
  });
});
