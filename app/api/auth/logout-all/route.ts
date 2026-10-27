import { getCurrentSession, terminateAllUserSessions, SESSION_COOKIE_NAME } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function POST() {
  const session = await getCurrentSession();
  if (!session) {
    return errorResponse("Authentication required", "UNAUTHORIZED", 401);
  }

  await terminateAllUserSessions(session.userId);

  const response = successResponse({ loggedOutAll: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
