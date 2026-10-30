import { z } from "zod";
import { authenticateStaff, SESSION_COOKIE_NAME, SESSION_ABSOLUTE_EXPIRY_HOURS } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or phone number is required"),
  password: z.string().min(1, "Password is required"),
  totpCode: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid credentials. Please verify your details and try again.", "INVALID_CREDENTIALS", 400);
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await authenticateStaff(
      parsed.data.identifier,
      parsed.data.password,
      parsed.data.totpCode,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      if (result.requiresTotp) {
        return successResponse({
          requiresTotp: true,
          user: result.user,
        });
      }
      return errorResponse(result.error || "Invalid credentials.", "AUTH_FAILED", 401);
    }

    // Set secure httpOnly cookie
    const response = successResponse({
      user: result.user,
      requiresPasswordChange: result.requiresPasswordChange,
    });

    const host = req.headers.get("host") || "";
    const isCustomDomain = host.includes("beccascrownbeauty.com");

    if (result.sessionToken) {
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: result.sessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        domain: isCustomDomain ? ".beccascrownbeauty.com" : undefined,
        maxAge: SESSION_ABSOLUTE_EXPIRY_HOURS * 60 * 60,
      });
    }

    return response;
  } catch (err) {
    return errorResponse(process.env.NODE_ENV === "production" ? "Authentication error" : String(err), "SERVER_ERROR", 500);
  }
}
