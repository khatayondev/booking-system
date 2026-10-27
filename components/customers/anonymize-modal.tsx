"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog-and-drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/controls";
import { CustomerSummary } from "@/lib/customers/types";
import { ShieldAlert, AlertCircle, Check } from "lucide-react";

interface AnonymizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerSummary | null;
  onSuccess: () => void;
}

export function AnonymizeModal({
  isOpen,
  onClose,
  customer,
  onSuccess,
}: AnonymizeModalProps) {
  const [action, setAction] = React.useState<"ANONYMIZE" | "DELETE">("ANONYMIZE");
  const [reason, setReason] = React.useState("Ghana Data Protection Act (Act 843) right to erasure request");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`/api/admin/customers/${customer.id}/anonymize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });

      const json = await res.json();
      if (json.success) {
        onSuccess();
        onClose();
      } else {
        setError(json.error?.message || "Action failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error processing request");
    } finally {
      setSubmitting(false);
    }
  };

  if (!customer) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Data Protection Erasure & Anonymization"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-black text-rose-950 uppercase tracking-wider text-[11px]">
              Ghana Data Protection Act (Act 843) • Owner Authorization Required
            </h4>
            <p className="leading-relaxed">
              You are modifying customer records for <strong>{customer.name}</strong> ({customer.phone}).
              This irreversible action removes personal identifiable information (PII).
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-100 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Type Selection */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-zinc-800">Select Erasure Treatment</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setAction("ANONYMIZE")}
              className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                action === "ANONYMIZE"
                  ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                  : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs">Anonymize PII</span>
                {action === "ANONYMIZE" && <Check className="w-3.5 h-3.5" />}
              </div>
              <p className="text-[10px] leading-relaxed opacity-80">
                Wipes name, phone, email, notes, and allergies. Preserves anonymous transaction and booking
                history for tax & audit compliance.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setAction("DELETE")}
              className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                action === "DELETE"
                  ? "bg-rose-950 text-rose-100 border-rose-800 shadow-sm"
                  : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs">Soft Delete Record</span>
                {action === "DELETE" && <Check className="w-3.5 h-3.5" />}
              </div>
              <p className="text-[10px] leading-relaxed opacity-80">
                Marks customer as permanently deleted and archives contact indices.
              </p>
            </button>
          </div>
        </div>

        {/* Reason / Legal Justification */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-zinc-800">Compliance Reason</Label>
          <input
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-zinc-300 text-xs bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outlinePill"
            onClick={onClose}
            disabled={submitting}
            className="text-xs cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="py-2 px-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-colors cursor-pointer"
          >
            {submitting ? "Processing..." : action === "ANONYMIZE" ? "Anonymize Personal Data" : "Delete Customer"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
