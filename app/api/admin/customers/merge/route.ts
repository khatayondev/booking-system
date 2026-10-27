import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { mergeCustomers } from "@/lib/customers/service";
import { z } from "zod";

const mergeSchema = z.object({
  primaryCustomerId: z.string().uuid("Invalid primaryCustomerId"),
  duplicateCustomerId: z.string().uuid("Invalid duplicateCustomerId"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const body = await req.json();
    const parsed = mergeSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid merge parameters", "BAD_REQUEST", 400, parsed.error.flatten());
    }

    const merged = await mergeCustomers(parsed.data, session);
    return successResponse({ customer: merged, message: "Customers successfully merged." });
  } catch (err) {
    return handleRouteError(err);
  }
}
