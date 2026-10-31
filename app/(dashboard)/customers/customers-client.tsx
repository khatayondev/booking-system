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
  X,
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
      <div className="space-y-6 pb-12 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-800 border border-amber-500/20">
                <Users className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black tracking-tight text-[#1E1E1E]">Customers Directory</h1>
            </div>
            <p className="text-xs text-[#71717A]">
              Directory of studio clients, booking histories, allergies &amp; sensitivities, and privacy controls.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outlinePill"
              size="sm"
              onClick={handleExportCsv}
              disabled={exporting}
              className="border-[#E4E4E7] text-[#1E1E1E] hover:bg-white text-xs font-semibold gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-[#71717A]" />
              <span>{exporting ? "Exporting..." : "Export CSV"}</span>
            </Button>
            <Button
              variant="blackPill"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="gap-1.5 text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </Button>
          </div>
        </div>

        {/* Quick Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-white border border-black/5 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">Total Registered</span>
              <Users className="w-3.5 h-3.5 text-[#71717A]" />
            </div>
            <div className="text-2xl font-black font-poppins text-[#1E1E1E]">{total}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-amber-200/70 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">VIP Clients</span>
              <Crown className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-2xl font-black font-poppins text-amber-900">{vipCount}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-rose-200/70 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">Bridal Clients</span>
              <HeartHandshake className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-2xl font-black font-poppins text-rose-900">{bridalCount}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-amber-300/80 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">Allergies / Alerts</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-2xl font-black font-poppins text-amber-950">{allergyCount}</div>
          </div>
        </div>

        {/* Smart Search Bar & Filter Controls */}
        <div className="p-3.5 bg-white rounded-2xl border border-black/5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
            <input
              type="text"
              placeholder="Smart search by name, phone (+233), or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#F4F4F6] border border-[#E4E4E7] rounded-xl pl-10 pr-9 py-2 text-xs font-medium text-[#1E1E1E] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#1E1E1E] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#1E1E1E] p-0.5 rounded-full cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tag Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#F4F4F6] p-1 rounded-xl border border-[#E4E4E7] text-xs">
              <button
                type="button"
                onClick={() => {
                  setSelectedTag("ALL");
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedTag === "ALL"
                    ? "bg-white text-[#1E1E1E] shadow-xs"
                    : "text-[#71717A] hover:text-[#1E1E1E]"
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
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  selectedTag === "VIP"
                    ? "bg-amber-100 text-amber-900 shadow-xs"
                    : "text-[#71717A] hover:text-[#1E1E1E]"
                }`}
              >
                <Crown className="w-3 h-3 text-amber-600" />
                <span>VIP</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTag("Bridal");
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  selectedTag === "Bridal"
                    ? "bg-rose-100 text-rose-900 shadow-xs"
                    : "text-[#71717A] hover:text-[#1E1E1E]"
                }`}
              >
                <HeartHandshake className="w-3 h-3 text-rose-600" />
                <span>Bridal</span>
              </button>
            </div>

            {/* Has Allergies Toggle */}
            <button
              type="button"
              onClick={() => {
                setAllergyFilter(!allergyFilter);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                allergyFilter
                  ? "bg-amber-50 border-amber-300 text-amber-900 shadow-xs"
                  : "bg-[#F4F4F6] border-[#E4E4E7] text-[#71717A] hover:text-[#1E1E1E]"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Allergies</span>
            </button>

            {/* Marketing Consent Filter */}
            <select
              value={marketingFilter}
              onChange={(e) => {
                setMarketingFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#F4F4F6] border border-[#E4E4E7] text-[#1E1E1E] text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#1E1E1E] cursor-pointer"
            >
              <option value="ALL">All Marketing</option>
              <option value="OPTED_IN">Opted In Only</option>
              <option value="NO_CONSENT">No Consent</option>
            </select>

            <Button
              variant="circularIcon"
              size="iconSm"
              onClick={fetchCustomers}
              disabled={loading}
              className="text-[#71717A] hover:text-[#1E1E1E] cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Minimalistic Customer Table */}
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
          <div className="flex items-center justify-between text-xs text-[#71717A] px-2">
            <div>
              Showing <span className="font-poppins font-bold text-[#1E1E1E]">{(page - 1) * limit + 1}</span> to{" "}
              <span className="font-poppins font-bold text-[#1E1E1E]">{Math.min(page * limit, total)}</span> of{" "}
              <span className="font-poppins font-bold text-[#1E1E1E]">{total}</span> customers
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outlinePill"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="border-[#E4E4E7] text-[#1E1E1E] hover:bg-white text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>
              <span className="px-2 font-poppins font-bold text-[#1E1E1E]">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outlinePill"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="border-[#E4E4E7] text-[#1E1E1E] hover:bg-white text-xs"
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
