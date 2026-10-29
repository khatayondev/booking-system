"use client";

import * as React from "react";
import {
  Users,
  Search,
  Plus,
  Download,
  Crown,
  HeartHandshake,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { CustomerTable } from "@/components/customers/customer-table";
import { CustomerDrawer } from "@/components/customers/customer-drawer";
import { CreateCustomerModal } from "@/components/customers/create-customer-modal";
import type { CustomerSummary } from "@/lib/customers/types";

export function CustomersClient() {
  const [customers, setCustomers] = React.useState<CustomerSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const limit = 20;

  // Search & Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedTag, setSelectedTag] = React.useState<string>("ALL");
  const [allergyFilter, setAllergyFilter] = React.useState<boolean>(false);
  const [marketingFilter, setMarketingFilter] = React.useState<string>("ALL");

  // User Auth & Role
  const [currentUser, setCurrentUser] = React.useState<{
    id: string;
    name: string;
    role: string;
    permissions: string[];
  } | null>(null);

  // Drawer & Modals
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  // Fetch Current Session User
  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data?.user) {
          setCurrentUser(data.data.user);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Customers with debounced search
  const fetchCustomers = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (selectedTag !== "ALL") params.set("tag", selectedTag);
      if (allergyFilter) params.set("hasAllergies", "true");
      if (marketingFilter !== "ALL") {
        params.set("marketingConsent", marketingFilter === "OPTED_IN" ? "true" : "false");
      }

      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setCustomers(json.data.customers || []);
        setTotal(json.data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, selectedTag, allergyFilter, marketingFilter]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  // Export CSV handler
  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/customers/export");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Failed to export customer CSV. Manager permissions required.");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `beccascrown-customers-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Error downloading customer CSV export.");
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedTag("ALL");
    setAllergyFilter(false);
    setMarketingFilter("ALL");
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  // Derive counts for stat summary
  const vipCount = customers.filter((c) => c.tags.some((t) => t.toLowerCase() === "vip")).length;
  const bridalCount = customers.filter((c) => c.tags.some((t) => t.toLowerCase() === "bridal")).length;
  const allergyCount = customers.filter((c) => Boolean(c.allergies)).length;

  return (
    <AppShell activePath="/customers">
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Users className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Customers</h1>
            </div>
            <p className="text-sm text-zinc-400">
              Directory of clients, booking histories, allergies & sensitivities, and privacy controls.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outlinePill"
              size="sm"
              onClick={handleExportCsv}
              disabled={exporting}
              className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"
            >
              <Download className="w-4 h-4 mr-2 text-zinc-400" />
              {exporting ? "Exporting..." : "Export CSV"}
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Customer
            </Button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 shadow-md">
            <div className="text-xs font-medium text-zinc-400 mb-1">Total Registered</div>
            <div className="text-2xl font-bold text-zinc-100">{total}</div>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 shadow-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-amber-400/90">VIP Clients</span>
              <Crown className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-300">{vipCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 shadow-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-rose-400/90">Bridal Clients</span>
              <HeartHandshake className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-300">{bridalCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 shadow-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-amber-400">Allergies / Sensitivities</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">{allergyCount}</div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80 backdrop-blur-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, phone (+233), or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full bg-zinc-950/70 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/60 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tag Filter Pills */}
            <div className="flex items-center gap-1 bg-zinc-950/70 p-1 rounded-lg border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSelectedTag("ALL");
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  selectedTag === "ALL"
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTag("VIP");
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  selectedTag === "VIP"
                    ? "bg-amber-500/20 text-amber-300 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                VIP
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTag("Bridal");
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  selectedTag === "Bridal"
                    ? "bg-rose-500/20 text-rose-300 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Bridal
              </button>
            </div>

            {/* Has Allergies Toggle */}
            <button
              type="button"
              onClick={() => {
                setAllergyFilter(!allergyFilter);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                allergyFilter
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                  : "bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>With Allergies</span>
            </button>

            {/* Marketing Consent Filter */}
            <select
              value={marketingFilter}
              onChange={(e) => {
                setMarketingFilter(e.target.value);
                setPage(1);
              }}
              className="bg-zinc-950/70 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500/60"
            >
              <option value="ALL">All Marketing</option>
              <option value="OPTED_IN">Opted In Only</option>
              <option value="NO_CONSENT">No Consent</option>
            </select>

            <Button
              variant="ghost"
              size="sm"
              onClick={fetchCustomers}
              disabled={loading}
              className="text-zinc-400 hover:text-zinc-200 p-2"
              title="Refresh list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Customer Table */}
        <CustomerTable
          customers={customers}
          loading={loading}
          onSelectCustomer={(c) => {
            setSelectedCustomerId(c.id);
            setIsDrawerOpen(true);
          }}
          onResetFilters={resetFilters}
        />

        {/* Pagination Bar */}
        {total > limit && (
          <div className="flex items-center justify-between text-xs text-zinc-400 px-2">
            <div>
              Showing <span className="text-zinc-200">{(page - 1) * limit + 1}</span> to{" "}
              <span className="text-zinc-200">{Math.min(page * limit, total)}</span> of{" "}
              <span className="text-zinc-200">{total}</span> customers
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outlinePill"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="border-zinc-800 text-zinc-300"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>
              <span className="px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outlinePill"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="border-zinc-800 text-zinc-300"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Customer Details & History Drawer */}
        <CustomerDrawer
          customerId={selectedCustomerId}
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedCustomerId(null);
          }}
          onRefresh={fetchCustomers}
          userRole={currentUser?.role}
        />

        {/* Create Customer Modal */}
        <CreateCustomerModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            setIsCreateOpen(false);
            fetchCustomers();
          }}
        />
      </div>
    </AppShell>
  );
}
