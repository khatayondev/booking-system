import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  hashPassword,
  authenticateStaff,
  validateSessionToken,
  generateSecureToken,
  hashToken,
  terminateAllUserSessions,
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES,
  SESSION_IDLE_TIMEOUT_HOURS,
} from "../lib/auth";
import { ROLES } from "../lib/rbac";
import { middleware, SESSION_COOKIE_NAME } from "../middleware";
import { NextRequest } from "next/server";

const prisma = new PrismaClient();

describe("Staff Authentication System", () => {
  let testUserId: string;
  const testEmail = "teststaff@aurastudio.gh";
  const testPhone = "+233249998877";
  const testPassword = "CorrectStaffPassword123!";

  beforeAll(async () => {
    // Ensure role exists
    const role = await prisma.role.upsert({
      where: { name: ROLES.STAFF_RECEPTIONIST },
      update: {},
      create: { name: ROLES.STAFF_RECEPTIONIST },
    });

    // Create test user with Argon2id hashed password
    const passwordHash = await hashPassword(testPassword);
    const user = await prisma.user.upsert({
      where: { email: testEmail },
      update: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
        phone: testPhone,
      },
      create: {
        email: testEmail,
        phone: testPhone,
        name: "Test Staff Member",
        passwordHash,
        roleId: role.id,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { userId: testUserId } });
    await prisma.auditLog.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it("authenticates successfully with email and correct password", async () => {
    const result = await authenticateStaff(testEmail, testPassword);
    expect(result.success).toBe(true);
    expect(result.sessionToken).toBeDefined();
    expect(result.user?.email).toBe(testEmail);
  });

  it("authenticates successfully with normalized Ghana phone number", async () => {
    // Input local format: "0249998877" matching "+233249998877"
    const result = await authenticateStaff("0249998877", testPassword);
    expect(result.success).toBe(true);
    expect(result.sessionToken).toBeDefined();
  });

  it("locks out an account after 5 consecutive failed attempts", async () => {
    // Reset attempts first
    await prisma.user.update({
      where: { id: testUserId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    // Fail 4 times
    for (let i = 1; i < MAX_LOGIN_ATTEMPTS; i++) {
      const res = await authenticateStaff(testEmail, "WrongPassword!");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Invalid credentials. Please verify your details and try again.");
    }

    // 5th failed attempt triggers lockout
    const finalFail = await authenticateStaff(testEmail, "WrongPassword!");
    expect(finalFail.success).toBe(false);
    expect(finalFail.error).toContain(`locked for ${LOCKOUT_DURATION_MINUTES} minutes`);

    // Verify user in database has lockedUntil set
    const userInDb = await prisma.user.findUnique({ where: { id: testUserId } });
    expect(userInDb?.lockedUntil).not.toBeNull();
    expect(userInDb!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

    // Even with the correct password, access is denied during lockout
    const lockedAttempt = await authenticateStaff(testEmail, testPassword);
    expect(lockedAttempt.success).toBe(false);
    expect(lockedAttempt.error).toContain("temporarily locked");

    // Verify audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: { userId: testUserId, action: "AUTH_ACCOUNT_LOCKED" },
    });
    expect(auditLogs.length).toBeGreaterThan(0);
  });

  it("enforces session expiry (both absolute and idle timeout)", async () => {
    // Create an active session
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);

    await prisma.session.create({
      data: {
        userId: testUserId,
        tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours in future
        lastActiveAt: new Date(),
      },
    });

    // Active session validates cleanly
    const activeSession = await validateSessionToken(rawToken);
    expect(activeSession).not.toBeNull();
    expect(activeSession?.userId).toBe(testUserId);

    // Test Idle Timeout: set lastActiveAt beyond idle timeout (e.g. 3 hours ago)
    const idleToken = generateSecureToken(32);
    await prisma.session.create({
      data: {
        userId: testUserId,
        tokenHash: hashToken(idleToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastActiveAt: new Date(Date.now() - (SESSION_IDLE_TIMEOUT_HOURS + 1) * 60 * 60 * 1000),
      },
    });

    const expiredIdle = await validateSessionToken(idleToken);
    expect(expiredIdle).toBeNull();

    // Test Absolute Expiry: set expiresAt in the past
    const absoluteExpiredToken = generateSecureToken(32);
    await prisma.session.create({
      data: {
        userId: testUserId,
        tokenHash: hashToken(absoluteExpiredToken),
        expiresAt: new Date(Date.now() - 1000), // expired 1s ago
        lastActiveAt: new Date(),
      },
    });

    const expiredAbsolute = await validateSessionToken(absoluteExpiredToken);
    expect(expiredAbsolute).toBeNull();
  });

  it("logs out of all devices by revoking all user sessions", async () => {
    // Create 3 sessions
    for (let i = 0; i < 3; i++) {
      await prisma.session.create({
        data: {
          userId: testUserId,
          tokenHash: hashToken(generateSecureToken(32)),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    }

    const countBefore = await prisma.session.count({ where: { userId: testUserId } });
    expect(countBefore).toBeGreaterThanOrEqual(3);

    // Terminate all sessions
    await terminateAllUserSessions(testUserId);

    const countAfter = await prisma.session.count({ where: { userId: testUserId } });
    expect(countAfter).toBe(0);
  });

  it("middleware redirects unauthenticated access to /login and rejects /api/admin with 401", async () => {
    // 1. Web request to /dashboard without session cookie
    const dashboardReq = new NextRequest("http://localhost:3000/dashboard");
    const dashboardRes = middleware(dashboardReq);
    expect(dashboardRes.status).toBe(307); // Temporary redirect
    expect(dashboardRes.headers.get("location")).toBe("http://localhost:3000/login");

    // 2. Web request to deep route /dashboard/settings
    const deepReq = new NextRequest("http://localhost:3000/dashboard/settings");
    const deepRes = middleware(deepReq);
    expect(deepRes.status).toBe(307);
    expect(deepRes.headers.get("location")).toContain("/login?redirect=%2Fdashboard%2Fsettings");

    // 3. API request to /api/admin/services without cookie
    const apiReq = new NextRequest("http://localhost:3000/api/admin/services");
    const apiRes = middleware(apiReq);
    expect(apiRes.status).toBe(401);
    const json = await apiRes.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");

    // 4. Request with valid cookie passes middleware
    const authedReq = new NextRequest("http://localhost:3000/dashboard", {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=valid_dummy_token`,
      },
    });
    const authedRes = middleware(authedReq);
    // Passing next() produces default 200 or next response
    expect(authedRes.status).toBe(200);

    // 5. Dashboard subdomain routing tests
    // 5a. Unauthenticated visiting root on dashboard subdomain redirects to /login
    const subRootUnauthed = new NextRequest("https://dashboard.beccascrownbeauty.com/");
    const subRootUnauthedRes = middleware(subRootUnauthed);
    expect(subRootUnauthedRes.status).toBe(307);
    expect(subRootUnauthedRes.headers.get("location")).toBe("https://dashboard.beccascrownbeauty.com/login");

    // 5b. Authenticated visiting root on dashboard subdomain redirects to /dashboard
    const subRootAuthed = new NextRequest("https://dashboard.beccascrownbeauty.com/", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=valid_dummy_token` },
    });
    const subRootAuthedRes = middleware(subRootAuthed);
    expect(subRootAuthedRes.status).toBe(307);
    expect(subRootAuthedRes.headers.get("location")).toBe("https://dashboard.beccascrownbeauty.com/dashboard");

    // 5c. Authenticated visiting /login on dashboard subdomain redirects to /dashboard
    const subLoginAuthed = new NextRequest("https://dashboard.beccascrownbeauty.com/login", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=valid_dummy_token` },
    });
    const subLoginAuthedRes = middleware(subLoginAuthed);
    expect(subLoginAuthedRes.status).toBe(307);
    expect(subLoginAuthedRes.headers.get("location")).toBe("https://dashboard.beccascrownbeauty.com/dashboard");

    // 5d. Unauthenticated visiting /login on dashboard subdomain passes through
    const subLoginUnauthed = new NextRequest("https://dashboard.beccascrownbeauty.com/login");
    const subLoginUnauthedRes = middleware(subLoginUnauthed);
    expect(subLoginUnauthedRes.status).toBe(200);
  });
});
