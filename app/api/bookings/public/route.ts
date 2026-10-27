import { NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { normalizeGhanaPhone } from "@/lib/sms";
import { calculateDeposit, sumPesewas } from "@/lib/money";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { emitBookingEvent } from "@/lib/booking-events";

const publicBookingSchema = z.object({
  serviceIds: z.array(z.string().min(1)).min(1, "At least one service is required"),
  addonIds: z.array(z.string().min(1)).optional().default([]),
  staffId: z.string().min(1, "Staff member is required"),
  startUtc: z.string().datetime("startUtc must be a valid ISO datetime"),
  endUtc: z.string().datetime("endUtc must be a valid ISO datetime"),
  holdToken: z.string().optional(),
  customer: z.object({
    name: z.string().min(2, "Full name must be at least 2 characters"),
    phone: z.string().min(9, "Ghana phone number is required"),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
    notes: z.string().max(500).optional(),
  }),
  paymentType: z.enum(["DEPOSIT", "FULL"]).default("DEPOSIT"),
  policyAgreed: z.literal(true, {
    error: "You must accept the cancellation and studio policies to proceed",
  }),
});

function generateBookingReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BK-${code}`;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    checkRateLimit(`guest_booking:${ip}`, 15, 60);

    const body = await req.json();
    const parsed = publicBookingSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message || "Invalid booking data",
        "BAD_REQUEST",
        400,
        parsed.error.flatten()
      );
    }

    const {
      serviceIds,
      addonIds,
      staffId,
      startUtc,
      endUtc,
      holdToken,
      customer,
      paymentType,
    } = parsed.data;

    // 1. Normalize Ghana phone number
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizeGhanaPhone(customer.phone);
    } catch {
      return errorResponse(
        "Invalid Ghana phone number format. Provide 10 digits (e.g. 024XXXXXXX) or +233 format.",
        "BAD_REQUEST",
        400
      );
    }

    // 2. Fetch services and validate
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds }, active: true, deletedAt: null },
      include: {
        addons: {
          where: { id: { in: addonIds }, active: true },
        },
      },
    });

    if (services.length !== serviceIds.length) {
      return errorResponse("One or more selected services are unavailable", "BAD_REQUEST", 400);
    }

    // 3. Compute price and deposit on the server (do NOT trust client totals)
    let totalServicesPesewas = 0;
    let totalAddonsPesewas = 0;
    let calculatedDepositPesewas = 0;

    const bookingItemsToCreate: Array<{
      serviceId: string;
      pricePesewas: number;
      durationMin: number;
    }> = [];

    for (const svc of services) {
      totalServicesPesewas += svc.pricePesewas;
      bookingItemsToCreate.push({
        serviceId: svc.id,
        pricePesewas: svc.pricePesewas,
        durationMin: svc.durationMin,
      });

      // Compute deposit for this service
      const svcDeposit = calculateDeposit(
        svc.pricePesewas,
        svc.depositType as "FIXED" | "PERCENTAGE" | "FULL" | "NONE",
        svc.depositValue
      );
      calculatedDepositPesewas += svcDeposit;

      // Add-ons for this service
      for (const addon of svc.addons) {
        totalAddonsPesewas += addon.pricePesewas;
      }
    }

    const subtotalPesewas = sumPesewas(totalServicesPesewas, totalAddonsPesewas);
    const totalPesewas = subtotalPesewas;
    const depositRequiredPesewas =
      calculatedDepositPesewas > 0 ? calculatedDepositPesewas : totalPesewas;

    const amountToPayPesewas =
      paymentType === "FULL" ? totalPesewas : depositRequiredPesewas;

    // 4. Upsert Customer (never create duplicate accounts)
    const dbCustomer = await prisma.customer.upsert({
      where: { phone: normalizedPhone },
      update: {
        name: customer.name,
        email: customer.email || undefined,
        notes: customer.notes || undefined,
      },
      create: {
        phone: normalizedPhone,
        name: customer.name,
        email: customer.email || undefined,
        notes: customer.notes || undefined,
      },
    });

    // 5. Generate secure manage token and reference
    const rawManageToken = crypto.randomBytes(24).toString("hex");
    const manageTokenHash = crypto
      .createHash("sha256")
      .update(rawManageToken)
      .digest("hex");

    let reference = generateBookingReference();
    // Ensure uniqueness
    let existing = await prisma.booking.findUnique({ where: { reference } });
    while (existing) {
      reference = generateBookingReference();
      existing = await prisma.booking.findUnique({ where: { reference } });
    }

    // 6. Create booking with items
    const booking = await prisma.$transaction(async (tx) => {
      const createdBooking = await tx.booking.create({
        data: {
          reference,
          status: "PENDING_PAYMENT",
          source: "WEB",
          startUtc: new Date(startUtc),
          endUtc: new Date(endUtc),
          staffId,
          customerId: dbCustomer.id,
          subtotalPesewas,
          totalPesewas,
          depositRequiredPesewas,
          amountPaidPesewas: 0,
          notes: customer.notes || null,
          manageTokenHash,
          items: {
            create: bookingItemsToCreate,
          },
        },
      });

      // Release hold if token provided
      if (holdToken) {
        await tx.slotHold.deleteMany({
          where: { token: holdToken },
        });
      }

      return createdBooking;
    });

    emitBookingEvent({
      type: "CREATED",
      bookingId: booking.id,
      reference: booking.reference,
      staffId: booking.staffId,
      status: booking.status,
      timestamp: new Date().toISOString(),
    });

    return successResponse(
      {
        bookingId: booking.id,
        reference: booking.reference,
        manageToken: rawManageToken,
        status: booking.status,
        subtotalPesewas: booking.subtotalPesewas,
        totalPesewas: booking.totalPesewas,
        depositRequiredPesewas: booking.depositRequiredPesewas,
        amountToPayPesewas,
        paymentType,
        customer: {
          name: dbCustomer.name,
          phone: dbCustomer.phone,
          email: dbCustomer.email,
        },
      },
      "Booking initiated successfully",
      201
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
