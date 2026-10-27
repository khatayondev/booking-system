import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { anonymizeOrDeleteCustomer } from "@/lib/customers/service";
import { z } from "zod";

const anonymizeSchema = z.object({
  action: z.enum(["ANONYMIZE", "DELETE"]),
  reason: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = anonymizeSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid action parameters", "BAD_REQUEST", 400, parsed.error.flatten());
    }

    const result = await anonymizeOrDeleteCustomer(id, parsed.data, session);
    return successResponse(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
