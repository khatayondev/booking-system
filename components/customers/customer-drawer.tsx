"use client";

import * as React from "react";
import { Drawer } from "@/components/ui/dialog-and-drawer";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/controls";
import { formatPesewas } from "@/lib/money";
import type { CustomerDetail } from "@/lib/customers/types";
import {
  Calendar,
  AlertTriangle,
  GitMerge,
  ShieldAlert,
  CheckCircle2,
  Edit2,
  Save,
} from "lucide-react";
import { MergeModal } from "./merge-modal";
import { AnonymizeModal } from "./anonymize-modal";

interface CustomerDrawerProps {
  customerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  userRole?: string;
}

export function CustomerDrawer({
  customerId,
  isOpen,
  onClose,
  onRefresh,
  userRole,
}: CustomerDrawerProps) {
  const [customer, setCustomer] = React.useState<CustomerDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editPhone, setEditPhone] = React.useState("");
  const [editEmail, setEditEmail] = React.useState("");
  const [editAllergies, setEditAllergies] = React.useState("");
  const [editPreferences, setEditPreferences] = React.useState("");
  const [editTags, setEditTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState("");
  const [editMarketingConsent, setEditMarketingConsent] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  // Sub-modal states
  const [mergeModalOpen, setMergeModalOpen] = React.useState(false);
  const [anonymizeModalOpen, setAnonymizeModalOpen] = React.useState(false);

  // Fetch customer detail
  const fetchCustomer = React.useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/customers/${id}`);
      const json = await res.json();
      if (json.success && json.data?.customer) {
        const c: CustomerDetail = json.data.customer;
        setCustomer(c);
        setEditName(c.name);
        setEditPhone(c.phone);
        setEditEmail(c.email || "");
        setEditAllergies(c.allergies || "");
        setEditPreferences(c.preferences || "");
        setEditTags(c.tags || []);
        setEditMarketingConsent(c.marketingConsent);
      } else {
        setError(json.error?.message || "Failed to load customer profile");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching profile");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!customerId || !isOpen) return;

    let isMounted = true;
    fetch(`/api/admin/customers/${customerId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.success && json.data?.customer) {
          const c: CustomerDetail = json.data.customer;
          setCustomer(c);
          setEditName(c.name);
          setEditPhone(c.phone);
          setEditEmail(c.email || "");
          setEditAllergies(c.allergies || "");
          setEditPreferences(c.preferences || "");
          setEditTags(c.tags || []);
          setEditMarketingConsent(c.marketingConsent);
        } else {
          setError(json.error?.message || "Failed to load customer profile");
        }
        setIsEditing(false);
        setSaveSuccess(false);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Error fetching profile");
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [customerId, isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    try {
      setSaving(true);
      setError(null);

      const res = await fetch(`/api/admin/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim() || null,
          allergies: editAllergies.trim() || null,
          preferences: editPreferences.trim() || null,
          tags: editTags,
          marketingConsent: editMarketingConsent,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSaveSuccess(true);
        setIsEditing(false);
        fetchCustomer(customer.id);
        onRefresh();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError(json.error?.message || "Failed to update profile");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = (t: string) => {
    const clean = t.trim().toUpperCase();
    if (clean && !editTags.includes(clean)) {
      setEditTags([...editTags, clean]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (t: string) => {
    setEditTags(editTags.filter((x) => x !== t));
  };

  const isOwner = userRole === "OWNER_ADMIN";
  const isManagerOrAbove = userRole === "OWNER_ADMIN" || userRole === "MANAGER";

  return (
    <>
      <Drawer isOpen={isOpen} onClose={onClose} title={customer ? customer.name : "Customer Profile"}>
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-zinc-500">Loading customer profile...</p>
          </div>
        ) : error || !customer ? (
          <div className="py-12 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-xs text-rose-600 font-semibold">{error || "Customer not found"}</p>
          </div>
        ) : (
          <div className="space-y-6 pb-6">
            {/* Header info */}
            <div className="flex items-start justify-between border-b border-zinc-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-zinc-900">{customer.name}</h3>
                  {customer.isAnonymized && (
                    <span className="px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700 text-[10px] font-bold">
                      Act 843 Anonymized
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-600 mt-1">
                  <span className="font-mono font-semibold">{customer.phone}</span>
                  {customer.email && <span>• {customer.email}</span>}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outlinePill"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs cursor-pointer flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{isEditing ? "Cancel" : "Edit"}</span>
                </Button>
              </div>
            </div>

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Customer profile updated successfully!</span>
              </div>
            )}

            {/* CRITICAL ALLERGY / SENSITIVITY HIGHLIGHT */}
            {customer.allergies && !isEditing && (
              <div
                data-testid="customer-allergy-alert"
                className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/50 text-amber-950 dark:text-amber-100 flex items-start gap-3 shadow-sm"
              >
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                      Client Allergy & Sensitivity Notice
                    </h4>
                    <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase">
                      Safety Warning
                    </span>
                  </div>
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-100 leading-relaxed">
                    {customer.allergies}
                  </p>
                </div>
              </div>
            )}

            {/* Metrics cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Total Visits</span>
                <span className="text-base font-black text-zinc-900 block mt-0.5">{customer.visitCount}</span>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Lifetime Spend</span>
                <span className="text-base font-black text-emerald-600 block mt-0.5">
                  {formatPesewas(customer.lifetimeSpendPesewas)}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Last Visit</span>
                <span className="text-xs font-bold text-zinc-800 block mt-1">
                  {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString("en-GB") : "Never"}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Marketing</span>
                <span className={`text-[11px] font-black block mt-1 ${customer.marketingConsent ? "text-emerald-700" : "text-zinc-500"}`}>
                  {customer.marketingConsent ? "Consented" : "Opted Out"}
                </span>
              </div>
            </div>

            {/* EDIT FORM (if editing mode active) */}
            {isEditing ? (
              <form onSubmit={handleSave} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700">Edit Customer Information</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-zinc-700">Name</Label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} required className="text-xs bg-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-zinc-700">Phone</Label>
                    <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required className="text-xs bg-white font-mono" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-zinc-700">Email Address</Label>
                  <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="text-xs bg-white" />
                </div>

                {/* Allergies field */}
                <div className="space-y-1 p-3 rounded-xl bg-amber-500/10 border border-amber-300">
                  <Label className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Allergies & Sensitivities (Staff Pre-Check)</span>
                  </Label>
                  <Input
                    value={editAllergies}
                    onChange={(e) => setEditAllergies(e.target.value)}
                    placeholder="e.g. Lash glue sensitivity (cyanoacrylate)"
                    className="text-xs bg-white mt-1"
                  />
                </div>

                {/* Preferences */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-zinc-700">Styling Preferences</Label>
                  <Input
                    value={editPreferences}
                    onChange={(e) => setEditPreferences(e.target.value)}
                    placeholder="e.g. Sensitive scalp, natural finish"
                    className="text-xs bg-white"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-zinc-700">Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add tag (VIP, BRIDAL)"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      className="text-xs bg-white"
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
                      className="text-xs cursor-pointer"
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {editTags.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black text-white text-[10px] font-bold">
                        <span>{t}</span>
                        <button type="button" onClick={() => handleRemoveTag(t)} className="cursor-pointer">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Marketing Consent */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-zinc-200">
                  <span className="text-xs font-semibold text-zinc-800">Marketing Consent</span>
                  <input
                    type="checkbox"
                    checked={editMarketingConsent}
                    onChange={(e) => setEditMarketingConsent(e.target.checked)}
                    className="w-4 h-4 rounded text-black focus:ring-black cursor-pointer"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outlinePill" size="sm" onClick={() => setIsEditing(false)} className="text-xs cursor-pointer">
                    Cancel
                  </Button>
                  <Button type="submit" variant="blackPill" size="sm" disabled={saving} className="text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? "Saving..." : "Save Changes"}</span>
                  </Button>
                </div>
              </form>
            ) : (
              /* VIEW MODE: Preferences and Tags summary */
              <div className="space-y-4">
                {/* Tags & Preferences */}
                <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Client Details</span>
                    <div className="flex gap-1">
                      {customer.tags.map((t) => (
                        <span
                          key={t}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            t === "VIP"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : t === "BRIDAL"
                              ? "bg-rose-100 text-rose-900 border border-rose-300"
                              : "bg-zinc-200 text-zinc-800"
                          }`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {customer.preferences ? (
                    <div className="text-xs text-zinc-700 bg-white p-2.5 rounded-xl border border-zinc-200">
                      <strong className="text-zinc-900">Styling Preferences:</strong> {customer.preferences}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">No styling preferences recorded yet.</p>
                  )}

                  {customer.notes && (
                    <div className="text-xs text-zinc-600 bg-white p-2.5 rounded-xl border border-zinc-200">
                      <strong className="text-zinc-900">Internal Notes:</strong> {customer.notes}
                    </div>
                  )}
                </div>

                {/* Upcoming Booking */}
                {customer.upcomingBooking && (
                  <div className="p-4 rounded-2xl bg-zinc-900 text-white space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span className="font-bold uppercase tracking-wider text-[10px]">Upcoming Appointment</span>
                      <span className="font-mono text-amber-400">{customer.upcomingBooking.reference}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <Calendar className="w-4 h-4 text-zinc-400" />
                      <span>
                        {new Date(customer.upcomingBooking.startUtc).toLocaleDateString("en-GB", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-300">
                      {customer.upcomingBooking.serviceNames.join(", ")}
                    </div>
                  </div>
                )}

                {/* Appointment History */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                    Appointment History ({customer.bookings.length})
                  </h4>
                  {customer.bookings.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
                      No appointment history on record.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {customer.bookings.map((b) => (
                        <div
                          key={b.id}
                          className="p-3 rounded-xl bg-white border border-zinc-200 text-xs flex items-center justify-between hover:bg-zinc-50 transition-colors"
                        >
                          <div>
                            <div className="font-bold text-zinc-900 flex items-center gap-2">
                              <span>{b.reference}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 font-semibold text-zinc-600">
                                {b.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-0.5">
                              {new Date(b.startUtc).toLocaleDateString("en-GB")} • {b.services.join(", ")}
                            </div>
                          </div>
                          <div className="text-right font-mono font-bold text-zinc-800">
                            {formatPesewas(b.totalPesewas)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payment Receipts History */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                    POS Receipts ({customer.receipts.length})
                  </h4>
                  {customer.receipts.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
                      No standalone POS receipts.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {customer.receipts.map((r) => (
                        <div
                          key={r.id}
                          className="p-2.5 rounded-xl bg-white border border-zinc-200 text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-mono font-bold text-zinc-900">{r.receiptNumber}</span>
                            <span className="text-[10px] text-zinc-500 ml-2">
                              {new Date(r.createdAt).toLocaleDateString("en-GB")}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-emerald-600">
                            {formatPesewas(r.totalPesewas)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Bar at bottom */}
            <div className="pt-4 border-t border-zinc-200 flex flex-wrap gap-2 justify-between">
              {isManagerOrAbove && (
                <Button
                  type="button"
                  variant="outlinePill"
                  size="sm"
                  onClick={() => setMergeModalOpen(true)}
                  className="text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <GitMerge className="w-3.5 h-3.5" />
                  <span>Merge Duplicate</span>
                </Button>
              )}

              {isOwner && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setAnonymizeModalOpen(true)}
                  className="text-xs font-bold flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-full cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Act 843 Erasure</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Merge Modal */}
      {mergeModalOpen && customer && (
        <MergeModal
          isOpen={mergeModalOpen}
          onClose={() => setMergeModalOpen(false)}
          primaryCustomer={customer}
          onMergeSuccess={() => {
            fetchCustomer(customer.id);
            onRefresh();
          }}
        />
      )}

      {/* Anonymize Modal */}
      {anonymizeModalOpen && customer && (
        <AnonymizeModal
          isOpen={anonymizeModalOpen}
          onClose={() => setAnonymizeModalOpen(false)}
          customer={customer}
          onSuccess={() => {
            fetchCustomer(customer.id);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
