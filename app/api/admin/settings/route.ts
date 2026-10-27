import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { getSettings, saveSettings, updateSettingsSchema } from "@/lib/settings";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }
    // Any authenticated staff can read business settings (e.g. for booking rules or opening hours)
    const settings = await getSettings({ requesterRole: session.role });
    return successResponse(settings);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }
    // Server-side permission check: require settings.manage
    requirePermission(session, PERMISSION_KEYS.SETTINGS_MANAGE);

    const body = await req.json();
    const parsed = updateSettingsSchema.parse(body);

    const updated = await saveSettings(parsed, {
      id: session.userId,
      role: session.role,
      name: session.name || session.email,
    });

    return successResponse(updated, "Business settings updated successfully");
  } catch (err) {
    return handleRouteError(err);
  }
}
