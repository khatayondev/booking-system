"use client";

import * as React from "react";
import { Tag, Percent, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/dialog-and-drawer";
import { formatPesewas } from "@/lib/money";

export interface DiscountState {
  type: "PERCENT" | "PROMO" | "NONE";
  percent?: number;
  promoCode?: string;
  reason?: string;
  calculatedDiscountPesewas: number;
}

export function DiscountModal({
  isOpen,
  onClose,
  subtotalPesewas,
  userRole,
  currentDiscount,
  onApplyDiscount,
  onRemoveDiscount,
}: {
  isOpen: boolean;
  onClose: () => void;
  subtotalPesewas: number;
  userRole: string; // "OWNER_ADMIN" | "MANAGER" | "STAFF_RECEPTIONIST"
  currentDiscount: DiscountState;
  onApplyDiscount: (discount: DiscountState) => void;
  onRemoveDiscount: () => void;
}) {
  const [tab, setTab] = React.useState<"PERCENT" | "PROMO">("PERCENT");
  const [percentInput, setPercentInput] = React.useState<string>(
    currentDiscount.percent ? String(currentDiscount.percent) : "5"
  );
  const [reasonInput, setReasonInput] = React.useState<string>(
    currentDiscount.reason || ""
  );
  const [promoCodeInput, setPromoCodeInput] = React.useState<string>(
    currentDiscount.promoCode || ""
  );
  const [error, setError] = React.useState<string | null>(null);

  // Maximum discount allowed by role
  const maxDiscountAllowed =
    userRole === "OWNER_ADMIN"
      ? 100
      : userRole === "MANAGER"
      ? 20
      : 5; // Staff

  const handleApply = () => {
    setError(null);

    if (tab === "PERCENT") {
      const p = parseFloat(percentInput);
      if (isNaN(p) || p <= 0 || p > 100) {
        setError("Please enter a valid percentage between 1 and 100.");
        return;
      }

      if (p > maxDiscountAllowed) {
        setError(
          `Your role (${userRole.replace("_", " ")}) is allowed a maximum discount of ${maxDiscountAllowed}%. Manager or Owner authorization required for higher discounts.`
        );
        return;
      }

      if (!reasonInput.trim()) {
        setError("A reason is required to apply a discount.");
        return;
      }

      const calculatedPesewas = Math.round((subtotalPesewas * p) / 100);
      onApplyDiscount({
        type: "PERCENT",
        percent: p,
        reason: reasonInput.trim(),
        calculatedDiscountPesewas: calculatedPesewas,
      });
      onClose();
    } else {
      // PROMO CODE
      if (!promoCodeInput.trim()) {
        setError("Please enter a promo code.");
        return;
      }

      // We pass the promo code; the server will validate and apply it
      onApplyDiscount({
        type: "PROMO",
        promoCode: promoCodeInput.trim().toUpperCase(),
        reason: `Promo Code: ${promoCodeInput.trim().toUpperCase()}`,
        calculatedDiscountPesewas: 0, // Server will resolve
      });
      onClose();
    }
  };

  const previewPercent = parseFloat(percentInput) || 0;
  const previewDiscountPesewas =
    previewPercent > 0 ? Math.round((subtotalPesewas * previewPercent) / 100) : 0;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Apply Discount or Promo Code"
      description="Enforces role-based limits and requires a reason for audit logging."
    >
      <div className="space-y-4 pt-2">
        {/* Toggle tabs */}
        <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
          <button
            type="button"
            onClick={() => setTab("PERCENT")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === "PERCENT"
                ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Percentage Discount</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("PROMO")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === "PROMO"
                ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Promo Code</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {tab === "PERCENT" ? (
          <div className="space-y-3.5">
            {/* Role limit banner */}
            <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs flex justify-between items-center">
              <span className="text-zinc-500">Your Allowed Limit ({userRole.replace("_", " ")}):</span>
              <span className="font-bold text-zinc-900 dark:text-white">Up to {maxDiscountAllowed}%</span>
            </div>

            <div>
              <Label htmlFor="disc-percent" className="text-xs font-semibold mb-1 block">
                Discount Percentage (%) *
              </Label>
              <div className="relative">
                <Input
                  id="disc-percent"
                  type="number"
                  min="1"
                  max={maxDiscountAllowed}
                  value={percentInput}
                  onChange={(e) => setPercentInput(e.target.value)}
                  placeholder="e.g. 5"
                  className="h-10 text-xs rounded-xl pr-8"
                />
                <Percent className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <Label htmlFor="disc-reason" className="text-xs font-semibold mb-1 block">
                Reason * (Required for audit trail)
              </Label>
              <Input
                id="disc-reason"
                required
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="e.g. Loyal client, bridal package bundle, management courtesy"
                className="h-10 text-xs rounded-xl"
              />
            </div>

            {/* Live calculation */}
            {previewPercent > 0 && previewPercent <= maxDiscountAllowed && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs flex justify-between items-center text-emerald-800 dark:text-emerald-300">
                <span>Estimated Deduction:</span>
                <span className="font-bold">-{formatPesewas(previewDiscountPesewas)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            <div>
              <Label htmlFor="promo-code" className="text-xs font-semibold mb-1 block">
                Enter Promo Code
              </Label>
              <Input
                id="promo-code"
                value={promoCodeInput}
                onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. WELCOME10, EASTLEGONVIP"
                className="h-10 text-xs rounded-xl uppercase font-mono tracking-wider"
              />
            </div>
            <p className="text-[11px] text-zinc-500">
              Validates against active promotional campaigns and expiry dates automatically.
            </p>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t border-zinc-100 dark:border-zinc-800">
          {currentDiscount.type !== "NONE" ? (
            <Button
              type="button"
              variant="outlinePill"
              onClick={() => {
                onRemoveDiscount();
                onClose();
              }}
              className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950 text-xs rounded-xl h-9"
            >
              Remove Discount
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outlinePill"
              onClick={onClose}
              className="text-xs rounded-xl h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              className="bg-zinc-900 text-white hover:bg-black dark:bg-white dark:text-zinc-900 text-xs rounded-xl h-9 font-semibold"
            >
              Apply Discount
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
