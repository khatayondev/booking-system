import { z } from "zod";
import { getCurrentSession, createPasswordResetToken, hashPassword } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { errorResponse, successResponse } from "@/lib/api-response";

const resetPasswordActionSchema = z.object({
  action: z.enum(["generate_link", "direct_reset"]),
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
