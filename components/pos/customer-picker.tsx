"use client";

import * as React from "react";
import { Search, UserPlus, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/dialog-and-drawer";

export interface SelectedCustomer {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  isQuickCreated?: boolean;
}

interface CustomerResult {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
}

export function CustomerPicker({
  selectedCustomer,
  onSelectCustomer,
  onClearCustomer,
}: {
  selectedCustomer: SelectedCustomer | null;
  onSelectCustomer: (cust: SelectedCustomer) => void;
  onClearCustomer: () => void;
}) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [results, setResults] = React.useState<CustomerResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  // Quick-create dialog state
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newNotes, setNewNotes] = React.useState("");
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Debounced search
  React.useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/pos/customers?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok && active) {
          const data = await res.json();
          setResults(data.data?.customers || []);
          setIsDropdownOpen(true);
        }
      } catch (err) {
        console.error("Failed to search customers", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newName.trim()) {
      setCreateError("Customer name is required");
      return;
    }
    if (!newPhone.trim()) {
      setCreateError("Ghana phone number is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/pos/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          phone: newPhone.trim(),
          email: newEmail.trim() || undefined,
          notes: newNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to create customer");
      }

      const created = data.data.customer;
      onSelectCustomer({
        id: created.id,
        name: created.name,
        phone: created.phone,
        email: created.email || undefined,
        notes: created.notes || undefined,
        isQuickCreated: true,
      });

      setCreateDialogOpen(false);
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setNewNotes("");
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (selectedCustomer) {
    return (
      <div className="flex items-center justify-between p-3 bg-zinc-900/5 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm shrink-0">
            {selectedCustomer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-zinc-900 dark:text-white">
                {selectedCustomer.name}
              </span>
              {selectedCustomer.isQuickCreated && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium px-2 py-0.5 rounded-full">
                  New Customer
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Phone className="w-3 h-3" />
              <span>{selectedCustomer.phone}</span>
              {selectedCustomer.email && (
                <>
                  <span>•</span>
                  <span>{selectedCustomer.email}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="outlinePill"
          onClick={onClearCustomer}
          className="h-8 px-2.5 text-xs text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              if (!val.trim() || val.length < 2) {
                setResults([]);
                setIsDropdownOpen(false);
              }
            }}
            onFocus={() => {
              if (results.length > 0) setIsDropdownOpen(true);
            }}
            placeholder="Search customer by Ghana phone (024...) or name..."
            className="pl-9 pr-8 h-10 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl"
          />
          {isLoading && (
            <span className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          )}
        </div>
        <Button
          type="button"
          onClick={() => {
            setNewPhone(searchQuery.replace(/\D/g, ""));
            setCreateDialogOpen(true);
          }}
          className="bg-zinc-900 hover:bg-black text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-medium h-10 px-3.5 rounded-xl shrink-0 flex items-center gap-1.5 shadow-sm"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Quick Create</span>
        </Button>
      </div>

      {/* Autocomplete Dropdown */}
      {isDropdownOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
          {results.map((cust) => (
            <button
              key={cust.id}
              type="button"
              onClick={() => {
                onSelectCustomer({
                  id: cust.id,
                  name: cust.name,
                  phone: cust.phone,
                  email: cust.email || undefined,
                  notes: cust.notes || undefined,
                });
                setIsDropdownOpen(false);
                setSearchQuery("");
              }}
              className="w-full text-left p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors flex items-center justify-between text-xs"
            >
              <div>
                <p className="font-semibold text-zinc-900 dark:text-white">{cust.name}</p>
                <p className="text-zinc-500 text-[11px] flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3" />
                  <span>{cust.phone}</span>
                </p>
              </div>
              <span className="text-zinc-400 text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full font-mono">
                Select
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Quick Create Dialog */}
      <Dialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        title="Quick-Create Customer"
        description="Add a new customer profile for in-store checkout or walk-ins."
      >
        <form onSubmit={handleQuickCreate} className="space-y-4 pt-2">
          {createError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl">
              {createError}
            </div>
          )}

          <div>
            <Label htmlFor="cust-name" className="text-xs font-semibold mb-1 block">
              Full Name *
            </Label>
            <Input
              id="cust-name"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Afia Osei"
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div>
            <Label htmlFor="cust-phone" className="text-xs font-semibold mb-1 block">
              Ghana Phone Number *
            </Label>
            <Input
              id="cust-phone"
              required
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="e.g. 024 123 4567 or +233..."
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div>
            <Label htmlFor="cust-email" className="text-xs font-semibold mb-1 block">
              Email Address (Optional)
            </Label>
            <Input
              id="cust-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="afia@example.com"
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div>
            <Label htmlFor="cust-notes" className="text-xs font-semibold mb-1 block">
              Preferences / Notes (Optional)
            </Label>
            <Input
              id="cust-notes"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Allergies, VIP, preferred technician..."
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outlinePill"
              onClick={() => setCreateDialogOpen(false)}
              className="rounded-xl text-xs h-9 px-3"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-xl text-xs h-9 px-4 font-semibold shadow-sm"
            >
              {isSubmitting ? "Creating..." : "Save Customer"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
