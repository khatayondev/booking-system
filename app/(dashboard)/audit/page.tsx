"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormattedAuditLogEntry } from "@/lib/audit/service";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  RefreshCw,
} from "lucide-react";

export default function AuditPage() {
  return (
    <React.Suspense fallback={<AuditLoadingSkeleton />}>
      <AuditLogContent />
    </React.Suspense>
  );
}

function AuditLoadingSkeleton() {
  return (
    <AppShell activePath="/audit">
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-10 bg-black/5 rounded-2xl w-1/3" />
        <div className="h-16 bg-black/5 rounded-3xl" />
        <div className="h-96 bg-black/5 rounded-3xl" />
      </div>
    </AppShell>
  );
}

function AuditLogContent() {
  // Filter states
  const [search, setSearch] = React.useState("");
  const [entityType, setEntityType] = React.useState("ALL");
  const [actionFilter, setActionFilter] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [refreshToken, setRefreshToken] = React.useState(0);

  // Data states
  const [logs, setLogs] = React.useState<FormattedAuditLogEntry[]>([]);
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 1,
    hasMore: false,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = React.useState(false);

  // Selected log for Before/After Diff Modal
  const [selectedLog, setSelectedLog] = React.useState<FormattedAuditLogEntry | null>(null);

  React.useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", "25");
        if (search.trim()) params.set("search", search.trim());
        if (entityType && entityType !== "ALL") params.set("entityType", entityType);
        if (actionFilter.trim()) params.set("action", actionFilter.trim());
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);

        const res = await fetch(`/api/admin/audit?${params.toString()}`);
        if (!ignore) {
          if (res.status === 401 || res.status === 403) {
            setIsUnauthorized(true);
          } else if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            setError(json.message || `Failed to fetch audit records (${res.status})`);
          } else {
            const json = await res.json();
            setLogs(json.data.logs || []);
            setPagination(json.data.pagination);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load audit records");
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
  }, [page, search, entityType, actionFilter, startDate, endDate, refreshToken]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPage(1);
    setRefreshToken((t) => t + 1);
  };

  const handleResetFilters = () => {
    setLoading(true);
    setSearch("");
    setEntityType("ALL");
    setActionFilter("");
    setStartDate("");
    setEndDate("");
    setPage(1);
    setRefreshToken((t) => t + 1);
  };

  const handleRefresh = () => {
    setLoading(true);
    setRefreshToken((t) => t + 1);
  };

  return (
    <AppShell activePath="/audit">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#1E1E1E] text-white flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1E1E1E]">
                Owner Audit Trail
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1E1E1E] text-white uppercase tracking-wider">
                Append-Only
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#71717A] mt-1">
              Immutable log of every state change, administrative action, and refund with before/after snapshots.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outlinePill"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="rounded-full text-xs flex items-center gap-1.5 border-[#E4E4E7]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Unauthorized View for Non-Owner Roles */}
        {isUnauthorized && (
          <Card className="p-8 rounded-3xl bg-rose-50 border border-rose-200 text-center space-y-4 max-w-xl mx-auto my-12">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-rose-900">Access Restricted: Owner Only</h3>
              <p className="text-xs text-rose-700 mt-1">
                The studio audit log contains sensitive before/after records, security snapshots, and financial changes. Only users with the OWNER_ADMIN role are permitted to view audit logs.
              </p>
            </div>
          </Card>
        )}

        {!isUnauthorized && (
          <>
            {/* Filter Bar */}
            <Card className="p-4 rounded-3xl bg-white border border-[#E4E4E7] shadow-xs">
              <form onSubmit={handleFilterSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* Search query */}
                  <div className="lg:col-span-2 relative">
                    <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search action, actor name, or entity ID..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-2xl bg-[#F4F4F6] border border-[#E4E4E7] text-xs text-[#1E1E1E] focus:outline-hidden focus:border-black"
                    />
                  </div>

                  {/* Entity Type Filter */}
                  <div>
                    <select
                      value={entityType}
                      onChange={(e) => setEntityType(e.target.value)}
                      className="w-full px-3 py-2 rounded-2xl bg-[#F4F4F6] border border-[#E4E4E7] text-xs text-[#1E1E1E] focus:outline-hidden focus:border-black"
                    >
                      <option value="ALL">All Entities</option>
                      <option value="Booking">Bookings</option>
                      <option value="Payment">Payments & Refunds</option>
                      <option value="Customer">Customers</option>
                      <option value="Service">Services</option>
                      <option value="Staff">Staff</option>
                      <option value="Settings">Studio Settings</option>
                      <option value="User">Users</option>
                      <option value="Role">Roles & Permissions</option>
                    </select>
                  </div>

                  {/* Start Date */}
                  <div>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-2xl bg-[#F4F4F6] border border-[#E4E4E7] text-xs text-[#1E1E1E] focus:outline-hidden focus:border-black"
                      title="Start date"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-2xl bg-[#F4F4F6] border border-[#E4E4E7] text-xs text-[#1E1E1E] focus:outline-hidden focus:border-black"
                      title="End date"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-[#71717A]">
                    Showing {logs.length} of {pagination.totalCount} immutable audit records
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-xs text-[#71717A] hover:text-[#1E1E1E] px-2"
                    >
                      Reset
                    </button>
                    <Button
                      type="submit"
                      variant="blackPill"
                      size="sm"
                      className="rounded-full text-xs bg-[#1E1E1E] text-white hover:bg-black px-4"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </form>
            </Card>

            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {error}
              </div>
            )}

            {/* Audit Logs Table */}
            <Card className="rounded-3xl bg-white border border-[#E4E4E7] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E4E7] bg-[#F4F4F6]/50 text-[#71717A] uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4 font-bold">When (Accra)</th>
                      <th className="py-3 px-4 font-bold">Who (Actor)</th>
                      <th className="py-3 px-4 font-bold">Action</th>
                      <th className="py-3 px-4 font-bold">Entity</th>
                      <th className="py-3 px-4 font-bold">IP & Client</th>
                      <th className="py-3 px-4 font-bold text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7]">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#71717A]">
                          No audit log records found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => {
                        const date = new Date(log.timestamp);
                        const formattedDate = date.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          timeZone: "Africa/Accra",
                        });
                        const formattedTime = date.toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          timeZone: "Africa/Accra",
                        });

                        return (
                          <tr key={log.id} className="hover:bg-[#F4F4F6]/40 transition-colors">
                            <td className="py-3 px-4 whitespace-nowrap">
                              <p className="font-semibold text-[#1E1E1E]">{formattedDate}</p>
                              <p className="text-[10px] text-[#71717A]">{formattedTime} GMT</p>
                            </td>

                            <td className="py-3 px-4">
                              {log.user ? (
                                <div>
                                  <p className="font-bold text-[#1E1E1E]">{log.user.name}</p>
                                  <p className="text-[10px] text-[#71717A]">{log.user.email}</p>
                                  {log.user.role && (
                                    <span className="inline-block px-1.5 py-0.2 rounded-sm text-[9px] font-bold bg-[#E4E4E7] text-[#1E1E1E] mt-0.5">
                                      {log.user.role}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[#A1A1AA] italic">System / Customer</span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#F4F4F6] text-[#1E1E1E] border border-[#E4E4E7]">
                                {log.action}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <p className="font-semibold text-[#1E1E1E]">{log.entityType}</p>
                              {log.entityId && (
                                <p className="text-[10px] text-[#71717A] font-mono truncate max-w-[120px]">
                                  {log.entityId}
                                </p>
                              )}
                            </td>

                            <td className="py-3 px-4 text-[#71717A] text-[10px]">
                              <p>{log.ipAddress || "—"}</p>
                              <p className="truncate max-w-[140px] text-[#A1A1AA]">
                                {log.userAgent || ""}
                              </p>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <Button
                                variant="outlinePill"
                                size="sm"
                                onClick={() => setSelectedLog(log)}
                                className="rounded-full text-[11px] px-3 py-1 h-7 border-[#E4E4E7] hover:bg-[#1E1E1E] hover:text-white transition-colors"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                <span>Diff ({log.diffs.length})</span>
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="p-4 border-t border-[#E4E4E7] flex items-center justify-between text-xs text-[#71717A]">
                  <div>
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outlinePill"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="rounded-full h-8 px-3"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                      <span>Prev</span>
                    </Button>
                    <Button
                      variant="outlinePill"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!pagination.hasMore}
                      className="rounded-full h-8 px-3"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Before / After Diff Modal */}
            {selectedLog && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-[#E4E4E7] overflow-hidden flex flex-col max-h-[85vh]">
                  {/* Modal Header */}
                  <div className="p-5 border-b border-[#E4E4E7] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[#1E1E1E] text-white">
                          {selectedLog.action}
                        </span>
                        <span className="text-xs text-[#71717A]">
                          {selectedLog.entityType} ({selectedLog.entityId || "N/A"})
                        </span>
                      </div>
                      <p className="text-xs text-[#71717A] mt-1">
                        Recorded on {new Date(selectedLog.timestamp).toLocaleString("en-GB", { timeZone: "Africa/Accra" })} GMT
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedLog(null)}
                      className="p-1.5 rounded-full hover:bg-[#F4F4F6] text-[#71717A] transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Body: Diffs list */}
                  <div className="p-5 overflow-y-auto space-y-4">
                    {selectedLog.diffs.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-[#F4F4F6] text-center text-xs text-[#71717A]">
                        No specific property diff detected (or action is an event creation without prior state).
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
                          Field-by-Field State Changes
                        </h4>
                        <div className="divide-y divide-[#E4E4E7] border border-[#E4E4E7] rounded-2xl overflow-hidden">
                          {selectedLog.diffs.map((diff, idx) => (
                            <div key={idx} className="p-3 bg-white text-xs space-y-2">
                              <span className="font-mono font-bold text-[#1E1E1E] block">
                                {diff.field}
                              </span>
                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className="p-2 rounded-xl bg-rose-50 border border-rose-100">
                                  <span className="text-[10px] font-bold text-rose-700 block uppercase mb-1">
                                    Before (Old Value)
                                  </span>
                                  <pre className="font-mono text-rose-900 whitespace-pre-wrap break-all">
                                    {JSON.stringify(diff.oldValue, null, 2) ?? "undefined"}
                                  </pre>
                                </div>
                                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                                  <span className="text-[10px] font-bold text-emerald-700 block uppercase mb-1">
                                    After (New Value)
                                  </span>
                                  <pre className="font-mono text-emerald-900 whitespace-pre-wrap break-all">
                                    {JSON.stringify(diff.newValue, null, 2) ?? "undefined"}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Raw JSON Expanders */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <details className="text-xs bg-[#F4F4F6] p-3 rounded-2xl border border-[#E4E4E7]">
                        <summary className="font-bold text-[#1E1E1E] cursor-pointer">
                          Full Old Values JSON
                        </summary>
                        <pre className="mt-2 text-[10px] font-mono text-[#71717A] overflow-x-auto p-2 bg-white rounded-xl">
                          {JSON.stringify(selectedLog.oldValues, null, 2)}
                        </pre>
                      </details>

                      <details className="text-xs bg-[#F4F4F6] p-3 rounded-2xl border border-[#E4E4E7]">
                        <summary className="font-bold text-[#1E1E1E] cursor-pointer">
                          Full New Values JSON
                        </summary>
                        <pre className="mt-2 text-[10px] font-mono text-[#71717A] overflow-x-auto p-2 bg-white rounded-xl">
                          {JSON.stringify(selectedLog.newValues, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 border-t border-[#E4E4E7] bg-[#F4F4F6]/50 flex justify-end">
                    <Button
                      variant="blackPill"
                      size="sm"
                      onClick={() => setSelectedLog(null)}
                      className="rounded-full text-xs bg-[#1E1E1E] text-white hover:bg-black"
                    >
                      Close Diff Inspector
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
