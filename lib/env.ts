import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),
  PAYSTACK_SECRET_KEY: z.string().min(1, "PAYSTACK_SECRET_KEY is required"),
  PAYSTACK_PUBLIC_KEY: z.string().min(1, "PAYSTACK_PUBLIC_KEY is required"),
  SMS_API_KEY: z.string().min(1, "SMS_API_KEY is required"),
  APP_URL: z.string().url("APP_URL must be a valid URL"),
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

  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  const isTest = process.env.NODE_ENV === "test";
  
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
      
    if (isBuildPhase || isTest) {
      return {
        DATABASE_URL: process.env.DATABASE_URL || "postgresql://khatayon@localhost:5432/booking_system_db?schema=public",
        AUTH_SECRET: process.env.AUTH_SECRET || "dummy-secret-at-least-32-chars-long",
        PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY || "dummy_sk_test",
        PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY || "dummy_pk_test",
        SMS_API_KEY: process.env.SMS_API_KEY || "dummy_sms_test",
        APP_URL: process.env.APP_URL || "http://localhost:3000",
        NODE_ENV: (process.env.NODE_ENV as "development" | "test" | "production") || "test",
      };
    }

    const message = `❌ Invalid or missing environment variables:\n${errorDetails}`;
    console.error(message);
    throw new Error(message);
  }

  return parsed.data;
}

export const env = parseEnv();
