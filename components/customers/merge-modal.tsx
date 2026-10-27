"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog-and-drawer";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/controls";
import { CustomerSummary } from "@/lib/customers/types";
import { AlertTriangle, GitMerge, Search, CheckCircle2 } from "lucide-react";

interface MergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryCustomer: CustomerSummary | null;
  onMergeSuccess: () => void;
}

export function MergeModal({
  isOpen,
  onClose,
  primaryCustomer,
  onMergeSuccess,
}: MergeModalProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [candidates, setCandidates] = React.useState<CustomerSummary[]>([]);
  const [selectedDuplicate, setSelectedDuplicate] = React.useState<CustomerSummary | null>(null);
  const [merging, setMerging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Search for duplicate candidates
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      setError(null);
      const res = await fetch(`/api/admin/customers?q=${encodeURIComponent(searchQuery.trim())}&limit=5`);
      const json = await res.json();
      if (json.success && json.data?.customers) {
        // Exclude primary customer
        const filtered = (json.data.customers as CustomerSummary[]).filter(
          (c) => c.id !== primaryCustomer?.id
        );
        setCandidates(filtered);
        if (filtered.length === 0) {
          setError("No matching duplicate customers found.");
        }
      } else {
        setError(json.error?.message || "Search failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search error");
    } finally {
      setSearching(false);
    }
  };

  const handleConfirmMerge = async () => {
    if (!primaryCustomer || !selectedDuplicate) return;

    try {
      setMerging(true);
      setError(null);

      const res = await fetch("/api/admin/customers/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryCustomerId: primaryCustomer.id,
          duplicateCustomerId: selectedDuplicate.id,
        }),
      });

      const json = await res.json();
      if (json.success) {
        onMergeSuccess();
        onClose();
      } else {
        setError(json.error?.message || "Failed to merge customer profiles");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error executing merge");
    } finally {
      setMerging(false);
    }
  };

  if (!primaryCustomer) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Merge Duplicate Customer Profiles">
      <div className="space-y-5">
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            All appointments, payment records, receipts, tags, and sensitivity notes from the duplicate
            profile will be safely transferred to <strong>{primaryCustomer.name}</strong>. The duplicate
            profile will then be archived.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs">
            {error}
          </div>
        )}

        {/* Primary Customer Summary */}
        <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">
            Target Profile (Retained)
          </span>
          <div className="flex justify-between items-center font-bold text-zinc-900">
            <span>{primaryCustomer.name}</span>
            <span className="font-mono text-zinc-600">{primaryCustomer.phone}</span>
          </div>
          <div className="text-[11px] text-zinc-500">
            {primaryCustomer.visitCount} visits • {primaryCustomer.tags.join(", ") || "No tags"}
          </div>
        </div>

        {/* Step 1: Search Duplicate */}
        {!selectedDuplicate ? (
          <div className="space-y-3">
            <Label className="text-xs font-bold text-zinc-700">Find Duplicate Profile to Merge</Label>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Search phone number (024...) or name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs"
              />
              <Button
                type="submit"
                disabled={searching}
                size="sm"
                variant="outlinePill"
                className="shrink-0 flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{searching ? "Searching..." : "Find"}</span>
              </Button>
            </form>

            {/* Candidate list */}
            {candidates.length > 0 && (
              <div className="space-y-2 mt-2">
                <span className="text-[11px] font-semibold text-zinc-500">Select duplicate profile:</span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {candidates.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedDuplicate(c)}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 text-left hover:bg-zinc-100 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-bold text-zinc-900">{c.name}</div>
                        <div className="text-[11px] text-zinc-500">{c.phone} • {c.visitCount} visits</div>
                      </div>
                      <GitMerge className="w-4 h-4 text-zinc-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Confirmation */
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-zinc-100 border border-zinc-300 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  Duplicate Profile to Merge & Archive
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDuplicate(null)}
                  className="text-[11px] text-zinc-600 underline cursor-pointer"
                >
                  Change
                </button>
              </div>
              <div className="flex justify-between items-center font-bold text-zinc-900">
                <span>{selectedDuplicate.name}</span>
                <span className="font-mono text-zinc-600">{selectedDuplicate.phone}</span>
              </div>
              <div className="text-[11px] text-zinc-500">
                {selectedDuplicate.visitCount} visits • Tags: {selectedDuplicate.tags.join(", ") || "None"}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outlinePill"
                onClick={onClose}
                disabled={merging}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="blackPill"
                onClick={handleConfirmMerge}
                disabled={merging}
                className="text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{merging ? "Merging Profiles..." : "Confirm & Merge"}</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
