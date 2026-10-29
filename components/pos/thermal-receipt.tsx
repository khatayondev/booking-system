"use client";

import * as React from "react";
import { formatPesewas } from "@/lib/money";
import { formatDateTime } from "@/lib/date";
import type { PosReceiptDetail } from "@/lib/pos/types";
import { Printer, Download, MessageSquare, Share2, Check, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequestPaymentModal } from "@/components/payment-requests/request-payment-modal";

export function ThermalReceipt({
  receipt,
  onClose,
}: {
  receipt: PosReceiptDetail;
  onClose?: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  const cleanPhone = receipt.customerPhone.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `✨ Becca's Crown Beauty Vault Receipt (${receipt.receiptNumber})\nTotal: ${formatPesewas(
      receipt.totalPesewas
    )}\nThank you for choosing Becca's Crown Beauty Vault!`
  )}`;

  const smsUrl = `sms:${receipt.customerPhone}?body=${encodeURIComponent(
    `Becca's Crown Beauty Vault Receipt ${receipt.receiptNumber}. Total: ${formatPesewas(
      receipt.totalPesewas
    )}. Thank you for your visit!`
  )}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/pos?receipt=${receipt.receiptNumber}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = () => {
    // Open print view formatted for PDF print / save
    window.print();
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4 sm:p-6 max-w-xl mx-auto">
      {/* Action Buttons Bar */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 w-full no-print">
        <Button
          onClick={handlePrint}
          className="bg-[#1E1E1E] text-white hover:bg-black font-medium flex items-center gap-2 rounded-xl text-xs py-2 px-3.5 shadow-sm"
        >
          <Printer className="w-4 h-4" />
          <span>Print (80mm Thermal)</span>
        </Button>
        <Button
          onClick={handleDownloadPdf}
          variant="outlinePill"
          className="border-[#E4E4E7] text-[#1E1E1E] hover:bg-[#F4F4F6] font-medium flex items-center gap-2 rounded-xl text-xs py-2 px-3.5"
        >
          <Download className="w-4 h-4" />
          <span>Save as PDF</span>
        </Button>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] text-white hover:bg-[#20ba59] font-medium rounded-xl text-xs py-2 px-3.5 shadow-sm transition-all"
        >
          <Share2 className="w-4 h-4" />
          <span>WhatsApp</span>
        </a>
        <a
          href={smsUrl}
          className="inline-flex items-center gap-2 bg-[#1E1E1E] text-white hover:bg-black font-medium rounded-xl text-xs py-2 px-3.5 shadow-sm transition-all"
        >
          <MessageSquare className="w-4 h-4" />
          <span>SMS</span>
        </a>
        <Button
          onClick={handleCopyLink}
          variant="outlinePill"
          className="border-[#E4E4E7] text-[#71717A] hover:bg-[#F4F4F6] font-medium flex items-center gap-1.5 rounded-xl text-xs py-2 px-3"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </Button>
        {receipt.balanceDuePesewas > 0 && receipt.bookingId && (
          <Button
            onClick={() => setPaymentModalOpen(true)}
            className="bg-emerald-700 text-white hover:bg-emerald-800 font-medium flex items-center gap-1.5 rounded-xl text-xs py-2 px-3.5 shadow-sm"
          >
            <CreditCard className="w-4 h-4" />
            <span>Request Payment</span>
          </Button>
        )}
        {onClose && (
          <Button
            onClick={onClose}
            variant="ghost"
            className="text-xs text-zinc-500 hover:text-zinc-900 rounded-xl py-2 px-3"
          >
            Done
          </Button>
        )}
      </div>

      {receipt.bookingId && (
        <RequestPaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          bookingId={receipt.bookingId}
          bookingReference={receipt.receiptNumber}
          customerName={receipt.customerName}
          customerPhone={receipt.customerPhone}
          balanceDuePesewas={receipt.balanceDuePesewas}
          onSuccess={() => {
            alert(`Payment request dispatched to ${receipt.customerPhone}!`);
          }}
        />
      )}

      {/* 80mm Thermal Receipt Layout */}
      <div
        id="thermal-receipt"
        className="w-[300px] sm:w-[320px] bg-white text-black p-5 border border-dashed border-[#D4D4D8] rounded-2xl shadow-md font-mono text-xs leading-relaxed"
      >
        {/* Studio Header */}
        <div className="text-center space-y-1 mb-3">
          <h2 className="text-sm font-bold tracking-wider uppercase">BECCA&apos;S CROWN BEAUTY VAULT</h2>
          <p className="text-[11px] text-[#52525B]">East Legon, Senchi Street</p>
          <p className="text-[11px] text-[#52525B]">Accra, Ghana • +233 24 111 9988</p>
          <p className="text-[10px] text-[#71717A]">TIN: C0029482910</p>
        </div>

        <div className="border-t border-dashed border-zinc-400 my-2" />

        {/* Receipt Metadata */}
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-[#71717A]">Receipt:</span>
            <span className="font-bold">{receipt.receiptNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#71717A]">Date:</span>
            <span>{formatDateTime(receipt.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#71717A]">Customer:</span>
            <span className="font-medium truncate max-w-[170px]">{receipt.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#71717A]">Phone:</span>
            <span>{receipt.customerPhone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#71717A]">Cashier:</span>
            <span>{receipt.cashierName}</span>
          </div>
          {receipt.bookingReference && (
            <div className="flex justify-between">
              <span className="text-[#71717A]">Booking Ref:</span>
              <span className="font-semibold">{receipt.bookingReference}</span>
            </div>
          )}
          {receipt.status === "VOIDED" && (
            <div className="bg-red-50 text-red-700 p-1.5 rounded text-center font-bold my-1 border border-red-200">
              *** VOIDED SALE ***
              {receipt.voidReason && (
                <div className="text-[10px] font-normal mt-0.5">Reason: {receipt.voidReason}</div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-zinc-400 my-2" />

        {/* Line Items Table */}
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between font-bold text-[10px] text-[#71717A] uppercase pb-1 border-b border-zinc-200">
            <span>Description</span>
            <span>Price</span>
          </div>
          {receipt.items.map((item, idx) => (
            <div key={idx} className="space-y-0.5">
              <div className="flex justify-between items-start">
                <span className="font-medium text-zinc-900">{item.serviceName}</span>
                <span className="shrink-0">{formatPesewas(item.pricePesewas)}</span>
              </div>
              {item.addOns &&
                item.addOns.map((addon, aIdx) => (
                  <div key={aIdx} className="flex justify-between text-[10px] text-zinc-600 pl-2">
                    <span>+ {addon.name}</span>
                    <span>{formatPesewas(addon.pricePesewas)}</span>
                  </div>
                ))}
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-zinc-400 my-2" />

        {/* Financial Totals */}
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-[#71717A]">Subtotal:</span>
            <span>{formatPesewas(receipt.subtotalPesewas)}</span>
          </div>
          {receipt.discountPesewas > 0 && (
            <div className="flex justify-between text-zinc-800">
              <span>
                Discount
                {receipt.discountPercent ? ` (${receipt.discountPercent}%)` : ""}
                {receipt.discountReason ? ` [${receipt.discountReason}]` : ""}:
              </span>
              <span className="font-medium">-{formatPesewas(receipt.discountPesewas)}</span>
            </div>
          )}
          {receipt.tipPesewas > 0 && (
            <div className="flex justify-between">
              <span className="text-[#71717A]">Staff Tip:</span>
              <span>{formatPesewas(receipt.tipPesewas)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold border-t border-zinc-800 pt-1 mt-1">
            <span>TOTAL:</span>
            <span>{formatPesewas(receipt.totalPesewas)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-zinc-400 my-2" />

        {/* Payment Methods Breakdown */}
        <div className="space-y-1 text-[11px]">
          <div className="font-bold text-[10px] text-[#71717A] uppercase mb-1">
            Payment Breakdown
          </div>
          {receipt.payments.map((p, idx) => (
            <div key={idx} className="space-y-0.5">
              <div className="flex justify-between">
                <span>
                  {p.method}
                  {p.provider ? ` (${p.provider})` : ""}
                </span>
                <span className="font-medium">{formatPesewas(p.amountPesewas)}</span>
              </div>
              {p.reference && (
                <div className="text-[10px] text-[#71717A] pl-2">Ref: {p.reference}</div>
              )}
              {p.method === "CASH" && (
                <div className="text-[10px] text-[#52525B] pl-2">
                  Tendered: {formatPesewas(p.tenderedPesewas || p.amountPesewas)} | Change:{" "}
                  {formatPesewas(p.changePesewas || 0)}
                </div>
              )}
            </div>
          ))}

          <div className="border-t border-zinc-200 pt-1 mt-1 flex justify-between font-semibold">
            <span>Total Paid:</span>
            <span>{formatPesewas(receipt.amountPaidPesewas)}</span>
          </div>

          {receipt.balanceDuePesewas > 0 ? (
            <div className="flex justify-between text-amber-700 font-bold bg-amber-50 p-1 rounded mt-1">
              <span>Balance Due:</span>
              <span>{formatPesewas(receipt.balanceDuePesewas)}</span>
            </div>
          ) : (
            <div className="text-center font-bold text-emerald-700 mt-1">
              ✓ PAID IN FULL
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-zinc-400 my-3" />

        {/* Studio Footer */}
        <div className="text-center space-y-1 text-[10px] text-[#71717A]">
          <p className="font-semibold text-zinc-800">Thank you for visiting Becca&apos;s Crown Beauty Vault!</p>
          <p>All services subject to salon care & refund policies.</p>
          <p>Instagram: @beccascrown • www.beccascrown.gh</p>
        </div>
      </div>
    </div>
  );
}
