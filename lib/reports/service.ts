/**
 * Reports and Analytics Service.
 * Provides financial reconciliation, booking metrics, staff utilisation,
 * commissions, and comparative period analysis.
 *
 * Strict Rule: Report totals MUST reconcile exactly with the payments ledger.
 * Net Revenue = Gross Payments (PAID, PARTIALLY_REFUNDED, REFUNDED) - Completed Refunds.
 */

import { prisma } from "@/lib/db";
import { PaymentStatus, BookingStatus } from "@prisma/client";
import {
  ComprehensiveReport,
  PeriodReportData,
  PeriodSummary,
  ReportPeriodInput,
  RevenueByPeriodItem,
  RevenueByServiceItem,
  RevenueByStaffItem,
  RevenueByPaymentMethodItem,
  BookingsMetrics,
  StaffUtilisationItem,
  TopCustomerItem,
  TopServiceItem,
  StaffCommissionReport,
  StaffCommissionItem,
  PeriodDeltas,
} from "./types";

const TIMEZONE = "Africa/Accra";

/**
 * Normalizes start and end dates to encompass full days in UTC (which matches Africa/Accra UTC+0).
 */
export function normalizeDateRange(startDateInput: Date | string, endDateInput: Date | string): { startDate: Date; endDate: Date } {
  const start = new Date(startDateInput);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(endDateInput);
  end.setUTCHours(23, 59, 59, 999);

  return { startDate: start, endDate: end };
}

/**
 * Calculates start and end dates for the immediately preceding period of identical duration.
 */
export function getPreviousPeriodDates(startDate: Date, endDate: Date): { prevStart: Date; prevEnd: Date } {
  const durationMs = endDate.getTime() - startDate.getTime();
  const prevEnd = new Date(startDate.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  return { prevStart, prevEnd };
}

/**
 * Formats a Date to YYYY-MM-DD
 */
function toDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Formats a Date to ISO week string: YYYY-Www
 */
function toWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * Formats a Date to YYYY-MM
 */
function toMonthKey(date: Date): string {
  return date.toISOString().substring(0, 7);
}

/**
 * Generates single-period report data from the ledger and operational tables.
 */
async function generatePeriodReportData(startDate: Date, endDate: Date): Promise<PeriodReportData> {
  // 1. Fetch successful payments in range
  const payments = await prisma.payment.findMany({
    where: {
      OR: [
        { paidAt: { gte: startDate, lte: endDate } },
        { paidAt: null, createdAt: { gte: startDate, lte: endDate } },
      ],
      status: { in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED] },
    },
    include: {
      refunds: true,
      booking: {
        include: {
          items: {
            include: {
              service: {
                include: { category: true },
              },
            },
          },
          staff: true,
          customer: true,
        },
      },
      receipt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // 2. Fetch completed refunds in range
  const refunds = await prisma.refund.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: "COMPLETED",
    },
    include: {
      payment: {
        include: {
          booking: {
            include: {
              items: {
                include: {
                  service: {
                    include: { category: true },
                  },
                },
              },
              staff: true,
              customer: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // 3. Gross revenue & refunds from ledger
  const grossRevenuePesewas = payments.reduce((sum, p) => sum + p.amountPesewas, 0);
  const refundsPesewas = refunds.reduce((sum, r) => sum + r.amountPesewas, 0);
  const netRevenuePesewas = grossRevenuePesewas - refundsPesewas;

  // 4. Fetch Bookings in date range
  const bookings = await prisma.booking.findMany({
    where: {
      startUtc: { gte: startDate, lte: endDate },
      deletedAt: null,
    },
    include: {
      items: {
        include: {
          service: {
            include: { category: true },
          },
        },
      },
      staff: true,
      customer: true,
      payments: {
        where: {
          status: { in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED] },
        },
        include: {
          refunds: {
            where: { status: "COMPLETED" },
          },
        },
      },
    },
    orderBy: { startUtc: "asc" },
  });

  // 5. Booking counts & rates
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter((b) => b.status === BookingStatus.COMPLETED).length;
  const cancelledBookings = bookings.filter((b) => b.status === BookingStatus.CANCELLED).length;
  const noShowBookings = bookings.filter((b) => b.status === BookingStatus.NO_SHOW).length;

  const cancellationRate = totalBookings > 0 ? Number(((cancelledBookings / totalBookings) * 100).toFixed(1)) : 0;
  const noShowRate = totalBookings > 0 ? Number(((noShowBookings / totalBookings) * 100).toFixed(1)) : 0;
  const averageOrderValuePesewas =
    totalBookings > 0 ? Math.round(netRevenuePesewas / totalBookings) : 0;

  // Bookings by Source
  const sourceCounts: Record<string, number> = {};
  for (const b of bookings) {
    sourceCounts[b.source] = (sourceCounts[b.source] || 0) + 1;
  }
  const bySource = Object.entries(sourceCounts).map(([source, count]) => ({
    source,
    displayName: source === "WEB" ? "Online Booking" : source === "POS" ? "Point of Sale (POS)" : source,
    count,
    percentage: totalBookings > 0 ? Number(((count / totalBookings) * 100).toFixed(1)) : 0,
  }));

  // Bookings by Status
  const statusCounts: Record<string, number> = {};
  for (const b of bookings) {
    statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
  }
  const byStatus = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    displayName: status.replace(/_/g, " "),
    count,
    percentage: totalBookings > 0 ? Number(((count / totalBookings) * 100).toFixed(1)) : 0,
  }));

  const bookingsMetrics: BookingsMetrics = {
    totalBookings,
    completedBookings,
    cancelledBookings,
    noShowBookings,
    cancellationRate,
    noShowRate,
    bySource,
    byStatus,
  };

  // 6. Revenue Aggregations over Time (Day, Week, Month)
  // Ensure every day in the range is represented
  const dayMap = new Map<string, { gross: number; refunds: number; count: number }>();
  const curr = new Date(startDate);
  while (curr <= endDate) {
    dayMap.set(toDateKey(curr), { gross: 0, refunds: 0, count: 0 });
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  const weekMap = new Map<string, { gross: number; refunds: number; count: number }>();
  const monthMap = new Map<string, { gross: number; refunds: number; count: number }>();

  // Add payments to time buckets
  for (const p of payments) {
    const pDate = p.paidAt || p.createdAt;
    const dKey = toDateKey(pDate);
    const wKey = toWeekKey(pDate);
    const mKey = toMonthKey(pDate);

    if (dayMap.has(dKey)) {
      const entry = dayMap.get(dKey)!;
      entry.gross += p.amountPesewas;
      entry.count += 1;
    } else {
      dayMap.set(dKey, { gross: p.amountPesewas, refunds: 0, count: 1 });
    }

    const wEntry = weekMap.get(wKey) || { gross: 0, refunds: 0, count: 0 };
    wEntry.gross += p.amountPesewas;
    wEntry.count += 1;
    weekMap.set(wKey, wEntry);

    const mEntry = monthMap.get(mKey) || { gross: 0, refunds: 0, count: 0 };
    mEntry.gross += p.amountPesewas;
    mEntry.count += 1;
    monthMap.set(mKey, mEntry);
  }

  // Deduct refunds in their refund date buckets
  for (const r of refunds) {
    const rDate = r.createdAt;
    const dKey = toDateKey(rDate);
    const wKey = toWeekKey(rDate);
    const mKey = toMonthKey(rDate);

    if (dayMap.has(dKey)) {
      dayMap.get(dKey)!.refunds += r.amountPesewas;
    } else {
      dayMap.set(dKey, { gross: 0, refunds: r.amountPesewas, count: 0 });
    }

    const wEntry = weekMap.get(wKey) || { gross: 0, refunds: 0, count: 0 };
    wEntry.refunds += r.amountPesewas;
    weekMap.set(wKey, wEntry);

    const mEntry = monthMap.get(mKey) || { gross: 0, refunds: 0, count: 0 };
    mEntry.refunds += r.amountPesewas;
    monthMap.set(mKey, mEntry);
  }

  const revenueByDay: RevenueByPeriodItem[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, data]) => {
      const d = new Date(`${key}T00:00:00Z`);
      const label = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
      return {
        key,
        label,
        grossPesewas: data.gross,
        refundsPesewas: data.refunds,
        netPesewas: data.gross - data.refunds,
        count: data.count,
      };
    });

  const revenueByWeek: RevenueByPeriodItem[] = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, data]) => ({
      key,
      label: key.replace("-", " "),
      grossPesewas: data.gross,
      refundsPesewas: data.refunds,
      netPesewas: data.gross - data.refunds,
      count: data.count,
    }));

  const revenueByMonth: RevenueByPeriodItem[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, data]) => {
      const [year, month] = key.split("-");
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      const label = d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
      return {
        key,
        label,
        grossPesewas: data.gross,
        refundsPesewas: data.refunds,
        netPesewas: data.gross - data.refunds,
        count: data.count,
      };
    });

  // 7. Revenue by Payment Method
  const paymentChannelMap = new Map<string, { gross: number; refunds: number; count: number }>();
  for (const p of payments) {
    const channel = p.channel || "UNKNOWN";
    const entry = paymentChannelMap.get(channel) || { gross: 0, refunds: 0, count: 0 };
    entry.gross += p.amountPesewas;
    entry.count += 1;
    paymentChannelMap.set(channel, entry);
  }
  for (const r of refunds) {
    const channel = r.payment?.channel || "UNKNOWN";
    const entry = paymentChannelMap.get(channel) || { gross: 0, refunds: 0, count: 0 };
    entry.refunds += r.amountPesewas;
    paymentChannelMap.set(channel, entry);
  }

  const channelDisplayNames: Record<string, string> = {
    CARD: "Credit / Debit Card",
    MOBILE_MONEY: "Mobile Money (MTN / Telecel / AT)",
    CASH: "Cash (POS)",
    BANK_TRANSFER: "Bank Transfer",
  };

  const revenueByPaymentMethod: RevenueByPaymentMethodItem[] = Array.from(paymentChannelMap.entries())
    .map(([channel, data]) => ({
      channel,
      displayName: channelDisplayNames[channel] || channel.replace(/_/g, " "),
      grossPesewas: data.gross,
      refundsPesewas: data.refunds,
      netPesewas: data.gross - data.refunds,
      transactionCount: data.count,
    }))
    .sort((a, b) => b.netPesewas - a.netPesewas);

  // 8. Revenue by Service & Top Services
  const serviceStatsMap = new Map<
    string,
    {
      serviceName: string;
      categoryName: string;
      gross: number;
      refunds: number;
      bookingCount: number;
    }
  >();

  // Prorate payment revenue to services based on booking items
  for (const p of payments) {
    if (!p.booking || !p.booking.items || p.booking.items.length === 0) continue;
    const items = p.booking.items;
    const itemsTotal = items.reduce((sum, item) => sum + item.pricePesewas, 0) || p.amountPesewas;

    for (const item of items) {
      const share = item.pricePesewas / itemsTotal;
      const attributedGross = Math.round(p.amountPesewas * share);

      const entry = serviceStatsMap.get(item.serviceId) || {
        serviceName: item.service.name,
        categoryName: item.service.category?.name || "Uncategorized",
        gross: 0,
        refunds: 0,
        bookingCount: 0,
      };
      entry.gross += attributedGross;
      serviceStatsMap.set(item.serviceId, entry);
    }
  }

  for (const r of refunds) {
    if (!r.payment?.booking?.items || r.payment.booking.items.length === 0) continue;
    const items = r.payment.booking.items;
    const itemsTotal = items.reduce((sum, item) => sum + item.pricePesewas, 0) || r.amountPesewas;

    for (const item of items) {
      const share = item.pricePesewas / itemsTotal;
      const attributedRefund = Math.round(r.amountPesewas * share);

      const entry = serviceStatsMap.get(item.serviceId);
      if (entry) {
        entry.refunds += attributedRefund;
      }
    }
  }

  // Count booking occurrences for services
  for (const b of bookings) {
    for (const item of b.items) {
      const entry = serviceStatsMap.get(item.serviceId);
      if (entry) {
        entry.bookingCount += 1;
      } else {
        serviceStatsMap.set(item.serviceId, {
          serviceName: item.service.name,
          categoryName: item.service.category?.name || "Uncategorized",
          gross: 0,
          refunds: 0,
          bookingCount: 1,
        });
      }
    }
  }

  const revenueByService: RevenueByServiceItem[] = Array.from(serviceStatsMap.entries())
    .map(([serviceId, s]) => ({
      serviceId,
      serviceName: s.serviceName,
      categoryName: s.categoryName,
      grossPesewas: s.gross,
      refundsPesewas: s.refunds,
      netPesewas: s.gross - s.refunds,
      bookingCount: s.bookingCount,
    }))
    .sort((a, b) => b.netPesewas - a.netPesewas);

  const topServices: TopServiceItem[] = revenueByService.slice(0, 5).map((s) => ({
    serviceId: s.serviceId,
    name: s.serviceName,
    category: s.categoryName,
    bookingCount: s.bookingCount,
    revenuePesewas: s.netPesewas,
  }));

  // 9. Revenue by Staff & Staff Utilisation
  const staffStatsMap = new Map<
    string,
    {
      name: string;
      gross: number;
      refunds: number;
      appointmentCount: number;
      completedRevenue: number;
    }
  >();

  for (const p of payments) {
    if (!p.booking?.staffId) continue;
    const sId = p.booking.staffId;
    const sName = p.booking.staff.name;

    const entry = staffStatsMap.get(sId) || {
      name: sName,
      gross: 0,
      refunds: 0,
      appointmentCount: 0,
      completedRevenue: 0,
    };
    entry.gross += p.amountPesewas;
    staffStatsMap.set(sId, entry);
  }

  for (const r of refunds) {
    if (!r.payment?.booking?.staffId) continue;
    const sId = r.payment.booking.staffId;
    const entry = staffStatsMap.get(sId);
    if (entry) {
      entry.refunds += r.amountPesewas;
    }
  }

  for (const b of bookings) {
    if (!b.staffId) continue;
    const entry = staffStatsMap.get(b.staffId) || {
      name: b.staff.name,
      gross: 0,
      refunds: 0,
      appointmentCount: 0,
      completedRevenue: 0,
    };
    entry.appointmentCount += 1;
    if (b.status === BookingStatus.COMPLETED) {
      entry.completedRevenue += b.totalPesewas;
    }
    staffStatsMap.set(b.staffId, entry);
  }

  const revenueByStaff: RevenueByStaffItem[] = Array.from(staffStatsMap.entries())
    .map(([staffId, s]) => ({
      staffId,
      staffName: s.name,
      grossPesewas: s.gross,
      refundsPesewas: s.refunds,
      netPesewas: s.gross - s.refunds,
      appointmentCount: s.appointmentCount,
    }))
    .sort((a, b) => b.netPesewas - a.netPesewas);

  // Staff Utilisation (booked minutes vs scheduled minutes)
  const activeStaff = await prisma.staff.findMany({
    where: { active: true, deletedAt: null },
    include: {
      schedules: {
        where: { active: true, isDayOff: false },
      },
      timeOffs: {
        where: {
          approved: true,
          startUtc: { lte: endDate },
          endUtc: { gte: startDate },
        },
      },
    },
  });

  const staffUtilisation: StaffUtilisationItem[] = activeStaff.map((st) => {
    // Booked minutes: sum of durations of non-cancelled bookings in the period
    const staffBookings = bookings.filter(
      (b) => b.staffId === st.id && b.status !== BookingStatus.CANCELLED
    );
    const bookedMinutes = staffBookings.reduce((sum, b) => {
      const dur = Math.max(0, Math.round((b.endUtc.getTime() - b.startUtc.getTime()) / 60000));
      return sum + dur;
    }, 0);

    // Available minutes: calculate scheduled shift minutes across days in range
    let availableMinutes = 0;
    const dayCursor = new Date(startDate);
    while (dayCursor <= endDate) {
      const weekday = dayCursor.getUTCDay();
      const shiftsForDay = st.schedules.filter((s) => s.weekday === weekday);

      if (shiftsForDay.length > 0) {
        for (const shift of shiftsForDay) {
          const [sH, sM] = shift.startTime.split(":").map(Number);
          const [eH, eM] = shift.endTime.split(":").map(Number);
          let shiftDuration = eH * 60 + eM - (sH * 60 + sM);

          if (shift.breakStart && shift.breakEnd) {
            const [bSh, bSm] = shift.breakStart.split(":").map(Number);
            const [bEh, bEm] = shift.breakEnd.split(":").map(Number);
            const breakDur = bEh * 60 + bEm - (bSh * 60 + bSm);
            if (breakDur > 0) shiftDuration -= breakDur;
          }
          availableMinutes += Math.max(0, shiftDuration);
        }
      } else {
        // Standard studio operating hours fallback: 9am - 6pm (9h = 540m) on weekdays/Saturdays
        if (weekday >= 1 && weekday <= 6) {
          availableMinutes += 540;
        }
      }
      dayCursor.setUTCDate(dayCursor.getUTCDate() + 1);
    }

    // Deduct approved time off minutes falling within the range
    for (const to of st.timeOffs) {
      const overlapStart = Math.max(to.startUtc.getTime(), startDate.getTime());
      const overlapEnd = Math.min(to.endUtc.getTime(), endDate.getTime());
      if (overlapEnd > overlapStart) {
        const toMinutes = Math.round((overlapEnd - overlapStart) / 60000);
        availableMinutes = Math.max(0, availableMinutes - toMinutes);
      }
    }

    // Default safety to prevent divide by zero
    if (availableMinutes <= 0) availableMinutes = 480; // 8 hours minimum baseline

    const utilisationRate = Math.min(100, Math.round((bookedMinutes / availableMinutes) * 100));

    return {
      staffId: st.id,
      staffName: st.name,
      bookedMinutes,
      availableMinutes,
      utilisationRate,
      appointmentCount: staffBookings.length,
    };
  });

  // 10. Top Customers
  const customerMap = new Map<
    string,
    {
      name: string;
      phone: string;
      visitCount: number;
      netSpendPesewas: number;
    }
  >();

  for (const b of bookings) {
    if (!b.customerId || !b.customer) continue;
    const entry = customerMap.get(b.customerId) || {
      name: b.customer.name,
      phone: b.customer.phone,
      visitCount: 0,
      netSpendPesewas: 0,
    };
    if (b.status === BookingStatus.COMPLETED || b.status === BookingStatus.CONFIRMED) {
      entry.visitCount += 1;
    }
    customerMap.set(b.customerId, entry);
  }

  for (const p of payments) {
    if (!p.booking?.customerId) continue;
    const entry = customerMap.get(p.booking.customerId);
    if (entry) {
      entry.netSpendPesewas += p.amountPesewas;
    }
  }

  for (const r of refunds) {
    if (!r.payment?.booking?.customerId) continue;
    const entry = customerMap.get(r.payment.booking.customerId);
    if (entry) {
      entry.netSpendPesewas -= r.amountPesewas;
    }
  }

  const topCustomers: TopCustomerItem[] = Array.from(customerMap.entries())
    .map(([customerId, c]) => ({
      customerId,
      name: c.name,
      phone: c.phone,
      visitCount: c.visitCount,
      netSpendPesewas: Math.max(0, c.netSpendPesewas),
    }))
    .sort((a, b) => b.netSpendPesewas - a.netSpendPesewas)
    .slice(0, 5);

  // 11. Staff Commissions
  const commissionEnabledSetting = await prisma.setting.findUnique({
    where: { key: "enable_staff_commissions" },
  });
  const commissionRateSetting = await prisma.setting.findUnique({
    where: { key: "staff_commission_percentage" },
  });

  const commissionsEnabled = commissionEnabledSetting?.value === "true";
  const defaultCommissionRate = commissionRateSetting?.value ? parseFloat(commissionRateSetting.value) : 10;

  const commissionItems: StaffCommissionItem[] = Array.from(staffStatsMap.entries()).map(
    ([staffId, s]) => {
      const commissionPesewas = commissionsEnabled
        ? Math.round((s.completedRevenue * defaultCommissionRate) / 100)
        : 0;
      return {
        staffId,
        staffName: s.name,
        completedRevenuePesewas: s.completedRevenue,
        commissionRatePercent: defaultCommissionRate,
        commissionPesewas,
        appointmentCount: s.appointmentCount,
      };
    }
  );

  const totalCommissionPesewas = commissionItems.reduce((acc, item) => acc + item.commissionPesewas, 0);

  const staffCommissionReport: StaffCommissionReport = {
    enabled: commissionsEnabled,
    defaultCommissionRatePercent: defaultCommissionRate,
    totalCommissionPesewas,
    items: commissionItems,
  };

  const summary: PeriodSummary = {
    grossRevenuePesewas,
    refundsPesewas,
    netRevenuePesewas,
    totalBookings,
    averageOrderValuePesewas,
    cancellationRate,
    noShowRate,
  };

  return {
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    summary,
    revenueByDay,
    revenueByWeek,
    revenueByMonth,
    revenueByService,
    revenueByStaff,
    revenueByPaymentMethod,
    bookings: bookingsMetrics,
    staffUtilisation,
    topCustomers,
    topServices,
    commissions: staffCommissionReport,
  };
}

/**
 * Calculates comparative deltas between two periods.
 */
function calculateDeltas(current: PeriodSummary, previous: PeriodSummary): PeriodDeltas {
  const calcPct = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Number((((curr - prev) / prev) * 100).toFixed(1));
  };

  return {
    netRevenuePercent: calcPct(current.netRevenuePesewas, previous.netRevenuePesewas),
    grossRevenuePercent: calcPct(current.grossRevenuePesewas, previous.grossRevenuePesewas),
    bookingsPercent: calcPct(current.totalBookings, previous.totalBookings),
    aovPercent: calcPct(current.averageOrderValuePesewas, previous.averageOrderValuePesewas),
    cancellationRateDiff: Number((current.cancellationRate - previous.cancellationRate).toFixed(1)),
    noShowRateDiff: Number((current.noShowRate - previous.noShowRate).toFixed(1)),
  };
}

/**
 * Generates the full comprehensive report with optional previous period comparison.
 */
export async function generateComprehensiveReport(input: ReportPeriodInput): Promise<ComprehensiveReport> {
  const { startDate, endDate } = normalizeDateRange(input.startDate, input.endDate);
  const current = await generatePeriodReportData(startDate, endDate);

  let previousData: { period: { startDate: string; endDate: string }; summary: PeriodSummary } | undefined;
  let deltas: PeriodDeltas | undefined;

  if (input.compare) {
    const { prevStart, prevEnd } = getPreviousPeriodDates(startDate, endDate);
    const prevReport = await generatePeriodReportData(prevStart, prevEnd);
    previousData = {
      period: {
        startDate: prevStart.toISOString(),
        endDate: prevEnd.toISOString(),
      },
      summary: prevReport.summary,
    };
    deltas = calculateDeltas(current.summary, prevReport.summary);
  }

  return {
    generatedAt: new Date().toISOString(),
    timezone: TIMEZONE,
    current,
    previous: previousData,
    deltas,
  };
}
