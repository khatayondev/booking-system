import { NextRequest } from "next/server";
import { z } from "zod";
import { getPaymentProvider } from "@/lib/payments/provider";
import { reconcilePaymentTransaction } from "@/lib/payments/reconciliation";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { prisma } from "@/lib/db";

const otpSchema = z.object({
  reference: z.string().min(1, "Reference is required"),
  otp: z.string().min(4, "OTP must be at least 4 digits"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = otpSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message || "Invalid payload",
        "BAD_REQUEST",
        400
      );
    }

    const { reference, otp } = parsed.data;

    const provider = getPaymentProvider();
    const result = await provider.submitOtp({ reference, otp });

    if (result.status === "success") {
      const payment = await prisma.payment.findUnique({ where: { reference } });
      if (payment) {
        await reconcilePaymentTransaction({
          reference,
          providerResult: {
            reference,
            status: "success",
            amountPesewas: payment.amountPesewas,
            currency: "GHS",
            channel: "mobile_money",
            paidAt: new Date().toISOString(),
          },
          source: "POS",
        });
      }
    }

    return successResponse({
      reference,
      status: result.status,
      displayMessage: result.displayMessage,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
