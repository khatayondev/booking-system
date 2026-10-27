import { getCurrentSession } from "@/lib/auth";
import { errorResponse, successResponse, withErrorHandler } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/rbac";
import { ensureDefaultTemplates } from "@/lib/notifications/template-service";

export const GET = withErrorHandler(async () => {
  const session = await getCurrentSession();
  if (!session) {
    return errorResponse("Authentication required", "UNAUTHORIZED", 401);
  }

  // Ensure default templates are seeded
  await ensureDefaultTemplates();

  const templates = await prisma.messageTemplate.findMany({
    orderBy: [{ channel: "asc" }, { event: "asc" }],
  });

  return successResponse({ templates });
});

export const PATCH = withErrorHandler(async (req: Request) => {
  const session = await getCurrentSession();
  if (!session) {
    return errorResponse("Authentication required", "UNAUTHORIZED", 401);
  }

  // Strictly permission-gated to Manager and above
  if (session.role !== ROLES.OWNER_ADMIN && session.role !== ROLES.MANAGER) {
    return errorResponse(
      "Forbidden: Templates are editable by Manager and above only",
      "FORBIDDEN",
      403
    );
  }

  const body = await req.json();
  const { id, slug, template, subject, active } = body;

  if (!id && !slug) {
    return errorResponse("Template ID or slug is required", "INVALID_INPUT", 400);
  }

  if (template !== undefined && typeof template !== "string") {
    return errorResponse("Template content must be a string", "INVALID_INPUT", 400);
  }

  const existing = await prisma.messageTemplate.findFirst({
    where: id ? { id } : { slug },
  });

  if (!existing) {
    return errorResponse("Template not found", "NOT_FOUND", 404);
  }

  const updated = await prisma.messageTemplate.update({
    where: { id: existing.id },
    data: {
      template: template !== undefined ? template : existing.template,
      subject: subject !== undefined ? subject : existing.subject,
      active: active !== undefined ? active : existing.active,
    },
  });

  return successResponse({ template: updated });
});
