import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("postgresql://localhost:5432/booking_system_db?schema=public"),
  AUTH_SECRET: z.string().min(16).default("dev-super-secret-key-32-chars-minimum-needed-for-security"),
  PAYSTACK_SECRET_KEY: z.string().default("sk_test_demo_gh_paystack_secret_key"),
  PAYSTACK_PUBLIC_KEY: z.string().default("pk_test_demo_gh_paystack_public_key"),
  SMS_API_KEY: z.string().default("test_sms_api_key_arkesel_mnotify"),
  APP_URL: z.string().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  // Try loading local .env if in node environment without process.env loaded
  if (typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile();
    } catch {
      // ignore if already loaded or file missing
    }
  }

  // Derive production URL from VERCEL_URL if APP_URL is unset
  const vercelAppUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : undefined;

  const raw = {
    DATABASE_URL: process.env.DATABASE_URL || "postgresql://localhost:5432/booking_system_db?schema=public",
    AUTH_SECRET: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-super-secret-key-32-chars-minimum-needed-for-security",
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY || "sk_test_demo_gh_paystack_secret_key",
    PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY || "pk_test_demo_gh_paystack_public_key",
    SMS_API_KEY: process.env.SMS_API_KEY || "test_sms_api_key_arkesel_mnotify",
    APP_URL: process.env.APP_URL || vercelAppUrl || "http://localhost:3000",
    NODE_ENV: (process.env.NODE_ENV as "development" | "test" | "production") || "development",
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  };

  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("⚠️ Warning: Environment variables fell back to safe defaults:", parsed.error.issues);
    return raw as Env;
  }

  return parsed.data;
}

export const env = parseEnv();
