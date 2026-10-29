import { NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments/provider";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const initializeSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  paymentType: z.enum(["DEPOSIT", "FULL", "BALANCE"]).default("DEPOSIT"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    checkRateLimit(`pay_init:${ip}`, 30, 60);

    const body = await req.json();
    const parsed = initializeSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message || "Invalid payload",
        "BAD_REQUEST",
        400
      );
    }

    const { bookingId, paymentType } = parsed.data;

    // 1. Fetch booking with customer
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true },
    });

    if (!booking) {
      return errorResponse("Booking not found", "NOT_FOUND", 404);
    }

    // 2. Compute amount strictly on the server
    let amountToPayPesewas = 0;
    if (paymentType === "DEPOSIT") {
      amountToPayPesewas = booking.depositRequiredPesewas;
    } else if (paymentType === "FULL") {
      amountToPayPesewas = booking.totalPesewas;
    } else if (paymentType === "BALANCE") {
      amountToPayPesewas = Math.max(0, booking.totalPesewas - booking.amountPaidPesewas);
      if (amountToPayPesewas === 0) {
        return errorResponse("This booking is already fully paid", "BAD_REQUEST", 400);
      }
    }

    // 3. Generate unique transaction reference
    const uniqueRef = `PAY-${Date.now().toString().slice(-6)}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    // 4. Create pending Payment record in DB
    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        reference: uniqueRef,
        amountPesewas: amountToPayPesewas,
        currency: "GHS",
        status: "PENDING",
        channel: "MOBILE_MONEY",
      },
    });

    // 5. Initialize via Payment Provider
    const provider = getPaymentProvider();
    const initResult = await provider.initialize({
      reference: uniqueRef,
      amountPesewas: amountToPayPesewas,
      email: booking.customer.email || `customer-${booking.customer.phone.replace("+", "")}@beccascrown.gh`,
      currency: "GHS",
      channels: ["card", "mobile_money"],
      metadata: {
        bookingId: booking.id,
        bookingReference: booking.reference,
        paymentId: payment.id,
        paymentType,
        customerPhone: booking.customer.phone,
      },
    });

    return successResponse(
      {
        authorizationUrl: initResult.authorizationUrl,
        accessCode: initResult.accessCode,
        reference: initResult.reference,
        amountPesewas: amountToPayPesewas,
        paymentType,
      },
      "Payment session initialized",
      201
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
