import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { errorResponse, successResponse, handleRouteError } from "@/lib/api-response";
import { getAuditLogs } from "@/lib/audit/service";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    // Owner-only permission check
    requirePermission(session, PERMISSION_KEYS.AUDIT_VIEW);

    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const action = searchParams.get("action") || undefined;
    const entityType = searchParams.get("entityType") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await getAuditLogs({
      page,
      limit,
      action,
      entityType,
      userId,
      startDate,
      endDate,
      search,
    });

    return successResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
