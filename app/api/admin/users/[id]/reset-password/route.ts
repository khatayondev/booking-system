import { z } from "zod";
import { getCurrentSession, createPasswordResetToken, hashPassword } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS, ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { errorResponse, successResponse } from "@/lib/api-response";
import { sendResendEmail } from "@/lib/email/resend";
import { buildUserWelcomeEmail } from "@/lib/email/templates";
import { logger } from "@/lib/logger";

const resetPasswordActionSchema = z.object({
  action: z.enum(["generate_link", "direct_reset", "send_email"]),
  newPassword: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id: targetUserId } = await props.params;
  const session = await getCurrentSession();
  if (!session) {
    return errorResponse("Authentication required", "UNAUTHORIZED", 401);
  }

  requirePermission(session, PERMISSION_KEYS.USERS_MANAGE);

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { role: true },
  });

  if (!targetUser || !targetUser.active || targetUser.deletedAt) {
    return errorResponse("User not found or inactive", "NOT_FOUND", 404);
  }

  const body = await req.json();
  const parsed = resetPasswordActionSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message || "Invalid input", "INVALID_INPUT", 400);
  }

  const { action, newPassword } = parsed.data;

  if (action === "generate_link") {
    const rawToken = await createPasswordResetToken(targetUser.id, 24);
    const resetUrl = `${env.APP_URL}/reset-password?token=${rawToken}`;

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "USER_RESET_LINK_GENERATED",
        entityType: "User",
        entityId: targetUser.id,
        newValues: { email: targetUser.email },
      },
    });

    return successResponse({
      resetUrl,
      token: rawToken,
      expiresInHours: 24,
      message: "Password reset link generated successfully.",
    });
  }

  // Send credentials / temporary password directly to user's email
  if (action === "send_email") {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$*";
    let tempPassword = "";
    for (let i = 0; i < 10; i++) {
      tempPassword += chars[Math.floor(Math.random() * chars.length)];
    }

    const passwordHash = await hashPassword(tempPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUser.id },
        data: {
          passwordHash,
          mustChangePassword: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      await tx.session.deleteMany({
        where: { userId: targetUser.id },
      });

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: "USER_CREDENTIALS_EMAILED",
          entityType: "User",
          entityId: targetUser.id,
          newValues: { email: targetUser.email },
        },
      });
    });

    const loginUrl = `${env.APP_URL}/login`;
    const roleFriendlyName =
      targetUser.role.name === ROLES.FRONT_DESK
        ? "Front Desk Tablet (Operations & POS)"
        : targetUser.role.name === ROLES.OWNER_ADMIN
        ? "Studio Owner & Admin"
        : targetUser.role.name === ROLES.MANAGER
        ? "Studio Manager"
        : targetUser.role.name === ROLES.STAFF_RECEPTIONIST
        ? "Staff Specialist & Stylist"
        : targetUser.role.name;

    const emailPayload = buildUserWelcomeEmail({
      name: targetUser.name,
      email: targetUser.email,
      temporaryPassword: tempPassword,
      roleName: roleFriendlyName,
      loginUrl,
    });

    let emailSent = false;
    let emailError: string | null = null;

    try {
      const emailResult = await sendResendEmail({
        to: targetUser.email,
        subject: emailPayload.subject,
        html: emailPayload.html,
        text: emailPayload.text,
      });
      emailSent = emailResult.success;
      if (!emailResult.success) {
        emailError = emailResult.error || "Failed to deliver email.";
        logger.warn(`[ResetPassword] Email delivery to ${targetUser.email} notice:`, { error: emailResult.error });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send email.";
      emailError = message;
      logger.error(`[ResetPassword] Error emailing ${targetUser.email}:`, err);
    }

    return successResponse({
      temporaryPassword: tempPassword,
      emailSent,
      emailError,
      message: emailSent
        ? `New temporary password has been emailed to ${targetUser.email}.`
        : `Password updated. (Notice: ${emailError || "Email could not be delivered"}).`,
    });
  }

  // Direct reset by admin
  if (!newPassword) {
    return errorResponse("newPassword is required for direct reset", "INVALID_INPUT", 400);
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUser.id },
      data: {
        passwordHash,
        mustChangePassword: true, // Force password update on their next login
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Invalidate existing sessions for security
    await tx.session.deleteMany({
      where: { userId: targetUser.id },
    });

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "USER_PASSWORD_DIRECTLY_RESET",
        entityType: "User",
        entityId: targetUser.id,
        newValues: { forcedChangeOnLogin: true },
      },
    });
  });

  return successResponse({
    message: "Password reset successfully. The user must change their password on next login.",
  });
}
