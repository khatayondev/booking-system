import { describe, it, expect } from "vitest";
import {
  formatPesewas,
  pesewasToGhs,
  ghsToPesewas,
  sumPesewas,
  calculateDeposit,
} from "../lib/money";
import {
  formatDate,
  formatTime,
  formatDateTime,
  formatTimeRange,
  parseAccraDateTimeToUtc,
  isOverlapping,
  addMinutes,
} from "../lib/date";
import { normalizeGhanaPhone } from "../lib/sms";
import { hasPermission, ROLES, PERMISSIONS } from "../lib/rbac";

describe("Money Helper", () => {
  it("formats integer pesewas into GH₵ strings correctly", () => {
    expect(formatPesewas(15000)).toBe("GH₵ 150.00");
    expect(formatPesewas(0)).toBe("GH₵ 0.00");
    expect(formatPesewas(4550)).toBe("GH₵ 45.50");
    expect(formatPesewas(125000, { includeSymbol: false })).toBe("1,250.00");
  });

  it("converts between pesewas and GHS", () => {
    expect(pesewasToGhs(35000)).toBe(350);
    expect(ghsToPesewas(350.5)).toBe(35050);
    expect(ghsToPesewas(0.01)).toBe(1);
  });

  it("safely adds pesewas amounts", () => {
    expect(sumPesewas(1000, 2500, 3500)).toBe(7000);
    expect(() => sumPesewas(10.5 as unknown as number)).toThrow();
  });

  it("calculates deposits according to policy", () => {
    // 50% deposit on GH₵ 500
    expect(calculateDeposit(50000, "PERCENTAGE", 50)).toBe(25000);
    // Full deposit
    expect(calculateDeposit(45000, "FULL")).toBe(45000);
    // Fixed GH₵ 100 deposit
    expect(calculateDeposit(35000, "FIXED", 10000)).toBe(10000);
    // None
    expect(calculateDeposit(20000, "NONE")).toBe(0);
  });
});

describe("Date Helper (UTC storage & Africa/Accra display)", () => {
  it("parses Accra local date/time into UTC Date", () => {
    const utcDate = parseAccraDateTimeToUtc("2026-10-24", "10:30");
    expect(utcDate.toISOString()).toBe("2026-10-24T10:30:00.000Z");
  });

  it("formats time and date in Africa/Accra timezone", () => {
    const testDate = new Date("2026-10-24T14:15:00.000Z");
    const formatted = formatTime(testDate);
    expect(formatted).toMatch(/2:15\s*pm/i);

    const formattedDate = formatDate(testDate);
    expect(formattedDate).toContain("2026");

    const formattedDateTime = formatDateTime(testDate);
    expect(formattedDateTime).toContain("2026");
    expect(formattedDateTime).toMatch(/2:15\s*pm/i);

    const range = formatTimeRange(
      new Date("2026-10-24T10:00:00.000Z"),
      new Date("2026-10-24T11:30:00.000Z")
    );
    expect(range).toMatch(/10:00\s*am\s*–\s*11:30\s*am/i);
  });

  it("accurately detects time slot overlap", () => {
    const aStart = new Date("2026-10-24T10:00:00.000Z");
    const aEnd = new Date("2026-10-24T11:00:00.000Z");

    const bOverlap = {
      start: new Date("2026-10-24T10:30:00.000Z"),
      end: new Date("2026-10-24T11:30:00.000Z"),
    };

    const cNoOverlap = {
      start: new Date("2026-10-24T11:00:00.000Z"),
      end: new Date("2026-10-24T12:00:00.000Z"),
    };

    expect(isOverlapping(aStart, aEnd, bOverlap.start, bOverlap.end)).toBe(true);
    expect(isOverlapping(aStart, aEnd, cNoOverlap.start, cNoOverlap.end)).toBe(false);
  });

  it("adds minutes correctly", () => {
    const start = new Date("2026-10-24T10:00:00.000Z");
    const end = addMinutes(start, 75);
    expect(end.toISOString()).toBe("2026-10-24T11:15:00.000Z");
  });
});

describe("Phone Normalization (+233 Ghana format)", () => {
  it("normalizes standard local 10-digit 024 format to +233", () => {
    expect(normalizeGhanaPhone("0241234567")).toBe("+233241234567");
    expect(normalizeGhanaPhone("0509876543")).toBe("+233509876543");
  });

  it("preserves or cleans numbers that already include 233", () => {
    expect(normalizeGhanaPhone("+233 24 123 4567")).toBe("+233241234567");
    expect(normalizeGhanaPhone("233241234567")).toBe("+233241234567");
  });

  it("throws on invalid phone numbers", () => {
    expect(() => normalizeGhanaPhone("123")).toThrow();
  });
});

describe("RBAC Permissions", () => {
  it("verifies permissions by role", () => {
    expect(hasPermission(ROLES.OWNER_ADMIN, PERMISSIONS.AUDIT_LOG_READ)).toBe(true);
    expect(hasPermission(ROLES.MANAGER, PERMISSIONS.POS_ACCESS)).toBe(true);
    expect(hasPermission(ROLES.STAFF_RECEPTIONIST, PERMISSIONS.AUDIT_LOG_READ)).toBe(false);
  });
});
