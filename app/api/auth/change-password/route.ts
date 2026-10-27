import { z } from "zod";
import { getCurrentSession, hashPassword, logAuthEvent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

const changePasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters long"),
});

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return errorResponse("Authentication required", "UNAUTHORIZED", 401);
  }

  const body = await req.json();
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message || "Invalid password", "INVALID_INPUT", 400);
  }

  const newHash = await hashPassword(parsed.data.newPassword);

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
    },
  });

  await logAuthEvent("AUTH_PASSWORD_CHANGE", session.userId);

  return successResponse({ changed: true });
}
