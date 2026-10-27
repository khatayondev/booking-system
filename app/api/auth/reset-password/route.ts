import { z } from "zod";
import { resetPasswordWithToken } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters long"),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message || "Invalid input", "INVALID_INPUT", 400);
  }

  const result = await resetPasswordWithToken(parsed.data.token, parsed.data.newPassword);
  if (!result.success) {
    return errorResponse(result.error || "Password reset failed", "INVALID_TOKEN", 400);
  }

  return successResponse({ reset: true, message: "Password updated successfully. Please log in." });
}
