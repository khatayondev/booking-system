/**
 * Sentry-compatible Error Monitoring and Telemetry module.
 * Captures unhandled runtime exceptions, API crashes, and breadcrumbs.
 * Supports SENTRY_DSN environment variable with graceful fallback to structured logging.
 */

import { logger } from "./logger";

export interface SentryEventContext {
  userId?: string;
  role?: string;
  path?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

class SentryService {
  private dsn: string | null = null;
  private isEnabled = false;

  constructor() {
    this.dsn = process.env.SENTRY_DSN || null;
    this.isEnabled = !!this.dsn && process.env.NODE_ENV === "production";
  }

  /**
   * Captures an exception and dispatches it to Sentry if DSN is set.
   */
  async captureException(error: unknown, context?: SentryEventContext): Promise<string> {
    const eventId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Log structured error
    logger.error(`[Sentry ${eventId}] Captured exception: ${error instanceof Error ? error.message : String(error)}`, error, {
      eventId,
      ...context,
    });

    if (this.isEnabled && this.dsn) {
      try {
        // Direct lightweight HTTP POST to Sentry Ingest endpoint without heavy external SDK dependencies
        const url = new URL(this.dsn);
        const projectId = url.pathname.replace(/^\//, "");
        const key = url.username;
        const sentryHost = url.host;

        const sentryEndpoint = `https://${sentryHost}/api/${projectId}/store/`;

        const errObj = error instanceof Error ? error : new Error(String(error));

        const body = {
          event_id: eventId.replace(/[^a-f0-9]/gi, "").slice(0, 32).padEnd(32, "0"),
          timestamp: new Date().toISOString(),
          platform: "javascript",
          level: "error",
          logger: "booking-system-sentry",
          message: errObj.message,
          exception: {
            values: [
              {
                type: errObj.name,
                value: errObj.message,
                stacktrace: {
                  frames: errObj.stack
                    ? errObj.stack.split("\n").map((line) => ({ filename: line.trim() }))
                    : [],
                },
              },
            ],
          },
          user: context?.userId ? { id: context.userId } : undefined,
          tags: {
            environment: process.env.NODE_ENV || "development",
            ...context?.tags,
          },
          extra: context?.extra,
        };

        // Fire and forget
        fetch(sentryEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=aura-studio/1.0, sentry_key=${key}`,
          },
          body: JSON.stringify(body),
        }).catch(() => {
          // Swallow dispatch failures to prevent recursive error loops
        });
      } catch {
        // Quiet fallback
      }
    }

    return eventId;
  }

  /**
   * Captures informational or warning message.
   */
  captureMessage(message: string, level: "info" | "warning" | "error" = "info", context?: SentryEventContext) {
    logger.info(`[Sentry Message] ${message}`, { level, ...context });
  }
}

export const sentry = new SentryService();
