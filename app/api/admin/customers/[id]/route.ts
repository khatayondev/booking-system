import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { getCustomerDetail, updateCustomer } from "@/lib/customers/service";
import { z } from "zod";

const updateCustomerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().nullable(),
  allergies: z.string().optional().nullable(),
  preferences: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  marketingConsent: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const { id } = await params;
    const customer = await getCustomerDetail(id, session);
    return successResponse({ customer });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(
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
    const parsed = updateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid input data", "BAD_REQUEST", 400, parsed.error.flatten());
    }

    const updated = await updateCustomer(id, parsed.data, session);
    return successResponse({ customer: updated });
  } catch (err) {
    return handleRouteError(err);
  }
}
