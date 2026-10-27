"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/controls";
import { Card } from "@/components/ui/card";
import { estimateSms, renderTemplate } from "@/lib/notifications/utils";
import {
  MessageSquare,
  Mail,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  RefreshCw,
} from "lucide-react";

interface TemplateItem {
  id: string;
  slug: string;
  name: string;
  channel: "SMS" | "EMAIL";
  event: string;
  subject?: string | null;
  template: string;
  variables: string[];
  active: boolean;
  description?: string | null;
}

const AVAILABLE_VARIABLES = [
  { tag: "{{name}}", label: "Customer Name" },
  { tag: "{{service}}", label: "Service Name" },
  { tag: "{{date}}", label: "Appointment Date" },
  { tag: "{{time}}", label: "Start Time" },
  { tag: "{{reference}}", label: "Booking Ref" },
  { tag: "{{manageLink}}", label: "Management URL" },
  { tag: "{{amountDue}}", label: "Amount Due" },
  { tag: "{{amountPaid}}", label: "Amount Paid" },
  { tag: "{{refundAmount}}", label: "Refund Amount" },
  { tag: "{{staffName}}", label: "Assigned Staff" },
];

const SAMPLE_VARS = {
  name: "Ama Pokuaa",
  service: "Bridal Soft Glam",
  date: "14 Nov 2026",
  time: "10:00 AM",
  reference: "AURA-2026-884",
  manageLink: "https://aurastudio.com/manage/AURA-2026-884",
  amountDue: "GH₵ 150.00",
  amountPaid: "GH₵ 300.00",
  refundAmount: "GH₵ 300.00",
  businessName: "Aura Beauty Studio",
  staffName: "Jessica Kyei",
};

export function NotificationTemplateEditor({ isManagerOrAbove }: { isManagerOrAbove: boolean }) {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [activeChannel, setActiveChannel] = useState<"SMS" | "EMAIL">("SMS");
  const [editedBody, setEditedBody] = useState("");
  const [editedSubject, setEditedSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications/templates");
      if (res.ok) {
        const json = await res.json();
        const list: TemplateItem[] = json.data?.templates || [];
        setTemplates(list);
        if (list.length > 0 && !selectedTemplate) {
          const first = list.find((t) => t.channel === activeChannel) || list[0];
          setSelectedTemplate(first);
          setEditedBody(first.template);
          setEditedSubject(first.subject || "");
        }
      }
    } catch {
      setMessage({ type: "error", text: "Failed to load notification templates" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    fetch("/api/admin/notifications/templates")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!ignore && json?.data?.templates) {
          const list: TemplateItem[] = json.data.templates;
          setTemplates(list);
          const first = list.find((t) => t.channel === activeChannel) || list[0];
          if (first) {
            setSelectedTemplate(first);
            setEditedBody(first.template);
            setEditedSubject(first.subject || "");
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setMessage({ type: "error", text: "Failed to load notification templates" });
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [activeChannel]);

  const handleSelectTemplate = (tmpl: TemplateItem) => {
    setSelectedTemplate(tmpl);
    setEditedBody(tmpl.template);
    setEditedSubject(tmpl.subject || "");
    setMessage(null);
  };

  const handleInsertVariable = (varTag: string) => {
    if (!isManagerOrAbove) return;
    setEditedBody((prev) => prev + " " + varTag);
  };

  const handleSave = async () => {
    if (!selectedTemplate || !isManagerOrAbove) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/notifications/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTemplate.id,
          template: editedBody,
          subject: selectedTemplate.channel === "EMAIL" ? editedSubject : undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || "Failed to save template");
      }

      setMessage({ type: "success", text: "Template saved successfully" });
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === selectedTemplate.id
            ? { ...t, template: editedBody, subject: editedSubject }
            : t
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving template";
      setMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  // SMS Estimation
  const smsStats = selectedTemplate?.channel === "SMS" ? estimateSms(editedBody) : null;
  const previewText = renderTemplate(editedBody, SAMPLE_VARS);
  const previewSubject = selectedTemplate?.channel === "EMAIL" ? renderTemplate(editedSubject, SAMPLE_VARS) : null;

  const filteredTemplates = templates.filter((t) => t.channel === activeChannel);

  return (
    <Card variant="white" className="p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F4F4F6] pb-4">
        <div>
          <h3 className="text-base font-bold text-[#1E1E1E]">Notification Message Templates</h3>
          <p className="text-xs text-[#71717A] mt-0.5">
            Manager-editable message content with dynamic variables and real-time SMS cost estimation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-[#F4F4F6] p-1 rounded-full border border-[#E4E4E7]">
            <button
              type="button"
              onClick={() => {
                setActiveChannel("SMS");
                const first = templates.find((t) => t.channel === "SMS");
                if (first) handleSelectTemplate(first);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeChannel === "SMS"
                  ? "bg-white text-[#1E1E1E] shadow-xs"
                  : "text-[#71717A] hover:text-[#1E1E1E]"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>SMS ({templates.filter((t) => t.channel === "SMS").length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveChannel("EMAIL");
                const first = templates.find((t) => t.channel === "EMAIL");
                if (first) handleSelectTemplate(first);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeChannel === "EMAIL"
                  ? "bg-white text-[#1E1E1E] shadow-xs"
                  : "text-[#71717A] hover:text-[#1E1E1E]"
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email ({templates.filter((t) => t.channel === "EMAIL").length})</span>
            </button>
          </div>

          <Button
            type="button"
            variant="outlinePill"
            size="sm"
            onClick={fetchTemplates}
            disabled={loading}
            className="cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-red-50 text-red-900 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Template Selector Column */}
        <div className="lg:col-span-4 space-y-2 max-h-[500px] overflow-y-auto pr-1">
          <Label className="text-xs text-[#71717A]">Event Templates</Label>
          {filteredTemplates.map((tmpl) => (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => handleSelectTemplate(tmpl)}
              className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                selectedTemplate?.id === tmpl.id
                  ? "border-[#1E1E1E] bg-[#FAFAFB] shadow-xs"
                  : "border-[#E4E4E7] bg-white hover:border-[#A1A1AA]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1E1E1E]">{tmpl.name}</span>
                <span className="text-[10px] font-mono text-[#71717A] uppercase px-1.5 py-0.5 rounded-md bg-[#F4F4F6]">
                  {tmpl.channel}
                </span>
              </div>
              <p className="text-[11px] text-[#71717A] mt-1 line-clamp-1">{tmpl.description || tmpl.template}</p>
            </button>
          ))}
        </div>

        {/* Editor & Preview Column */}
        <div className="lg:col-span-8 space-y-5">
          {selectedTemplate ? (
            <>
              {selectedTemplate.channel === "EMAIL" && (
                <div>
                  <Label>Email Subject Line</Label>
                  <Input
                    disabled={!isManagerOrAbove}
                    value={editedSubject}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedSubject(e.target.value)}
                    placeholder="Subject line with {{variables}}"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="mb-0">Message Template Body</Label>
                  {selectedTemplate.channel === "SMS" && smsStats && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <span
                        className={`px-2 py-0.5 rounded-md font-mono font-bold ${
                          smsStats.encoding === "GSM-7"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {smsStats.encoding}
                      </span>
                      <span className="text-[#71717A]">
                        {smsStats.characterCount} chars • {smsStats.segmentCount} segment(s) • Est. {smsStats.costEstimatePesewas} pesewas
                      </span>
                    </div>
                  )}
                </div>

                <textarea
                  disabled={!isManagerOrAbove}
                  rows={4}
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  className="w-full rounded-2xl border border-[#E4E4E7] p-3.5 text-xs text-[#1E1E1E] focus:outline-none focus:border-[#1E1E1E] transition-colors resize-y font-mono"
                  placeholder="Enter message template text with {{variable}} placeholders..."
                />
              </div>

              {/* Dynamic Variables Chips */}
              <div>
                <Label className="text-[11px] text-[#71717A] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Insert Variable (Click to add):</span>
                </Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {AVAILABLE_VARIABLES.map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      disabled={!isManagerOrAbove}
                      onClick={() => handleInsertVariable(v.tag)}
                      className="px-2.5 py-1 rounded-lg bg-[#F4F4F6] hover:bg-[#E4E4E7] text-[#1E1E1E] text-[11px] font-mono font-medium transition-colors border border-[#E4E4E7] cursor-pointer"
                    >
                      {v.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-4 rounded-2xl bg-[#FBFBFC] border border-[#E4E4E7] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#1E1E1E] flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-[#71717A]" />
                    <span>Live Client Preview</span>
                  </span>
                  <span className="text-[10px] text-[#71717A]">Simulated with Ghana sample data</span>
                </div>

                {previewSubject && (
                  <div className="text-xs font-bold text-[#1E1E1E] pb-1 border-b border-[#E4E4E7]">
                    Subject: {previewSubject}
                  </div>
                )}

                <div
                  className="text-xs text-[#3F3F46] leading-relaxed break-words whitespace-pre-wrap font-sans"
                  dangerouslySetInnerHTML={{ __html: previewText }}
                />
              </div>

              {/* Save Bar */}
              {isManagerOrAbove ? (
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="blackPill"
                    size="md"
                    onClick={handleSave}
                    disabled={saving}
                    className="gap-2 cursor-pointer shadow-md"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? "Saving..." : "Save Template"}</span>
                  </Button>
                </div>
              ) : (
                <p className="text-[11px] text-[#71717A] italic text-right">
                  Manager or Owner role required to modify notification templates.
                </p>
              )}
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-[#71717A]">
              Select a template from the list to edit and preview.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
