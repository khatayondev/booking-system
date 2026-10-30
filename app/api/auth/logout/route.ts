import { terminateCurrentSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { successResponse } from "@/lib/api-response";

export async function POST(req: Request) {
  await terminateCurrentSession();

  const host = req.headers.get("host") || "";
  const isCustomDomain = host.includes("beccascrownbeauty.com");

  const response = successResponse({ loggedOut: true });
  response.cookies.delete({
    name: SESSION_COOKIE_NAME,
    path: "/",
    domain: isCustomDomain ? ".beccascrownbeauty.com" : undefined,
  });
  return response;
}
