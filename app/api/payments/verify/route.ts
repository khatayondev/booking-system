import { NextRequest } from "next/server";
import { getPaymentProvider } from "@/lib/payments/provider";
import { reconcilePaymentTransaction } from "@/lib/payments/reconciliation";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";

import { BookingSummaryData, BookingStatusType } from "@/lib/payments/types";

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    checkRateLimit(`pay_verify:${ip}`, 40, 60);

    const { searchParams } = new URL(req.url);
    const reference = searchParams.get("reference") || searchParams.get("ref");

    if (!reference) {
      return errorResponse("Transaction reference is required", "BAD_REQUEST", 400);
    }

    // Direct lookup if reference is a booking reference
    const directBooking = await prisma.booking.findUnique({
      where: { reference },
      include: {
        customer: true,
        staff: true,
        items: { include: { service: true } },
      },
    });

    if (directBooking) {
      const bookingData: BookingSummaryData = {
        id: directBooking.id,
        reference: directBooking.reference,
        status: directBooking.status as BookingStatusType,
        startUtc: directBooking.startUtc,
        endUtc: directBooking.endUtc,
        totalPesewas: directBooking.totalPesewas,
        depositRequiredPesewas: directBooking.depositRequiredPesewas,
        amountPaidPesewas: directBooking.amountPaidPesewas,
        customerName: directBooking.customer.name,
        customerPhone: directBooking.customer.phone,
        staffName: directBooking.staff.name,
        items: directBooking.items.map((i) => ({
          name: i.service.name,
          pricePesewas: i.pricePesewas,
          durationMin: i.durationMin,
        })),
      };

      return successResponse({
        verified: true,
        status: directBooking.status,
        booking: bookingData,
        message: "Booking retrieved successfully",
      });
    }

    // 1. Fetch provider status
    const provider = getPaymentProvider();
    const providerResult = await provider.verify(reference);

    // 2. Reconcile with atomic row locking
    const reconcileResult = await reconcilePaymentTransaction({
      reference,
      providerResult,
      source: "RETURN_URL",
    });

    // 3. Fetch detailed booking details for return page display
    let bookingData: BookingSummaryData | null = null;
    if (reconcileResult.bookingId) {
      const b = await prisma.booking.findUnique({
        where: { id: reconcileResult.bookingId },
        include: {
          customer: true,
          staff: true,
          items: {
            include: { service: true },
          },
        },
      });
      if (b) {
        bookingData = {
          id: b.id,
          reference: b.reference,
          status: b.status as BookingStatusType,
          startUtc: b.startUtc,
          endUtc: b.endUtc,
          totalPesewas: b.totalPesewas,
          depositRequiredPesewas: b.depositRequiredPesewas,
          amountPaidPesewas: b.amountPaidPesewas,
          customerName: b.customer.name,
          customerPhone: b.customer.phone,
          staffName: b.staff.name,
          items: b.items.map((i) => ({
            name: i.service.name,
            pricePesewas: i.pricePesewas,
            durationMin: i.durationMin,
          })),
        };
      }
    }

    return successResponse({
      verified: reconcileResult.success,
      alreadyProcessed: reconcileResult.alreadyProcessed,
      paymentStatus: reconcileResult.paymentStatus,
      bookingStatus: reconcileResult.bookingStatus,
      amountPaidPesewas: reconcileResult.amountPaidPesewas,
      booking: bookingData,
      message: reconcileResult.message,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
