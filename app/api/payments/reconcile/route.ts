import { NextRequest } from "next/server";
import { runPaymentMaintenanceJobs } from "@/lib/payments/jobs";
import { successResponse, handleRouteError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const unpaidBookingThresholdMin = searchParams.get("unpaidMin")
      ? parseInt(searchParams.get("unpaidMin")!, 10)
      : 15;
    const stalePaymentThresholdMin = searchParams.get("staleMin")
      ? parseInt(searchParams.get("staleMin")!, 10)
      : 15;

    const result = await runPaymentMaintenanceJobs({
      unpaidBookingThresholdMin,
      stalePaymentThresholdMin,
    });

    return successResponse(result, "Maintenance jobs executed successfully");
  } catch (err) {
    return handleRouteError(err);
  }
}
