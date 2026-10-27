import { getCurrentSession } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  }

  return successResponse({
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
      permissions: session.permissions,
      staffId: session.staffId,
    },
  });
}
