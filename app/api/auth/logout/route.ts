import { terminateCurrentSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { successResponse } from "@/lib/api-response";

export async function POST() {
  await terminateCurrentSession();

  const response = successResponse({ loggedOut: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
