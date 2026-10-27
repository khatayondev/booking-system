import { SmsProvider, EmailProvider } from "../types";
import { ArkeselSmsProvider } from "./sms/arkesel";
import { MNotifySmsProvider } from "./sms/mnotify";
import { MockSmsProvider } from "./sms/mock";
import { ResendEmailProvider } from "./email/resend";
import { SmtpEmailProvider } from "./email/smtp";
import { MockEmailProvider } from "./email/mock";
import { prisma } from "../../db";
import { env } from "../../env";

export const globalMockSmsProvider = new MockSmsProvider();
export const globalMockEmailProvider = new MockEmailProvider();

let customSmsProvider: SmsProvider | null = null;
let customEmailProvider: EmailProvider | null = null;

export function setCustomSmsProvider(provider: SmsProvider | null): void {
  customSmsProvider = provider;
}

export function setCustomEmailProvider(provider: EmailProvider | null): void {
  customEmailProvider = provider;
}

/**
 * Checks whether notification sandbox mode is enabled.
 * Defaults to true in test environment or when notification_sandbox_mode is explicitly set to "true".
 */
export async function isSandboxMode(): Promise<boolean> {
  if (process.env.NODE_ENV === "test") {
    return true;
  }
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "notification_sandbox_mode" },
    });
    if (setting && setting.value === "true") {
      return true;
    }
    if (setting && setting.value === "false") {
      return false;
    }
  } catch {
    // DB unreachable or table not ready, default to safe mode
  }
  return process.env.NOTIFICATION_SANDBOX_MODE === "true";
}

/**
 * Gets the active SMS provider based on configuration, database settings, and sandbox mode.
 */
export async function getSmsProvider(): Promise<SmsProvider> {
  if (customSmsProvider) {
    return customSmsProvider;
  }

  const sandbox = await isSandboxMode();
  if (sandbox) {
    return globalMockSmsProvider;
  }

  try {
    const providerSetting = await prisma.setting.findUnique({
      where: { key: "sms_provider" },
    });
    const providerName = (providerSetting?.value || "ARKESEL").toUpperCase();

    if (providerName === "MNOTIFY") {
      const apiKeySetting = await prisma.setting.findUnique({ where: { key: "mnotify_api_key" } });
      const apiKey = apiKeySetting?.value || process.env.MNOTIFY_API_KEY || env.SMS_API_KEY;
      return new MNotifySmsProvider(apiKey);
    } else {
      const apiKeySetting = await prisma.setting.findUnique({ where: { key: "arkesel_api_key" } });
      const apiKey = apiKeySetting?.value || process.env.ARKESEL_API_KEY || env.SMS_API_KEY;
      return new ArkeselSmsProvider(apiKey);
    }
  } catch {
    return globalMockSmsProvider;
  }
}

/**
 * Gets the active Email provider based on configuration, database settings, and sandbox mode.
 */
export async function getEmailProvider(): Promise<EmailProvider> {
  if (customEmailProvider) {
    return customEmailProvider;
  }

  const sandbox = await isSandboxMode();
  if (sandbox) {
    return globalMockEmailProvider;
  }

  try {
    const providerSetting = await prisma.setting.findUnique({
      where: { key: "email_provider" },
    });
    const providerName = (providerSetting?.value || "RESEND").toUpperCase();

    if (providerName === "SMTP") {
      const host = (await prisma.setting.findUnique({ where: { key: "smtp_host" } }))?.value || process.env.SMTP_HOST || "smtp.example.com";
      const port = Number((await prisma.setting.findUnique({ where: { key: "smtp_port" } }))?.value || process.env.SMTP_PORT || "587");
      const user = (await prisma.setting.findUnique({ where: { key: "smtp_user" } }))?.value || process.env.SMTP_USER || "";
      const pass = (await prisma.setting.findUnique({ where: { key: "smtp_pass" } }))?.value || process.env.SMTP_PASS || "";
      return new SmtpEmailProvider({ host, port, user, pass });
    } else {
      const apiKey = (await prisma.setting.findUnique({ where: { key: "resend_api_key" } }))?.value || process.env.RESEND_API_KEY || "dummy_resend_key";
      return new ResendEmailProvider(apiKey);
    }
  } catch {
    return globalMockEmailProvider;
  }
}
