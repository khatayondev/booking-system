import { successResponse } from "@/lib/api-response";

export async function GET() {
  return successResponse({
    status: "ok",
    service: "booking-system",
    timestamp: new Date().toISOString(),
    timezone: "Africa/Accra",
  });
}
