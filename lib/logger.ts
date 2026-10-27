/**
 * Structured logger for application monitoring, audit trailing, and error reporting.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
}

class Logger {
  private formatLog(level: LogLevel, message: string, context?: Record<string, unknown>, err?: unknown): string {
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    if (err instanceof Error) {
      payload.error = {
        name: err.name,
        message: err.message,
        stack: err.stack,
      };
    } else if (err) {
      payload.error = {
        message: String(err),
      };
    }

    return JSON.stringify(payload);
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(this.formatLog("debug", message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>) {
    console.info(this.formatLog("info", message, context));
  }

  warn(message: string, context?: Record<string, unknown>) {
    console.warn(this.formatLog("warn", message, context));
  }

  error(message: string, err?: unknown, context?: Record<string, unknown>) {
    console.error(this.formatLog("error", message, context, err));
  }
}

export const logger = new Logger();
