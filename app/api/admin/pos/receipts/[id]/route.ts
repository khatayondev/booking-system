import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { formatReceiptShareText, getReceiptSharingLinks } from "@/lib/pos/pos-service";
import type { PosReceiptDetail } from "@/lib/pos/types";

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

    const receipt = await prisma.receipt.findFirst({
      where: {
        OR: [{ id }, { receiptNumber: id }],
      },
      include: {
        cashier: { select: { id: true, name: true } },
        voidedByUser: { select: { id: true, name: true } },
        booking: { select: { id: true, reference: true } },
      },
    });

    if (!receipt) {
      return errorResponse("Receipt not found", "NOT_FOUND", 404);
    }

    const detail: PosReceiptDetail = {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      bookingId: receipt.bookingId,
      bookingReference: receipt.booking?.reference || null,
      customerId: receipt.customerId,
      customerName: receipt.customerName,
      customerPhone: receipt.customerPhone,
      cashierId: receipt.cashierId,
      cashierName: receipt.cashier.name,
      subtotalPesewas: receipt.subtotalPesewas,
      discountPesewas: receipt.discountPesewas,
      discountPercent: receipt.discountPercent,
      discountReason: receipt.discountReason,
      promoCode: receipt.promoCode,
      tipPesewas: receipt.tipPesewas,
      totalPesewas: receipt.totalPesewas,
      amountPaidPesewas: receipt.amountPaidPesewas,
      changePesewas: receipt.changePesewas,
      balanceDuePesewas: receipt.balanceDuePesewas,
      status: receipt.status as PosReceiptDetail["status"],
      voidedAt: receipt.voidedAt?.toISOString() || null,
      voidReason: receipt.voidReason,
      voidedByName: receipt.voidedByUser?.name || null,
      items: receipt.items as unknown as PosReceiptDetail["items"],
      payments: receipt.payments as unknown as PosReceiptDetail["payments"],
      notes: receipt.notes,
      createdAt: receipt.createdAt.toISOString(),
    };

    const formattedText = formatReceiptShareText(detail);
    const links = getReceiptSharingLinks(detail);

    return successResponse({
      receipt: detail,
      formattedText,
      links,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
