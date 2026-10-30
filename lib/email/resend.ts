import { logger } from "../logger";
import { prisma } from "../db";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResponse {
  success: boolean;
  id?: string;
  error?: string;
  raw?: unknown;
}

const DEFAULT_RESEND_FROM = "Becca's Crown Beauty Vault <onboarding@resend.dev>";

/**
 * Resolves the Resend API Key from DB settings or environment variables.
 */
export async function getResendApiKey(): Promise<string | null> {
  if (process.env.RESEND_API_KEY?.trim()) {
    return process.env.RESEND_API_KEY.trim();
  }

  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "resend_api_key" },
    });
    if (setting?.value) {
      return setting.value.trim();
    }
  } catch {
    // DB not available or table not ready
  }

  return null;
}

/**
 * Resolves the From address from options, DB settings, env, or default onboarding domain.
 */
export async function getResendFromAddress(explicitFrom?: string): Promise<string> {
  if (explicitFrom) return explicitFrom;

  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "resend_from_email" },
    });
    if (setting?.value) {
      return setting.value.trim();
    }
  } catch {
    // DB not available
  }

  return process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_RESEND_FROM;
}

/**
 * Sends a transactional email through Resend REST API.
 */
export async function sendResendEmail(options: SendEmailOptions): Promise<SendEmailResponse> {
  const apiKey = await getResendApiKey();

  if (!apiKey) {
    const error = "RESEND_API_KEY is not configured in environment or database settings.";
    logger.warn(`[Resend] Email suppressed: ${error}`, { to: options.to, subject: options.subject });
    return {
      success: false,
      error,
    };
  }

  const from = await getResendFromAddress(options.from);
  const recipients = Array.isArray(options.to) ? options.to : [options.to];

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]+>/g, ""),
        ...(options.replyTo ? { reply_to: options.replyTo } : {}),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data?.message || `Resend HTTP error ${res.status}: ${res.statusText}`;
      logger.error(`[Resend] Send failed: ${errorMsg}`, {
        to: recipients,
        from,
        subject: options.subject,
        response: data,
      });

      return {
        success: false,
        error: errorMsg,
        raw: data,
      };
    }

    logger.info(`[Resend] Email dispatched successfully to ${recipients.join(", ")}`, {
      messageId: data?.id,
      subject: options.subject,
    });

    return {
      success: true,
      id: data?.id,
      raw: data,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[Resend] Network exception while sending email: ${msg}`, { err, to: recipients });
    return {
      success: false,
      error: msg,
    };
  }
}

