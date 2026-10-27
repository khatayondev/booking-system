"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, BarChart, DonutRing, ChartDataPoint, BarChartItem, DonutSegment } from "@/components/ui/charts";
import { ComprehensiveReport } from "@/lib/reports/types";
import {
  Calendar,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  Info,
  RefreshCw,
} from "lucide-react";

type PresetRange = "today" | "7d" | "30d" | "this_month" | "last_month" | "custom";

function formatGhs(pesewas: number): string {
  return `GH₵ ${(pesewas / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ReportsPage() {
  return (
    <React.Suspense fallback={<ReportsLoadingSkeleton />}>
      <ReportsContent />
    </React.Suspense>
  );
}

function ReportsLoadingSkeleton() {
  return (
    <AppShell activePath="/reports">
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-10 bg-black/5 rounded-2xl w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-black/5 rounded-3xl" />
          ))}
        </div>
        <div className="h-80 bg-black/5 rounded-3xl" />
      </div>
    </AppShell>
  );
}

function ReportsContent() {
  // Date range state
  const [preset, setPreset] = React.useState<PresetRange>("30d");
  const [startDateStr, setStartDateStr] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDateStr, setEndDateStr] = React.useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [comparePrevious, setComparePrevious] = React.useState<boolean>(true);
  const [refreshToken, setRefreshToken] = React.useState(0);

  // Data state
  const [report, setReport] = React.useState<ComprehensiveReport | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [viewTab, setViewTab] = React.useState<"overview" | "services" | "staff" | "payments">("overview");

  // Active tooltip state
  const [activeTooltip, setActiveTooltip] = React.useState<string | null>(null);

  // Load report data
  React.useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const res = await fetch(
          `/api/admin/reports?startDate=${encodeURIComponent(startDateStr)}&endDate=${encodeURIComponent(endDateStr)}&compare=${comparePrevious}`
        );
        if (!ignore) {
          if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            setError(json.message || `Failed to fetch report (${res.status})`);
          } else {
            const json = await res.json();
            setReport(json.data);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load report data");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [startDateStr, endDateStr, comparePrevious, refreshToken]);

  // Handle Preset Selection
  const handlePresetChange = (newPreset: PresetRange) => {
    setLoading(true);
    setPreset(newPreset);
    const now = new Date();
    let s = new Date();
    let e = new Date();

    if (newPreset === "today") {
      s = now;
      e = now;
    } else if (newPreset === "7d") {
      s = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      e = now;
    } else if (newPreset === "30d") {
      s = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      e = now;
    } else if (newPreset === "this_month") {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
      e = now;
    } else if (newPreset === "last_month") {
      s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      e = new Date(now.getFullYear(), now.getMonth(), 0);
    } else {
      return;
    }

    const sStr = s.toISOString().split("T")[0];
    const eStr = e.toISOString().split("T")[0];
    setStartDateStr(sStr);
    setEndDateStr(eStr);
    setRefreshToken((t) => t + 1);
  };

  const handleRefresh = () => {
    setLoading(true);
    setRefreshToken((t) => t + 1);
  };

  // CSV Export handler
  const handleExportCsv = () => {
    const url = `/api/admin/reports/export?startDate=${encodeURIComponent(startDateStr)}&endDate=${encodeURIComponent(endDateStr)}`;
    window.open(url, "_blank");
  };

  // PDF Print handler
  const handlePrint = () => {
    window.print();
  };

  // Line chart data points
  const lineChartData: ChartDataPoint[] = report?.current.revenueByDay.map((d, idx) => ({
    day: d.label,
    current: Math.round(d.netPesewas / 100),
    previous: report.previous?.summary
      ? Math.round(report.previous.summary.netRevenuePesewas / (100 * (report.current.revenueByDay.length || 1)))
      : 0,
    isActive: idx === report.current.revenueByDay.length - 1,
  })) || [];

  // Service bar chart
  const serviceBarData: BarChartItem[] = report?.current.revenueByService.slice(0, 6).map((s) => ({
    label: s.serviceName.length > 15 ? `${s.serviceName.substring(0, 13)}…` : s.serviceName,
    value: Math.round(s.netPesewas / 100),
    secondaryValue: Math.round(s.refundsPesewas / 100),
  })) || [];

  // Payment method donut data
  const paymentDonutData: DonutSegment[] = report?.current.revenueByPaymentMethod.map((pm, idx) => ({
    label: pm.displayName,
    value: Math.max(0, Math.round(pm.netPesewas / 100)),
    color: ["#1E1E1E", "#52525B", "#71717A", "#A1A1AA", "#D4D4D8"][idx % 5],
  })) || [];

  const summary = report?.current?.summary;
  const deltas = report?.deltas;

  return (
    <AppShell activePath="/reports">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        {/* Top Header & Date Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/10">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1E1E1E]">
                Business Reports & Insight
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1E1E1E] text-white uppercase tracking-wider">
                Audited
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#71717A] mt-1">
              Reconciled financials, customer trends, staff utilisation and immutable performance ledger.
            </p>
          </div>

          {/* Action buttons (Print & CSV export) */}
          <div className="flex items-center gap-2">
            <Button
              variant="outlinePill"
              size="sm"
              onClick={handlePrint}
              className="rounded-full text-xs flex items-center gap-1.5 border-[#E4E4E7] text-[#1E1E1E] hover:bg-[#F4F4F6]"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </Button>
            <Button
              variant="blackPill"
              size="sm"
              onClick={handleExportCsv}
              className="rounded-full text-xs flex items-center gap-1.5 bg-[#1E1E1E] text-white hover:bg-black shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>

        {/* Filter Controls: Date Range & Comparison */}
        <Card className="p-4 rounded-3xl bg-white border border-[#E4E4E7] shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5 bg-[#F4F4F6] p-1 rounded-2xl">
              {(
                [
                  { id: "today", label: "Today" },
                  { id: "7d", label: "Last 7 Days" },
                  { id: "30d", label: "Last 30 Days" },
                  { id: "this_month", label: "This Month" },
                  { id: "last_month", label: "Last Month" },
                  { id: "custom", label: "Custom" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePresetChange(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    preset === p.id
                      ? "bg-[#1E1E1E] text-white shadow-xs"
                      : "text-[#71717A] hover:text-[#1E1E1E]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#F4F4F6] px-3 py-1.5 rounded-2xl border border-[#E4E4E7] text-xs">
                <Calendar className="w-3.5 h-3.5 text-[#71717A]" />
                <input
                  type="date"
                  value={startDateStr}
                  onChange={(e) => {
                    setPreset("custom");
                    setStartDateStr(e.target.value);
                  }}
                  className="bg-transparent text-[#1E1E1E] font-medium outline-hidden"
                />
                <span className="text-[#A1A1AA]">—</span>
                <input
                  type="date"
                  value={endDateStr}
                  onChange={(e) => {
                    setPreset("custom");
                    setEndDateStr(e.target.value);
                  }}
                  className="bg-transparent text-[#1E1E1E] font-medium outline-hidden"
                />
              </div>

              {/* Compare Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#71717A] hover:text-[#1E1E1E] px-2">
                <input
                  type="checkbox"
                  checked={comparePrevious}
                  onChange={(e) => setComparePrevious(e.target.checked)}
                  className="rounded-sm border-[#D4D4D8] text-[#1E1E1E] focus:ring-black"
                />
                <span>Compare previous period</span>
              </label>

              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 rounded-2xl border border-[#E4E4E7] hover:bg-[#F4F4F6] text-[#71717A] transition-colors"
                title="Refresh report"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </Card>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {error}
          </div>
        )}

        {/* Financial KPI Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Net Revenue (Highlighted Luxury Monochrome) */}
            <Card className="p-5 rounded-3xl bg-[#1E1E1E] text-white shadow-md relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-medium text-white/70">
                <span className="flex items-center gap-1.5">
                  <span>Net Revenue</span>
                  <button
                    onClick={() => setActiveTooltip(activeTooltip === "net" ? null : "net")}
                    className="hover:text-white"
                  >
                    <Info className="w-3 h-3 opacity-60 hover:opacity-100" />
                  </button>
                </span>
                {deltas && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                      deltas.netRevenuePercent >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                    }`}
                  >
                    {deltas.netRevenuePercent >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    {Math.abs(deltas.netRevenuePercent)}%
                  </span>
                )}
              </div>

              {activeTooltip === "net" && (
                <div className="mt-2 p-2 rounded-xl bg-white/10 text-[10px] text-white/90 leading-tight">
                  Gross payments (Card, Mobile Money, Cash) minus all completed refunds. Fully reconciled with payments ledger.
                </div>
              )}

              <div className="my-3">
                <p className="text-3xl lg:text-4xl font-extrabold tracking-tight">
                  {formatGhs(summary.netRevenuePesewas)}
                </p>
                <p className="text-[11px] text-white/60 mt-1">
                  Gross: {formatGhs(summary.grossRevenuePesewas)} • Refunds: {formatGhs(summary.refundsPesewas)}
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/60">
                <span>Avg Order Value (AOV)</span>
                <span className="font-semibold text-white">{formatGhs(summary.averageOrderValuePesewas)}</span>
              </div>
            </Card>

            {/* Card 2: Bookings Volume */}
            <Card className="p-5 rounded-3xl bg-white border border-[#E4E4E7] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-medium text-[#71717A]">
                <span className="flex items-center gap-1.5">
                  <span>Total Bookings</span>
                  <button
                    onClick={() => setActiveTooltip(activeTooltip === "bookings" ? null : "bookings")}
                    className="hover:text-black"
                  >
                    <Info className="w-3 h-3 opacity-60 hover:opacity-100" />
                  </button>
                </span>
                {deltas && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                      deltas.bookingsPercent >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {deltas.bookingsPercent >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    {Math.abs(deltas.bookingsPercent)}%
                  </span>
                )}
              </div>

              {activeTooltip === "bookings" && (
                <div className="mt-2 p-2 rounded-xl bg-[#F4F4F6] text-[10px] text-[#71717A] leading-tight">
                  Total client appointments scheduled across web, POS, and walk-ins during this time range.
                </div>
              )}

              <div className="my-3">
                <p className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1E1E1E]">
                  {summary.totalBookings}
                </p>
                <p className="text-[11px] text-[#71717A] mt-1">
                  Completed: {report.current.bookings.completedBookings} bookings
                </p>
              </div>

              <div className="pt-3 border-t border-[#E4E4E7] flex items-center justify-between text-[11px] text-[#71717A]">
                <span>Online Web Bookings</span>
                <span className="font-semibold text-[#1E1E1E]">
                  {report.current.bookings.bySource.find((s) => s.source === "WEB")?.count || 0}
                </span>
              </div>
            </Card>

            {/* Card 3: Cancellation Rate */}
            <Card className="p-5 rounded-3xl bg-white border border-[#E4E4E7] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-medium text-[#71717A]">
                <span className="flex items-center gap-1.5">
                  <span>Cancellation Rate</span>
                  <button
                    onClick={() => setActiveTooltip(activeTooltip === "cancel" ? null : "cancel")}
                    className="hover:text-black"
                  >
                    <Info className="w-3 h-3 opacity-60 hover:opacity-100" />
                  </button>
                </span>
                {deltas && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      deltas.cancellationRateDiff <= 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {deltas.cancellationRateDiff <= 0 ? "↓ " : "↑ "}
                    {Math.abs(deltas.cancellationRateDiff)}% pts
                  </span>
                )}
              </div>

              {activeTooltip === "cancel" && (
                <div className="mt-2 p-2 rounded-xl bg-[#F4F4F6] text-[10px] text-[#71717A] leading-tight">
                  Cancelled bookings as a percentage of total appointments in this window. Target is below 10%.
                </div>
              )}

              <div className="my-3">
                <p className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1E1E1E]">
                  {summary.cancellationRate}%
                </p>
                <p className="text-[11px] text-[#71717A] mt-1">
                  {report.current.bookings.cancelledBookings} cancelled bookings
                </p>
              </div>

              <div className="pt-3 border-t border-[#E4E4E7] flex items-center justify-between text-[11px] text-[#71717A]">
                <span>Benchmark</span>
                <span className="font-semibold text-emerald-600">Optimal (&lt;10%)</span>
              </div>
            </Card>

            {/* Card 4: No-Show Rate */}
            <Card className="p-5 rounded-3xl bg-white border border-[#E4E4E7] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-medium text-[#71717A]">
                <span className="flex items-center gap-1.5">
                  <span>No-Show Rate</span>
                  <button
                    onClick={() => setActiveTooltip(activeTooltip === "noshow" ? null : "noshow")}
                    className="hover:text-black"
                  >
                    <Info className="w-3 h-3 opacity-60 hover:opacity-100" />
                  </button>
                </span>
                {deltas && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      deltas.noShowRateDiff <= 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {deltas.noShowRateDiff <= 0 ? "↓ " : "↑ "}
                    {Math.abs(deltas.noShowRateDiff)}% pts
                  </span>
                )}
              </div>

              {activeTooltip === "noshow" && (
                <div className="mt-2 p-2 rounded-xl bg-[#F4F4F6] text-[10px] text-[#71717A] leading-tight">
                  Bookings marked as no-show by receptionists. Mitigated by mandatory deposits and SMS reminders.
                </div>
              )}

              <div className="my-3">
                <p className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1E1E1E]">
                  {summary.noShowRate}%
                </p>
                <p className="text-[11px] text-[#71717A] mt-1">
                  {report.current.bookings.noShowBookings} no-show clients
                </p>
              </div>

              <div className="pt-3 border-t border-[#E4E4E7] flex items-center justify-between text-[11px] text-[#71717A]">
                <span>Mitigation</span>
                <span className="font-semibold text-[#1E1E1E]">Deposits Enforced</span>
              </div>
            </Card>
          </div>
        )}

        {/* View Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#E4E4E7] pb-2">
          {(
            [
              { id: "overview", label: "Executive Overview & Timeline" },
              { id: "services", label: "Services & Top Drivers" },
              { id: "staff", label: "Staff Performance & Utilisation" },
              { id: "payments", label: "Payment Channels & Ledger" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewTab(tab.id)}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all ${
                viewTab === tab.id
                  ? "bg-[#1E1E1E] text-white shadow-xs"
                  : "text-[#71717A] hover:text-[#1E1E1E] hover:bg-[#F4F4F6]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: EXECUTIVE OVERVIEW & TIMELINE */}
        {viewTab === "overview" && report && (
          <div className="space-y-8">
            {/* Main Net Revenue Over Time Chart */}
            <Card className="p-6 rounded-3xl bg-white border border-[#E4E4E7] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-[#1E1E1E]">Reconciled Net Revenue Over Time</h2>
                  <p className="text-xs text-[#71717A]">
                    Daily net revenue after refunds (solid black line) compared against previous period baseline (dashed grey).
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-[#1E1E1E]" />
                    <span className="text-[#1E1E1E]">Current Period</span>
                  </div>
                  {comparePrevious && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-[#D4D4D8] border-dashed border-b-2" />
                      <span className="text-[#71717A]">Previous Period</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Chart container */}
              <div className="pt-2">
                {lineChartData.length > 0 ? (
                  <LineChart data={lineChartData} height={260} />
                ) : (
                  <div className="h-48 flex items-center justify-center text-xs text-[#71717A]">
                    No revenue data recorded in this period.
                  </div>
                )}
              </div>
            </Card>

            {/* Two Column Grid: Top Services & Top Spenders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Services */}
              <Card className="p-6 rounded-3xl bg-white border border-[#E4E4E7] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1E1E1E]">Top Revenue Services</h3>
                  <span className="text-xs text-[#71717A]">By Net Pesewas</span>
                </div>
                <div className="divide-y divide-[#E4E4E7]">
                  {report.current.topServices.length === 0 ? (
                    <p className="py-6 text-center text-xs text-[#71717A]">No service bookings recorded.</p>
                  ) : (
                    report.current.topServices.map((s, idx) => (
                      <div key={s.serviceId} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-[#F4F4F6] text-[#71717A] text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-[#1E1E1E]">{s.name}</p>
                            <p className="text-[10px] text-[#71717A]">{s.category} • {s.bookingCount} bookings</p>
                          </div>
                        </div>
                        <span className="text-xs font-extrabold text-[#1E1E1E]">
                          {formatGhs(s.revenuePesewas)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Top Spenders / VIP Clients */}
              <Card className="p-6 rounded-3xl bg-white border border-[#E4E4E7] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1E1E1E]">Top Valued Clients</h3>
                  <span className="text-xs text-[#71717A]">By Net Spend</span>
                </div>
                <div className="divide-y divide-[#E4E4E7]">
                  {report.current.topCustomers.length === 0 ? (
                    <p className="py-6 text-center text-xs text-[#71717A]">No client spending data available.</p>
                  ) : (
                    report.current.topCustomers.map((c, idx) => (
                      <div key={c.customerId} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-[#1E1E1E] text-white text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-[#1E1E1E]">{c.name}</p>
                            <p className="text-[10px] text-[#71717A]">{c.phone} • {c.visitCount} visits</p>
                          </div>
                        </div>
                        <span className="text-xs font-extrabold text-[#1E1E1E]">
                          {formatGhs(c.netSpendPesewas)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* Daily Breakdown Table */}
            <Card className="p-6 rounded-3xl bg-white border border-[#E4E4E7] shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-[#1E1E1E]">Daily Financial Reconciliation Table</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E4E7] text-[#71717A] uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 font-bold">Date</th>
                      <th className="py-2.5 font-bold">Gross Payments</th>
                      <th className="py-2.5 font-bold">Refunds</th>
                      <th className="py-2.5 font-bold">Net Revenue</th>
                      <th className="py-2.5 font-bold text-right">Transactions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7]">
                    {report.current.revenueByDay.map((d) => (
                      <tr key={d.key} className="hover:bg-[#F4F4F6]/50">
                        <td className="py-2.5 font-medium text-[#1E1E1E]">{d.label}</td>
                        <td className="py-2.5 text-[#71717A]">{formatGhs(d.grossPesewas)}</td>
                        <td className="py-2.5 text-rose-600">
                          {d.refundsPesewas > 0 ? `-${formatGhs(d.refundsPesewas)}` : "—"}
                        </td>
                        <td className="py-2.5 font-bold text-[#1E1E1E]">{formatGhs(d.netPesewas)}</td>
                        <td className="py-2.5 text-right text-[#71717A]">{d.count}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#1E1E1E] font-extrabold text-[#1E1E1E]">
                      <td className="py-3">Reconciled Total</td>
                      <td className="py-3">{formatGhs(summary?.grossRevenuePesewas || 0)}</td>
                      <td className="py-3 text-rose-600">-{formatGhs(summary?.refundsPesewas || 0)}</td>
                      <td className="py-3 text-[#1E1E1E]">{formatGhs(summary?.netRevenuePesewas || 0)}</td>
                      <td className="py-3 text-right">
                        {report.current.revenueByDay.reduce((acc, d) => acc + d.count, 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: SERVICES & TOP DRIVERS */}
        {viewTab === "services" && report && (
          <div className="space-y-8">
            {/* Service Bar Chart */}
            <Card className="p-6 rounded-3xl bg-white border border-[#E4E4E7] shadow-xs space-y-4">
              <h2 className="text-base font-bold text-[#1E1E1E]">Revenue Generated by Top Services (GH₵)</h2>
              <div className="pt-2">
                <BarChart data={serviceBarData} height={240} />
              </div>
            </Card>

            {/* Detailed Services Table */}
            <Card className="p-6 rounded-3xl bg-white border border-[#E4E4E7] shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-[#1E1E1E]">Complete Service Performance Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E4E7] text-[#71717A] uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 font-bold">Service</th>
                      <th className="py-2.5 font-bold">Category</th>
                      <th className="py-2.5 font-bold">Bookings</th>
                      <th className="py-2.5 font-bold">Gross (GH₵)</th>
                      <th className="py-2.5 font-bold">Refunds (GH₵)</th>
                      <th className="py-2.5 font-bold text-right">Net Revenue (GH₵)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7]">
                    {report.current.revenueByService.map((s) => (
                      <tr key={s.serviceId} className="hover:bg-[#F4F4F6]/50">
                        <td className="py-2.5 font-bold text-[#1E1E1E]">{s.serviceName}</td>
                        <td className="py-2.5 text-[#71717A]">{s.categoryName}</td>
                        <td className="py-2.5 text-[#71717A]">{s.bookingCount}</td>
                        <td className="py-2.5 text-[#71717A]">{formatGhs(s.grossPesewas)}</td>
                        <td className="py-2.5 text-rose-600">
                          {s.refundsPesewas > 0 ? `-${formatGhs(s.refundsPesewas)}` : "—"}
                        </td>
                        <td className="py-2.5 font-bold text-[#1E1E1E] text-right">
                          {formatGhs(s.netPesewas)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: STAFF PERFORMANCE & UTILISATION */}
        {viewTab === "staff" && report && (
          <div className="space-y-8">
            {/* Staff Utilisation Metrics Table */}
            <Card className="p-6 rounded-3xl bg-white border border-[#E4E4E7] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#1E1E1E]">Staff Utilisation Rates</h2>
                  <p className="text-xs text-[#71717A]">
                    Proportion of scheduled shift time occupied by active appointments (booked minutes / available shift minutes).
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F4F4F6] text-[#1E1E1E]">
                  Target: 75% – 85%
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E4E7] text-[#71717A] uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 font-bold">Stylist / Staff</th>
                      <th className="py-2.5 font-bold">Appointments</th>
                      <th className="py-2.5 font-bold">Booked Time</th>
                      <th className="py-2.5 font-bold">Available Shift</th>
                      <th className="py-2.5 font-bold">Utilisation Rate</th>
                      <th className="py-2.5 font-bold text-right">Revenue (GH₵)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7]">
                    {report.current.staffUtilisation.map((u) => {
                      const staffRev = report.current.revenueByStaff.find((s) => s.staffId === u.staffId);
                      return (
                        <tr key={u.staffId} className="hover:bg-[#F4F4F6]/50">
                          <td className="py-2.5 font-bold text-[#1E1E1E]">{u.staffName}</td>
                          <td className="py-2.5 text-[#71717A]">{u.appointmentCount}</td>
                          <td className="py-2.5 text-[#71717A]">{Math.round(u.bookedMinutes / 60)} hrs ({u.bookedMinutes}m)</td>
                          <td className="py-2.5 text-[#71717A]">{Math.round(u.availableMinutes / 60)} hrs</td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 rounded-full bg-[#E4E4E7] overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    u.utilisationRate >= 75
                                      ? "bg-[#1E1E1E]"
                                      : u.utilisationRate >= 50
                                      ? "bg-[#71717A]"
                                      : "bg-[#A1A1AA]"
                                  }`}
                                  style={{ width: `${u.utilisationRate}%` }}
                                />
                              </div>
                              <span className="font-bold text-[#1E1E1E]">{u.utilisationRate}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 font-bold text-[#1E1E1E] text-right">
                            {formatGhs(staffRev?.netPesewas || 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Optional Staff Commission Report */}
            {report.current.commissions.enabled ? (
              <Card className="p-6 rounded-3xl bg-white border border-[#E4E4E7] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#1E1E1E]">Staff Commission Calculation</h3>
                    <p className="text-xs text-[#71717A]">
                      Computed from completed appointments at default rate of {report.current.commissions.defaultCommissionRatePercent}%.
                    </p>
                  </div>
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#1E1E1E] text-white">
                    Total Due: {formatGhs(report.current.commissions.totalCommissionPesewas)}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E4E4E7] text-[#71717A] uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 font-bold">Staff Member</th>
                        <th className="py-2.5 font-bold">Completed Appts</th>
                        <th className="py-2.5 font-bold">Completed Revenue</th>
                        <th className="py-2.5 font-bold">Commission Rate</th>
                        <th className="py-2.5 font-bold text-right">Commission Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4E4E7]">
                      {report.current.commissions.items.map((item) => (
                        <tr key={item.staffId} className="hover:bg-[#F4F4F6]/50">
                          <td className="py-2.5 font-bold text-[#1E1E1E]">{item.staffName}</td>
                          <td className="py-2.5 text-[#71717A]">{item.appointmentCount}</td>
                          <td className="py-2.5 text-[#71717A]">{formatGhs(item.completedRevenuePesewas)}</td>
                          <td className="py-2.5 text-[#71717A]">{item.commissionRatePercent}%</td>
                          <td className="py-2.5 font-bold text-[#1E1E1E] text-right">
                            {formatGhs(item.commissionPesewas)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <div className="p-4 rounded-2xl bg-[#F4F4F6] text-[#71717A] text-xs flex items-center justify-between">
                <span>Staff commissions are currently disabled in Studio Settings.</span>
                <span className="text-[10px] font-semibold text-[#1E1E1E]">Enable in Settings &gt; Business</span>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PAYMENT CHANNELS & LEDGER */}
        {viewTab === "payments" && report && (
          <div className="space-y-8">
            {/* Payment Method Channels Card */}
            <Card className="p-6 rounded-3xl bg-white border border-[#E4E4E7] shadow-xs space-y-6">
              <h2 className="text-base font-bold text-[#1E1E1E]">Revenue by Payment Method</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {/* Donut ring */}
                <div>
                  <DonutRing data={paymentDonutData} size={150} />
                </div>

                {/* Table of channels */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E4E4E7] text-[#71717A] uppercase text-[10px] tracking-wider">
                        <th className="py-2 font-bold">Channel</th>
                        <th className="py-2 font-bold">Tx Count</th>
                        <th className="py-2 font-bold">Gross</th>
                        <th className="py-2 font-bold text-right">Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4E4E7]">
                      {report.current.revenueByPaymentMethod.map((pm) => (
                        <tr key={pm.channel}>
                          <td className="py-2.5 font-bold text-[#1E1E1E]">{pm.displayName}</td>
                          <td className="py-2.5 text-[#71717A]">{pm.transactionCount}</td>
                          <td className="py-2.5 text-[#71717A]">{formatGhs(pm.grossPesewas)}</td>
                          <td className="py-2.5 font-bold text-[#1E1E1E] text-right">
                            {formatGhs(pm.netPesewas)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            {/* Bookings Status and Sources Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Booking Sources */}
              <Card className="p-6 rounded-3xl bg-white border border-[#E4E4E7] shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#1E1E1E]">Bookings by Source</h3>
                <div className="space-y-3">
                  {report.current.bookings.bySource.map((s) => (
                    <div key={s.source} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#1E1E1E]">{s.displayName}</span>
                        <span className="text-[#71717A]">{s.count} ({s.percentage}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#E4E4E7] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#1E1E1E]"
                          style={{ width: `${s.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Booking Statuses */}
              <Card className="p-6 rounded-3xl bg-white border border-[#E4E4E7] shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#1E1E1E]">Bookings by Operational Status</h3>
                <div className="space-y-3">
                  {report.current.bookings.byStatus.map((st) => (
                    <div key={st.status} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#1E1E1E]">{st.displayName}</span>
                        <span className="text-[#71717A]">{st.count} ({st.percentage}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#E4E4E7] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            st.status === "COMPLETED"
                              ? "bg-emerald-600"
                              : st.status === "CANCELLED"
                              ? "bg-rose-500"
                              : st.status === "NO_SHOW"
                              ? "bg-amber-500"
                              : "bg-[#1E1E1E]"
                          }`}
                          style={{ width: `${st.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
