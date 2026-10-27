import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { getEndOfDaySummary } from "@/lib/pos/pos-service";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || undefined;

    const summary = await getEndOfDaySummary(dateParam, session);

    return successResponse({ summary });
  } catch (error) {
    return handleRouteError(error);
  }
}
