import { NextRequest } from "next/server";
import { successResponse, handleRouteError, AppError } from "@/lib/api-response";
import { getBookingByManageToken } from "@/lib/self-service/service";
import { getPaymentProvider } from "@/lib/payments/provider";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await props.params;
    const booking = await getBookingByManageToken(token);

    if (booking.balanceDuePesewas <= 0) {
      throw new AppError("No outstanding balance due for this booking.", 400, "NO_BALANCE_DUE");
    }

    if (booking.status === "CANCELLED") {
      throw new AppError("Cannot pay balance for a cancelled booking.", 400, "BOOKING_CANCELLED");
    }

    const paystackRef = `BAL-${booking.reference}-${Date.now().toString().slice(-6)}`;
    const provider = getPaymentProvider();

    const initResult = await provider.initialize({
      reference: paystackRef,
      amountPesewas: booking.balanceDuePesewas,
      email: booking.customerEmail || `customer-${booking.reference.toLowerCase()}@beccascrown.gh`,
      currency: "GHS",
      callbackUrl: `${req.nextUrl.origin}/manage/${token}?payment=success&ref=${paystackRef}`,
      metadata: {
        bookingId: booking.id,
        bookingReference: booking.reference,
        paymentType: "BALANCE",
      },
    });

    // Record pending payment
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        reference: paystackRef,
        amountPesewas: booking.balanceDuePesewas,
        currency: "GHS",
        status: "PENDING",
        channel: "PAYSTACK",
      },
    });

    return successResponse({
      authorizationUrl: initResult.authorizationUrl,
      reference: paystackRef,
      amountPesewas: booking.balanceDuePesewas,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
