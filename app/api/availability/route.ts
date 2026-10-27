import { NextRequest } from "next/server";
import { getAvailabilitySlots } from "@/lib/availability";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    // 1. Rate limiting: 60 requests per minute per IP for public availability queries
    const ip = getClientIp(req);
    checkRateLimit(`availability:${ip}`, 60, 60);

    const { searchParams } = new URL(req.url);

    // Support comma-separated serviceIds (e.g. ?serviceIds=id1,id2 or multiple ?serviceIds=id1&serviceIds=id2)
    const rawServices = searchParams.getAll("serviceIds");
    const serviceIds = rawServices.length === 1 && rawServices[0].includes(",")
      ? rawServices[0].split(",").map((s) => s.trim()).filter(Boolean)
      : rawServices.map((s) => s.trim()).filter(Boolean);

    if (serviceIds.length === 0) {
      return errorResponse("serviceIds query parameter is required", "BAD_REQUEST", 400);
    }

    const rawAddons = searchParams.getAll("addonIds");
    const addonIds = rawAddons.length === 1 && rawAddons[0].includes(",")
      ? rawAddons[0].split(",").map((s) => s.trim()).filter(Boolean)
      : rawAddons.map((s) => s.trim()).filter(Boolean);

    const staffId = searchParams.get("staffId") || undefined;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return errorResponse("startDate and endDate are required query parameters (YYYY-MM-DD)", "BAD_REQUEST", 400);
    }

    const result = await getAvailabilitySlots({
      serviceIds,
      addonIds,
      staffId,
      startDate,
      endDate,
    });

    return successResponse(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
