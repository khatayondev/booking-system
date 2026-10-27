import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { voidPosReceipt, getReceiptSharingLinks } from "@/lib/pos/pos-service";

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
    const reason = body?.reason;

    const receipt = await voidPosReceipt(id, reason, session);
    const links = getReceiptSharingLinks(receipt);

    return successResponse({
      receipt,
      links,
      message: "Receipt voided and payments refunded successfully",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
