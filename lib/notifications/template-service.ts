import { prisma } from "../db";
import { DEFAULT_NOTIFICATION_TEMPLATES } from "./default-templates";
import { renderTemplate } from "./utils";
import { TemplateVariables } from "./types";
import { logger } from "../logger";

/**
 * Ensures all default templates exist in the database.
 */
export async function ensureDefaultTemplates(): Promise<void> {
  for (const def of DEFAULT_NOTIFICATION_TEMPLATES) {
    const existing = await prisma.messageTemplate.findUnique({
      where: { slug: def.slug },
    });

    if (!existing) {
      await prisma.messageTemplate.create({
        data: {
          slug: def.slug,
          name: def.name,
          channel: def.channel,
          event: def.event,
          subject: def.subject,
          template: def.template,
          variables: def.variables,
          description: def.description,
          active: true,
        },
      });
    }
  }
}

/**
 * Gets a template by event and channel, falling back to default code definitions if not yet seeded.
 */
export async function getTemplate(event: string, channel: "SMS" | "EMAIL"): Promise<{
  slug: string;
  name: string;
  subject?: string | null;
  template: string;
  variables: string[];
  active: boolean;
}> {
  try {
    const found = await prisma.messageTemplate.findFirst({
      where: { event, channel, active: true },
    });
    if (found) {
      return {
        slug: found.slug,
        name: found.name || found.slug,
        subject: found.subject,
        template: found.template,
        variables: found.variables,
        active: found.active,
      };
    }
  } catch (err) {
    logger.warn("Database lookup for template failed, falling back to default", { event, channel, error: String(err) });
  }

  const defaultDef = DEFAULT_NOTIFICATION_TEMPLATES.find(
    (t) => t.event === event && t.channel === channel
  );

  if (defaultDef) {
    return {
      slug: defaultDef.slug,
      name: defaultDef.name,
      subject: defaultDef.subject,
      template: defaultDef.template,
      variables: defaultDef.variables,
      active: true,
    };
  }

  return {
    slug: `${event}_${channel.toLowerCase()}`,
    name: `${event} ${channel}`,
    subject: `Notification: ${event}`,
    template: `Notification: {{service}} on {{date}} (Ref: {{reference}})`,
    variables: ["service", "date", "reference"],
    active: true,
  };
}

/**
 * Renders a notification message for a given event, channel, and variables.
 */
export async function renderNotificationMessage(
  event: string,
  channel: "SMS" | "EMAIL",
  variables: TemplateVariables
): Promise<{ subject?: string; content: string }> {
  const tmpl = await getTemplate(event, channel);
  const content = renderTemplate(tmpl.template, variables);
  const subject = tmpl.subject ? renderTemplate(tmpl.subject, variables) : undefined;
  return { subject, content };
}
