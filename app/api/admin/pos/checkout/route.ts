import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { processPosCheckout, getReceiptSharingLinks } from "@/lib/pos/pos-service";
import type { PosCheckoutInput } from "@/lib/pos/types";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const body = (await req.json()) as PosCheckoutInput;
    const receipt = await processPosCheckout(body, session);
    const links = getReceiptSharingLinks(receipt);

    return successResponse(
      {
        receipt,
        links,
      },
      "Checkout completed successfully",
      201
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
