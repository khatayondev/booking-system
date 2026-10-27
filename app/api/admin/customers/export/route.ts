import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { errorResponse, handleRouteError } from "@/lib/api-response";
import { exportCustomersCsv } from "@/lib/customers/service";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const hasAllergies = searchParams.get("hasAllergies") === "true" ? true : undefined;
    const marketingConsent =
      searchParams.get("marketingConsent") === "true"
        ? true
        : searchParams.get("marketingConsent") === "false"
        ? false
        : undefined;

    const csvContent = await exportCustomersCsv(
      { q, tag, hasAllergies, marketingConsent },
      session
    );

    const filename = `aura-studio-customers-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
