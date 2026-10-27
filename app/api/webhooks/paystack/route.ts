import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { reconcilePaymentTransaction } from "@/lib/payments/reconciliation";
import { assertPaymentTransition } from "@/lib/payments/state-machine";

export async function POST(req: NextRequest) {
  try {
    // 1. Read raw body as text for HMAC verification
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature) {
      logger.warn("[Paystack Webhook] Missing x-paystack-signature header");
      return errorResponse("Missing Paystack signature", "UNAUTHORIZED", 401);
    }

    // 2. Verify HMAC SHA512 signature
    const hash = crypto
      .createHmac("sha512", env.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest("hex");

    if (hash !== signature) {
      logger.warn("[Paystack Webhook] Invalid signature match");
      return errorResponse("Invalid webhook signature", "UNAUTHORIZED", 401);
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;
    const eventId = String(event.data?.id || event.data?.reference || `${eventType}_${Date.now()}`);
    const reference = event.data?.reference;

    logger.info(`[Paystack Webhook] Received ${eventType} for ref: ${reference || "N/A"} (eventId: ${eventId})`);

    // 3. Idempotency Check: check if already processed
    const alreadyProcessed = await prisma.processedWebhook.findUnique({
      where: { eventId },
    });

    if (alreadyProcessed) {
      logger.info(`[Paystack Webhook] Duplicate event ${eventId} dropped cleanly`);
      return successResponse({ message: "Event already processed (idempotent)" });
    }

    // 4. Process supported event types
    if (eventType === "charge.success") {
      const tx = event.data;
      await reconcilePaymentTransaction({
        reference: tx.reference,
        providerResult: {
          reference: tx.reference,
          status: "success",
          amountPesewas: tx.amount,
          currency: tx.currency,
          channel: tx.channel || "mobile_money",
          paidAt: tx.paid_at,
          gatewayResponse: tx.gateway_response,
          metadata: tx.metadata,
        },
        source: "WEBHOOK",
      });
    } else if (eventType === "charge.failed") {
      const tx = event.data;
      await reconcilePaymentTransaction({
        reference: tx.reference,
        providerResult: {
          reference: tx.reference,
          status: "failed",
          amountPesewas: tx.amount,
          currency: tx.currency,
          channel: tx.channel || "mobile_money",
          gatewayResponse: tx.gateway_response || "Payment failed",
        },
        source: "WEBHOOK",
      });
    } else if (eventType === "refund.processed") {
      const rf = event.data;
      const paymentRef = rf.transaction_reference;

      if (paymentRef) {
        await prisma.$transaction(async (tx) => {
          const locked = await tx.payment.findUnique({
            where: { reference: paymentRef },
          });

          if (locked) {
            const nextStatus =
              rf.amount < locked.amountPesewas ? "PARTIALLY_REFUNDED" : "REFUNDED";

            assertPaymentTransition(locked.status, nextStatus);

            await tx.payment.update({
              where: { id: locked.id },
              data: { status: nextStatus },
            });

            await tx.refund.create({
              data: {
                paymentId: locked.id,
                amountPesewas: rf.amount,
                reason: rf.merchant_note || "Processed via Paystack Webhook",
                status: "COMPLETED",
              },
            });
          }
        });
      }
    }

    // 5. Mark event as processed
    await prisma.processedWebhook.create({
      data: {
        eventId,
        eventType,
        payload: event,
      },
    });

    return successResponse({ received: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
