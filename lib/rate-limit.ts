import { NextRequest } from "next/server";
import { AppError } from "./api-response";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Extracts client IP address from Next.js request headers.
 */
export function getClientIp(req: Request | NextRequest): string {
  const headers = "headers" in req ? req.headers : new Headers();
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Enforces rate limiting on an endpoint with customizable window and maximum requests.
 * Throws AppError(..., 429, "RATE_LIMIT_EXCEEDED") if limit exceeded.
 */
export function checkRateLimit(
  key: string,
  maxRequests = 60,
  windowSeconds = 60
): { current: number; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      current: 1,
      remaining: maxRequests - 1,
      resetInSeconds: windowSeconds,
    };
  }

  if (record.count >= maxRequests) {
    const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    throw new AppError(
      `Rate limit exceeded. Try again in ${resetInSeconds} seconds.`,
      429,
      "RATE_LIMIT_EXCEEDED",
      { retryAfter: resetInSeconds }
    );
  }

  record.count += 1;
  const remaining = Math.max(0, maxRequests - record.count);
  const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));

  return {
    current: record.count,
    remaining,
    resetInSeconds,
  };
}
