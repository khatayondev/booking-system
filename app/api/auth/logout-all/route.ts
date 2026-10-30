import { getCurrentSession, terminateAllUserSessions, SESSION_COOKIE_NAME } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return errorResponse("Authentication required", "UNAUTHORIZED", 401);
  }

  await terminateAllUserSessions(session.userId);

  const host = req.headers.get("host") || "";
  const isCustomDomain = host.includes("beccascrownbeauty.com");

  const response = successResponse({ loggedOutAll: true });
  response.cookies.delete({
    name: SESSION_COOKIE_NAME,
    path: "/",
    domain: isCustomDomain ? ".beccascrownbeauty.com" : undefined,
  });
  return response;
}
