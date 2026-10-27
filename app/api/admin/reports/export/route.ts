import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { errorResponse, handleRouteError } from "@/lib/api-response";
import { generateComprehensiveReport } from "@/lib/reports/service";
import { generateComprehensiveCsv } from "@/lib/reports/csv";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    // Permission-gated: only users with REPORTS_EXPORT can export
    requirePermission(session, PERMISSION_KEYS.REPORTS_EXPORT);

    const { searchParams } = new URL(req.url);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const startDate = startDateStr ? new Date(startDateStr) : thirtyDaysAgo;
    const endDate = endDateStr ? new Date(endDateStr) : now;

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return errorResponse("Invalid startDate or endDate format.", "BAD_REQUEST", 400);
    }

    const report = await generateComprehensiveReport({
      startDate,
      endDate,
      compare: false,
    });

    const csvContent = generateComprehensiveCsv(report);
    const filename = `studio-report-${startDate.toISOString().split("T")[0]}-to-${endDate.toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
