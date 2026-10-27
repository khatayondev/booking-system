import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { errorResponse, successResponse, handleRouteError } from "@/lib/api-response";
import { generateComprehensiveReport } from "@/lib/reports/service";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    requirePermission(session, PERMISSION_KEYS.REPORTS_VIEW);

    const { searchParams } = new URL(req.url);

    // Default to last 30 days if not provided
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const compare = searchParams.get("compare") === "true";

    const startDate = startDateStr ? new Date(startDateStr) : thirtyDaysAgo;
    const endDate = endDateStr ? new Date(endDateStr) : now;

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return errorResponse("Invalid startDate or endDate format. Please provide valid ISO dates.", "BAD_REQUEST", 400);
    }

    if (startDate > endDate) {
      return errorResponse("startDate cannot be after endDate.", "BAD_REQUEST", 400);
    }

    const report = await generateComprehensiveReport({
      startDate,
      endDate,
      compare,
    });

    return successResponse(report);
  } catch (error) {
    return handleRouteError(error);
  }
}
