import { z } from "zod";
import { getCurrentSession, createPasswordResetToken } from "@/lib/auth";
import { ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { errorResponse, successResponse } from "@/lib/api-response";

const resetLinkSchema = z.object({
  targetUserId: z.string().uuid("Invalid target user ID"),
});

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return errorResponse("Authentication required", "UNAUTHORIZED", 401);
  }

  // Only Owner/Admin or Manager can generate staff password reset links
  if (session.role !== ROLES.OWNER_ADMIN && session.role !== ROLES.MANAGER) {
    return errorResponse("Forbidden: Insufficient permissions to generate reset links", "FORBIDDEN", 403);
  }

  const body = await req.json();
  const parsed = resetLinkSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Invalid target user ID", "INVALID_INPUT", 400);
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: parsed.data.targetUserId },
  });

  if (!targetUser || !targetUser.active || targetUser.deletedAt) {
    return errorResponse("Target staff member not found or inactive", "NOT_FOUND", 404);
  }

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  const baseUrl = host && !host.includes("localhost")
    ? `${proto}://${host}`
    : env.APP_URL && !env.APP_URL.includes("localhost")
    ? env.APP_URL
    : "https://www.beccascrownbeauty.com";

  const rawToken = await createPasswordResetToken(targetUser.id, 24);
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

  return successResponse({
    resetUrl,
    expiresInHours: 24,
    user: {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
    },
  });
}
