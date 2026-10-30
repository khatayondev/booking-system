import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { ROLES } from "@/lib/rbac";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { sendResendEmail } from "@/lib/email/resend";
import { buildTestEmail } from "@/lib/email/templates";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    if (session.role !== ROLES.OWNER_ADMIN && session.role !== ROLES.MANAGER) {
      return errorResponse("Only Managers and Owners can dispatch test emails", "FORBIDDEN", 403);
    }

    const body = await req.json().catch(() => ({}));
    const targetEmail = body.email || session.email;

    if (!targetEmail || !targetEmail.includes("@")) {
      return errorResponse("A valid recipient email address is required", "BAD_REQUEST", 400);
    }

    const { subject, html, text } = buildTestEmail({
      recipientEmail: targetEmail,
      providerName: "Resend Transactional",
    });

    const result = await sendResendEmail({
      to: targetEmail,
      subject,
      html,
      text,
    });

    if (!result.success) {
      return errorResponse(
        result.error || "Failed to dispatch email via Resend.",
        "EMAIL_DELIVERY_FAILED",
        502,
        result.raw
      );
    }

    // Record in MessageLog for audit trail
    try {
      await prisma.messageLog.create({
        data: {
          recipient: targetEmail,
          channel: "EMAIL",
          event: "test_email",
          subject,
          content: "[Test email dispatched via Resend]",
          status: "DELIVERED",
          gatewayId: result.id,
          idempotencyKey: `test_email_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          deliveredAt: new Date(),
        },
      });
    } catch {
      // Non-fatal
    }

    return successResponse({
      recipient: targetEmail,
      gatewayMessageId: result.id,
      provider: "Resend",
      message: `Test email successfully dispatched to ${targetEmail}`,
    });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}
