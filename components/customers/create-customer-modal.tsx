"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog-and-drawer";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/controls";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCustomerModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateCustomerModalProps) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [allergies, setAllergies] = React.useState("");
  const [preferences, setPreferences] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState("");
  const [marketingConsent, setMarketingConsent] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim().toUpperCase();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          allergies: allergies.trim() || null,
          preferences: preferences.trim() || null,
          tags,
          marketingConsent,
          notes: notes.trim() || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        // Reset form
        setName("");
        setPhone("");
        setEmail("");
        setAllergies("");
        setPreferences("");
        setTags([]);
        setMarketingConsent(false);
        setNotes("");
        onSuccess();
        onClose();
      } else {
        setError(json.error?.message || "Failed to create customer");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Add New Customer">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-zinc-700">Full Name *</Label>
            <Input
              required
              placeholder="e.g. Ama Serwaa"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-zinc-700">Ghana Phone (+233/024) *</Label>
            <Input
              required
              type="tel"
              placeholder="e.g. 0244123456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="text-xs font-mono"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-bold text-zinc-700">Email Address (Optional)</Label>
          <Input
            type="email"
            placeholder="e.g. ama.serwaa@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="text-xs"
          />
        </div>

        {/* Allergy & Sensitivity Notes */}
        <div className="space-y-1 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Allergy / Sensitivity Notes (Highlighted on Bookings)</span>
          </div>
          <Input
            placeholder="e.g. Lash glue sensitivity (cyanoacrylate), latex allergy"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            className="text-xs bg-white border-amber-200 mt-1"
          />
          <p className="text-[10px] text-amber-800 mt-0.5">
            Will be prominently highlighted to stylists before every appointment.
          </p>
        </div>

        {/* Client Preferences */}
        <div className="space-y-1">
          <Label className="text-xs font-bold text-zinc-700">Styling & Salon Preferences</Label>
          <Input
            placeholder="e.g. Prefers jasmine tea, natural glam look, sensitive scalp"
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            className="text-xs"
          />
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-zinc-700">Customer Tags</Label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {["VIP", "BRIDAL", "LOYAL"].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleAddTag(preset)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                  tags.includes(preset)
                    ? "bg-black text-white border-black"
                    : "bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200"
                }`}
              >
                + {preset}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Add custom tag (e.g. INFLUENCER)"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag(tagInput);
                }
              }}
            />
            <Button
              type="button"
              variant="outlinePill"
              size="sm"
              onClick={() => handleAddTag(tagInput)}
              className="shrink-0 text-xs cursor-pointer"
            >
              Add
            </Button>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 text-white text-[10px] font-bold"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-rose-400 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Marketing Consent */}
        <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-zinc-900 block">Marketing Consent</span>
            <span className="text-[10px] text-zinc-500 block">
              Client consented to receiving salon promotional SMS and WhatsApp updates
            </span>
          </div>
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(e) => setMarketingConsent(e.target.checked)}
            className="w-4 h-4 rounded text-black focus:ring-black cursor-pointer"
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
            variant="blackPill"
            disabled={submitting}
            className="text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{submitting ? "Saving..." : "Create Customer"}</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
