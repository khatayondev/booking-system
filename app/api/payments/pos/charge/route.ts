import { NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments/provider";
import { reconcilePaymentTransaction } from "@/lib/payments/reconciliation";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { normalizeGhanaPhone } from "@/lib/sms";

const posChargeSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  phone: z.string().min(9, "Phone number is required"),
  provider: z.enum(["mtn", "vod", "tgo"]).default("mtn"),
  paymentType: z.enum(["DEPOSIT", "FULL", "BALANCE"]).default("DEPOSIT"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = posChargeSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message || "Invalid payload",
        "BAD_REQUEST",
        400
      );
    }

    const { bookingId, phone, provider: momoProvider, paymentType } = parsed.data;

    let normalizedPhone: string;
    try {
      normalizedPhone = normalizeGhanaPhone(phone);
    } catch {
      return errorResponse("Invalid Ghana phone number format", "BAD_REQUEST", 400);
    }

    // 1. Fetch booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true },
    });

    if (!booking) {
      return errorResponse("Booking not found", "NOT_FOUND", 404);
    }

    // 2. Server-computed amount
    let amountToPayPesewas = 0;
    if (paymentType === "DEPOSIT") {
      amountToPayPesewas = booking.depositRequiredPesewas;
    } else if (paymentType === "FULL") {
      amountToPayPesewas = booking.totalPesewas;
    } else if (paymentType === "BALANCE") {
      amountToPayPesewas = Math.max(0, booking.totalPesewas - booking.amountPaidPesewas);
      if (amountToPayPesewas === 0) {
        return errorResponse("Booking is already fully paid", "BAD_REQUEST", 400);
      }
    }

    // 3. Generate unique reference and create Payment
    const reference = `POS-${Date.now().toString().slice(-6)}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        reference,
        amountPesewas: amountToPayPesewas,
        currency: "GHS",
        status: "PENDING",
        channel: "MOBILE_MONEY",
      },
    });

    // 4. Call Payment Provider Charge API
    const paymentProvider = getPaymentProvider();
    const chargeResult = await paymentProvider.chargeMobileMoney({
      reference,
      amountPesewas: amountToPayPesewas,
      email: booking.customer.email || `customer-${normalizedPhone.replace("+", "")}@aurastudio.gh`,
      phone: normalizedPhone,
      provider: momoProvider,
      metadata: {
        bookingId: booking.id,
        bookingReference: booking.reference,
        source: "POS",
        paymentType,
      },
    });

    // 5. If immediate success, reconcile immediately
    if (chargeResult.status === "success") {
      await reconcilePaymentTransaction({
        reference,
        providerResult: {
          reference,
          status: "success",
          amountPesewas: amountToPayPesewas,
          currency: "GHS",
          channel: "mobile_money",
          paidAt: new Date().toISOString(),
        },
        source: "POS",
      });
    }

    return successResponse(
      {
        reference,
        status: chargeResult.status,
        displayMessage: chargeResult.displayMessage,
        amountPesewas: amountToPayPesewas,
      },
      "Mobile money charge initiated",
      201
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
