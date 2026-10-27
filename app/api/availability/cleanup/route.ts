import { releaseAbandonedHolds } from "@/lib/availability";
import { successResponse, handleRouteError } from "@/lib/api-response";

export async function POST() {
  try {
    const releasedCount = await releaseAbandonedHolds();
    return successResponse({
      releasedCount,
      timestamp: new Date().toISOString(),
      message: `Released ${releasedCount} expired slot hold(s)`,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
