"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/dialog-and-drawer";
import { CustomerPicker, type SelectedCustomer } from "@/components/pos/customer-picker";
import { ServicePicker, type PosCatalogService } from "@/components/pos/service-picker";
import { CartSummary } from "@/components/pos/cart-summary";
import { DiscountModal, type DiscountState } from "@/components/pos/discount-modal";
import { CheckoutModal } from "@/components/pos/checkout-modal";
import { ThermalReceipt } from "@/components/pos/thermal-receipt";
import { VoidModal } from "@/components/pos/void-modal";
import { EndOfDayModal } from "@/components/pos/end-of-day-modal";
import type { PosItemInput, PosReceiptDetail } from "@/lib/pos/types";
import {
  Ban,
  BarChart3,
  RotateCcw,
} from "lucide-react";

interface ApiAddon {
  id: string;
  name: string;
  pricePesewas: number;
  durationMin: number;
}

interface ApiService {
  id: string;
  name: string;
  active: boolean;
  pricePesewas: number;
  durationMin: number;
  addons?: ApiAddon[];
}

interface ApiCategory {
  id: string;
  name: string;
  services?: ApiService[];
}

interface ApiStaff {
  id: string;
  name: string;
}

function PosContent() {
  // Catalog & user role state
  const [services, setServices] = React.useState<PosCatalogService[]>([]);
  const [categories, setCategories] = React.useState<Array<{ id: string; name: string }>>([]);
  const [staffList, setStaffList] = React.useState<Array<{ id: string; name: string }>>([]);
  const [userRole, setUserRole] = React.useState<string>("STAFF_RECEPTIONIST");
  const [isLoading, setIsLoading] = React.useState(true);

  // Cart & checkout state
  const [selectedCustomer, setSelectedCustomer] = React.useState<SelectedCustomer | null>(null);
  const [cartItems, setCartItems] = React.useState<PosItemInput[]>([]);
  const [selectedStaffId, setSelectedStaffId] = React.useState<string>("");
  const [isWalkIn, setIsWalkIn] = React.useState<boolean>(true);
  const [scheduledTime, setScheduledTime] = React.useState<string>("");
  const [discount, setDiscount] = React.useState<DiscountState>({
    type: "NONE",
    calculatedDiscountPesewas: 0,
  });

  // Modals state
  const [discountModalOpen, setDiscountModalOpen] = React.useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = React.useState(false);
  const [voidModalOpen, setVoidModalOpen] = React.useState(false);
  const [endOfDayModalOpen, setEndOfDayModalOpen] = React.useState(false);
  const [completedReceipt, setCompletedReceipt] = React.useState<PosReceiptDetail | null>(null);

  // Fetch catalog & staff
  React.useEffect(() => {
    let ignore = false;
    const loadCatalog = async () => {
      try {
        const res = await fetch("/api/admin/catalog");
        if (res.ok && !ignore) {
          const json = await res.json();
          const cats: ApiCategory[] = json.data.categories || [];
          const staff: ApiStaff[] = json.data.staffMembers || [];
          setUserRole(json.data.userRole || "STAFF_RECEPTIONIST");

          setCategories(cats.map((c) => ({ id: c.id, name: c.name })));
          setStaffList(staff.map((s) => ({ id: s.id, name: s.name })));
          if (staff.length > 0 && !selectedStaffId) {
            setSelectedStaffId(staff[0].id);
          }

          // Flatten active services
          const flatServices: PosCatalogService[] = [];
          for (const c of cats) {
            for (const s of c.services || []) {
              if (s.active) {
                flatServices.push({
                  id: s.id,
                  name: s.name,
                  pricePesewas: s.pricePesewas,
                  durationMin: s.durationMin,
                  categoryId: c.id,
                  categoryName: c.name,
                  addons: (s.addons || []).map((a) => ({
                    id: a.id,
                    name: a.name,
                    pricePesewas: a.pricePesewas,
                    durationMin: a.durationMin,
                  })),
                });
              }
            }
          }
          setServices(flatServices);
        }
      } catch (err) {
        console.error("Failed to load POS catalog", err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    loadCatalog();
    return () => {
      ignore = true;
    };
  }, [selectedStaffId]);

  // Handle adding service item to cart
  const handleAddToCart = (item: PosItemInput) => {
    setCartItems((prev) => [...prev, item]);
  };

  const handleRemoveItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setDiscount({ type: "NONE", calculatedDiscountPesewas: 0 });
  };

  const handleResetSale = () => {
    handleClearCart();
    setSelectedCustomer(null);
    setIsWalkIn(true);
    setScheduledTime("");
    setCompletedReceipt(null);
  };

  // Subtotal calculation
  let subtotalPesewas = 0;
  for (const item of cartItems) {
    let itemTotal = item.pricePesewas;
    for (const addon of item.addOns || []) {
      itemTotal += addon.pricePesewas;
    }
    subtotalPesewas += itemTotal;
  }

  // Discount calculation
  let discountPesewas = 0;
  if (discount.type === "PERCENT" && discount.percent) {
    discountPesewas = Math.round((subtotalPesewas * discount.percent) / 100);
  } else if (discount.type === "PROMO") {
    discountPesewas = discount.calculatedDiscountPesewas || 0;
  }

  const netPayablePesewas = Math.max(0, subtotalPesewas - discountPesewas);

  // Prepare checkout payload
  const checkoutPayload = {
    customerId: selectedCustomer?.id,
    customer: selectedCustomer
      ? {
          name: selectedCustomer.name,
          phone: selectedCustomer.phone,
          email: selectedCustomer.email,
          notes: selectedCustomer.notes,
        }
      : undefined,
    staffId: selectedStaffId || undefined,
    isWalkIn,
    scheduledStartUtc: !isWalkIn && scheduledTime ? new Date(scheduledTime).toISOString() : undefined,
    items: cartItems,
    discountPercent: discount.type === "PERCENT" ? discount.percent : undefined,
    discountPesewas: discountPesewas > 0 ? discountPesewas : undefined,
    discountReason: discount.reason,
    promoCode: discount.type === "PROMO" ? discount.promoCode : undefined,
  };

  return (
    <AppShell activePath="/pos">
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Point of Sale (POS)
              </h1>
              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Live Register
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Fast in-store checkout, walk-ins, split tenders, and instant sequential receipts (R-000123).
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(userRole === "OWNER_ADMIN" || userRole === "MANAGER") && (
              <Button
                type="button"
                variant="outlinePill"
                onClick={() => setEndOfDayModalOpen(true)}
                className="h-9 px-3 text-xs font-semibold rounded-xl border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 shadow-xs"
              >
                <BarChart3 className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
                <span>End-of-Day Summary</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outlinePill"
              onClick={() => setVoidModalOpen(true)}
              className="h-9 px-3 text-xs font-semibold rounded-xl border-zinc-200 dark:border-zinc-800 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-1.5 shadow-xs"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Void Sale</span>
            </Button>

            <Button
              type="button"
              variant="outlinePill"
              onClick={handleResetSale}
              className="h-9 px-3 text-xs font-semibold rounded-xl border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
              <span>New Sale</span>
            </Button>
          </div>
        </div>

        {/* Main POS Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (Catalog & Customer) - 7 cols */}
          <div className="lg:col-span-7 space-y-5">
            {/* Customer Picker */}
            <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs space-y-2">
              <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Customer Information
              </Label>
              <CustomerPicker
                selectedCustomer={selectedCustomer}
                onSelectCustomer={setSelectedCustomer}
                onClearCustomer={() => setSelectedCustomer(null)}
              />
            </div>

            {/* Service & Addon Catalog */}
            <div className="p-4 sm:p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-sm text-zinc-900 dark:text-white uppercase tracking-wider">
                    Treatment & Service Catalog
                  </h2>
                  <p className="text-[11px] text-zinc-500">
                    Tap to add services and customize with extra time and add-ons.
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="p-12 text-center text-xs text-zinc-400">
                  Loading studio treatments and pricing...
                </div>
              ) : (
                <ServicePicker
                  services={services}
                  categories={categories}
                  onAddToCart={handleAddToCart}
                />
              )}
            </div>
          </div>

          {/* Right Column (Cart & Checkout) - 5 cols */}
          <div className="lg:col-span-5 sticky top-6">
            <CartSummary
              items={cartItems}
              staffList={staffList}
              selectedStaffId={selectedStaffId}
              onSelectStaff={setSelectedStaffId}
              isWalkIn={isWalkIn}
              onToggleWalkIn={setIsWalkIn}
              scheduledTime={scheduledTime}
              onChangeScheduledTime={setScheduledTime}
              discount={discount}
              onOpenDiscountModal={() => setDiscountModalOpen(true)}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              onProceedToCheckout={() => setCheckoutModalOpen(true)}
            />
          </div>
        </div>

        {/* Discount Modal */}
        <DiscountModal
          isOpen={discountModalOpen}
          onClose={() => setDiscountModalOpen(false)}
          subtotalPesewas={subtotalPesewas}
          userRole={userRole}
          currentDiscount={discount}
          onApplyDiscount={setDiscount}
          onRemoveDiscount={() => setDiscount({ type: "NONE", calculatedDiscountPesewas: 0 })}
        />

        {/* Checkout & Split Tender Modal */}
        <CheckoutModal
          isOpen={checkoutModalOpen}
          onClose={() => setCheckoutModalOpen(false)}
          checkoutPayload={checkoutPayload}
          totalPesewas={netPayablePesewas}
          onSuccess={(receipt) => {
            setCompletedReceipt(receipt);
            handleClearCart();
          }}
        />

        {/* Void Sale Modal */}
        <VoidModal
          isOpen={voidModalOpen}
          onClose={() => setVoidModalOpen(false)}
          userRole={userRole}
          onReceiptVoided={(voidedReceipt) => {
            setCompletedReceipt(voidedReceipt);
          }}
        />

        {/* End of Day Reconciliation Modal */}
        <EndOfDayModal
          isOpen={endOfDayModalOpen}
          onClose={() => setEndOfDayModalOpen(false)}
          userRole={userRole}
        />

        {/* Completed Receipt Viewer & Thermal Print Modal */}
        {completedReceipt && (
          <Dialog
            isOpen={!!completedReceipt}
            onClose={() => setCompletedReceipt(null)}
            title={`Receipt #${completedReceipt.receiptNumber}`}
            description="Official receipt generated with sequential gapless number. Print 80mm thermal receipt or share via SMS / WhatsApp."
          >
            <ThermalReceipt
              receipt={completedReceipt}
              onClose={() => setCompletedReceipt(null)}
            />
          </Dialog>
        )}
      </div>
    </AppShell>
  );
}

export default function PosPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-zinc-400">Loading POS...</div>}>
      <PosContent />
    </React.Suspense>
  );
}
