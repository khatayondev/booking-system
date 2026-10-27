"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Users,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  CreditCard,
  CheckCircle2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/controls";
import { formatPesewas } from "@/lib/money";

function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

interface ServiceAddon {
  id: string;
  name: string;
  durationMin: number;
  pricePesewas: number;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  durationMin: number;
  bufferMin: number;
  pricePesewas: number;
  depositType: string;
  depositValue: number;
  imageUrl?: string;
  addons: ServiceAddon[];
  staffServices: Array<{ staff: { id: string; name: string } }>;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  services: Service[];
}

interface StaffMember {
  id: string;
  name: string;
  bio?: string;
  photoUrl?: string;
  specialties: string[];
}

interface AvailabilitySlot {
  startUtc: string;
  endUtc: string;
  staffId: string;
  staffName: string;
}

interface SlotHoldData {
  token: string;
  expiresAt: string;
  extendedCount: number;
}

interface BookingResultData {
  bookingId: string;
  reference: string;
  manageToken: string;
  status: string;
  subtotalPesewas: number;
  totalPesewas: number;
  depositRequiredPesewas: number;
  amountToPayPesewas: number;
  paymentType: "DEPOSIT" | "FULL";
  customer: {
    name: string;
    phone: string;
    email?: string | null;
  };
}

const STORAGE_KEY = "aura_booking_wizard_state";

function BookingWizardContent() {
  const searchParams = useSearchParams();
  const initialServiceId = searchParams.get("serviceId");

  // Catalog State
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [allStaff, setAllStaff] = React.useState<StaffMember[]>([]);
  const [catalogLoading, setCatalogLoading] = React.useState(true);
  const [catalogError, setCatalogError] = React.useState<string | null>(null);

  // Wizard Step (1 to 5)
  const [step, setStep] = React.useState<1 | 2 | 3 | 4 | 5>(1);

  // Selection States
  const [selectedServiceIds, setSelectedServiceIds] = React.useState<string[]>([]);
  const [selectedAddonIds, setSelectedAddonIds] = React.useState<string[]>([]);
  const [selectedStaffId, setSelectedStaffId] = React.useState<string>("any");
  const [selectedDate, setSelectedDate] = React.useState<string>(getTomorrowDate);
  const [selectedSlot, setSelectedSlot] = React.useState<AvailabilitySlot | null>(null);

  // Availability Slots Fetching
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [slotsError, setSlotsError] = React.useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = React.useState<AvailabilitySlot[]>([]);

  // Customer Details (No Account)
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [customerEmail, setCustomerEmail] = React.useState("");
  const [customerNotes, setCustomerNotes] = React.useState("");
  const [phoneError, setPhoneError] = React.useState<string | null>(null);

  // Hold State
  const [hold, setHold] = React.useState<SlotHoldData | null>(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = React.useState<number | null>(null);
  const [holdExpired, setHoldExpired] = React.useState(false);
  const [extendingHold, setExtendingHold] = React.useState(false);

  // Review & Payment
  const [paymentType, setPaymentType] = React.useState<"DEPOSIT" | "FULL">("DEPOSIT");
  const [policyAgreed, setPolicyAgreed] = React.useState(false);
  const [submittingBooking, setSubmittingBooking] = React.useState(false);
  const [bookingResult, setBookingResult] = React.useState<BookingResultData | null>(null);
  const [bookingError, setBookingError] = React.useState<string | null>(null);

  // 1. Fetch Catalog on Mount
  React.useEffect(() => {
    async function loadCatalog() {
      try {
        setCatalogLoading(true);
        const res = await fetch("/api/catalog");
        const json = await res.json();
        if (json.success && json.data) {
          setCategories(json.data.categories || []);
          setAllStaff(json.data.staffMembers || []);

          // Restore saved state from localStorage
          const savedStr = localStorage.getItem(STORAGE_KEY);
          if (savedStr) {
            try {
              const saved = JSON.parse(savedStr);
              if (saved.selectedServiceIds?.length) {
                setSelectedServiceIds(saved.selectedServiceIds);
              }
              if (saved.selectedAddonIds) setSelectedAddonIds(saved.selectedAddonIds);
              if (saved.selectedStaffId) setSelectedStaffId(saved.selectedStaffId);
              if (saved.selectedDate) setSelectedDate(saved.selectedDate);
              if (saved.selectedSlot) setSelectedSlot(saved.selectedSlot);
              if (saved.customerName) setCustomerName(saved.customerName);
              if (saved.customerPhone) setCustomerPhone(saved.customerPhone);
              if (saved.customerEmail) setCustomerEmail(saved.customerEmail);
              if (saved.customerNotes) setCustomerNotes(saved.customerNotes);
              if (saved.step && saved.step >= 1 && saved.step <= 5) setStep(saved.step);

              // Check hold validity
              if (saved.hold?.expiresAt) {
                const expires = new Date(saved.hold.expiresAt).getTime();
                const now = Date.now();
                if (expires > now) {
                  setHold(saved.hold);
                  setHoldSecondsLeft(Math.floor((expires - now) / 1000));
                } else {
                  // Expired hold in localStorage
                  setHoldExpired(true);
                }
              }
            } catch (e) {
              console.warn("Could not parse saved booking state", e);
            }
          } else if (initialServiceId) {
            setSelectedServiceIds([initialServiceId]);
          }
        } else {
          setCatalogError(json.error?.message || "Failed to load studio catalogue");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Network error loading catalogue";
        setCatalogError(msg);
      } finally {
        setCatalogLoading(false);
      }
    }

    loadCatalog();
  }, [initialServiceId]);

  // 2. Persist State to LocalStorage on changes
  React.useEffect(() => {
    if (bookingResult) {
      // Clear persistence once booking is successfully confirmed
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const stateToSave = {
      step,
      selectedServiceIds,
      selectedAddonIds,
      selectedStaffId,
      selectedDate,
      selectedSlot,
      customerName,
      customerPhone,
      customerEmail,
      customerNotes,
      hold,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch {
      // quota or private browsing
    }
  }, [
    step,
    selectedServiceIds,
    selectedAddonIds,
    selectedStaffId,
    selectedDate,
    selectedSlot,
    customerName,
    customerPhone,
    customerEmail,
    customerNotes,
    hold,
    bookingResult,
  ]);

  // 3. Hold Countdown Timer
  React.useEffect(() => {
    if (!hold || !hold.expiresAt) return;

    const timer = setInterval(() => {
      const diff = Math.floor((new Date(hold.expiresAt).getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        setHoldSecondsLeft(0);
        setHoldExpired(true);
        clearInterval(timer);
      } else {
        setHoldSecondsLeft(diff);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [hold]);

  // Fetch Slots when Date, Services, or Staff changes on Step 3
  React.useEffect(() => {
    if (step !== 3 || selectedServiceIds.length === 0 || !selectedDate) return;
    let cancelled = false;

    const params = new URLSearchParams();
    selectedServiceIds.forEach((id) => params.append("serviceIds", id));
    selectedAddonIds.forEach((id) => params.append("addonIds", id));
    params.set("startDate", selectedDate);
    params.set("endDate", selectedDate);
    if (selectedStaffId && selectedStaffId !== "any") {
      params.set("staffId", selectedStaffId);
    }

    fetch(`/api/availability?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          if (json.success && json.data) {
            setAvailableSlots(json.data.slots || []);
          } else {
            setSlotsError(json.error?.message || "Could not fetch slots");
          }
          setSlotsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Failed to connect to availability service";
          setSlotsError(msg);
          setSlotsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [step, selectedServiceIds, selectedAddonIds, selectedDate, selectedStaffId]);

  // All selected services objects
  const allServicesList = React.useMemo(() => {
    const list: Service[] = [];
    categories.forEach((c) => {
      c.services.forEach((s) => list.push(s));
    });
    return list;
  }, [categories]);

  const selectedServices = React.useMemo(() => {
    return allServicesList.filter((s) => selectedServiceIds.includes(s.id));
  }, [allServicesList, selectedServiceIds]);

  // All selected addons objects
  const selectedAddons = React.useMemo(() => {
    const addons: ServiceAddon[] = [];
    selectedServices.forEach((s) => {
      s.addons?.forEach((a) => {
        if (selectedAddonIds.includes(a.id)) {
          addons.push(a);
        }
      });
    });
    return addons;
  }, [selectedServices, selectedAddonIds]);

  // Totals in Pesewas
  const subtotalPesewas = React.useMemo(() => {
    const svcSum = selectedServices.reduce((acc, s) => acc + s.pricePesewas, 0);
    const addonSum = selectedAddons.reduce((acc, a) => acc + a.pricePesewas, 0);
    return svcSum + addonSum;
  }, [selectedServices, selectedAddons]);

  const totalDurationMin = React.useMemo(() => {
    const svcDur = selectedServices.reduce((acc, s) => acc + s.durationMin + s.bufferMin, 0);
    const addonDur = selectedAddons.reduce((acc, a) => acc + a.durationMin, 0);
    return svcDur + addonDur;
  }, [selectedServices, selectedAddons]);

  // Deposit calculation (e.g. 50% default)
  const depositPesewas = React.useMemo(() => {
    return Math.round(subtotalPesewas * 0.5);
  }, [subtotalPesewas]);

  // Phone validation helper
  const validatePhone = (phone: string) => {
    const clean = phone.replace(/[\s\-()]/g, "");
    if (!clean) {
      setPhoneError("Ghana phone number is required");
      return false;
    }
    const digits = clean.replace(/\D/g, "");
    if (clean.startsWith("+")) {
      if (!digits.startsWith("233") || digits.length !== 12) {
        setPhoneError("Must be +233 followed by 9 digits (e.g. +233241234567)");
        return false;
      }
    } else if (digits.startsWith("233") && digits.length === 12) {
      // valid
    } else if (digits.startsWith("0") && digits.length === 10) {
      // valid local 10-digit
    } else if (digits.length === 9) {
      // valid 9-digit
    } else {
      setPhoneError("Provide a 10-digit Ghana number (e.g. 0241234567) or +233 format");
      return false;
    }

    setPhoneError(null);
    return true;
  };

  // Create or refresh slot hold
  const createHoldForSlot = async (slot: AvailabilitySlot) => {
    try {
      const res = await fetch("/api/availability/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceIds: selectedServiceIds,
          addonIds: selectedAddonIds,
          staffId: slot.staffId,
          startUtc: slot.startUtc,
          endUtc: slot.endUtc,
          holdDurationMin: 10,
          customerPhone: customerPhone || undefined,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setHold({
          token: json.data.token,
          expiresAt: json.data.expiresAt,
          extendedCount: 0,
        });
        setHoldExpired(false);
        const sec = Math.floor(
          (new Date(json.data.expiresAt).getTime() - Date.now()) / 1000
        );
        setHoldSecondsLeft(sec > 0 ? sec : 600);
      } else {
        console.warn("Slot hold creation failed:", json.error?.message);
      }
    } catch (e) {
      console.error("Hold request error", e);
    }
  };

  // Extend slot hold (+5 min)
  const handleExtendHold = async () => {
    if (!hold?.token) return;
    try {
      setExtendingHold(true);
      const res = await fetch("/api/availability/hold/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: hold.token,
          additionalMinutes: 5,
        }),
      });
      const json = await res.json();
      if (json.success && json.data?.hold) {
        setHold({
          token: json.data.hold.token,
          expiresAt: json.data.hold.expiresAt,
          extendedCount: json.data.hold.extendedCount || 1,
        });
        setHoldExpired(false);
        const sec = Math.floor(
          (new Date(json.data.hold.expiresAt).getTime() - Date.now()) / 1000
        );
        setHoldSecondsLeft(sec);
      } else {
        alert(json.error?.message || "Could not extend hold");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to extend hold";
      alert(msg);
    } finally {
      setExtendingHold(false);
    }
  };

  // Submit Final Booking
  const handleFinalSubmit = async () => {
    if (!selectedSlot || selectedServiceIds.length === 0) return;
    if (!customerName || !customerPhone) {
      setStep(4);
      return;
    }
    if (!policyAgreed) {
      setBookingError("Please accept the cancellation policy to proceed.");
      return;
    }

    try {
      setSubmittingBooking(true);
      setBookingError(null);

      const res = await fetch("/api/bookings/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceIds: selectedServiceIds,
          addonIds: selectedAddonIds,
          staffId: selectedSlot.staffId,
          startUtc: selectedSlot.startUtc,
          endUtc: selectedSlot.endUtc,
          holdToken: hold?.token,
          customer: {
            name: customerName,
            phone: customerPhone,
            email: customerEmail || undefined,
            notes: customerNotes || undefined,
          },
          paymentType,
          policyAgreed: true,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        // Clear wizard state from localStorage
        localStorage.removeItem(STORAGE_KEY);

        // Initiate Paystack Payment Session
        try {
          const payRes = await fetch("/api/payments/initialize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookingId: json.data.bookingId,
              paymentType,
            }),
          });
          const payJson = await payRes.json();
          if (payJson.success && payJson.data?.authorizationUrl) {
            window.location.href = payJson.data.authorizationUrl;
            return;
          }
        } catch (payErr) {
          console.warn("Paystack initialize redirect failed, falling back to summary", payErr);
        }

        setBookingResult(json.data);
      } else {
        setBookingError(json.error?.message || "Booking reservation failed");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to initiate booking";
      setBookingError(msg);
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Reset wizard
  const handleReset = () => {
    if (confirm("Reset your booking progress and start over?")) {
      localStorage.removeItem(STORAGE_KEY);
      setSelectedServiceIds([]);
      setSelectedAddonIds([]);
      setSelectedStaffId("any");
      setSelectedSlot(null);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setCustomerNotes("");
      setHold(null);
      setHoldSecondsLeft(null);
      setHoldExpired(false);
      setBookingResult(null);
      setStep(1);
    }
  };

  // Format seconds as mm:ss
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Next Step Handler
  const handleNext = () => {
    if (step === 1) {
      if (selectedServiceIds.length === 0) {
        alert("Please select at least one service to proceed.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      if (!selectedSlot) {
        alert("Please pick an available time slot to continue.");
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (!customerName.trim()) {
        alert("Please enter your full name.");
        return;
      }
      if (!validatePhone(customerPhone)) {
        return;
      }
      setStep(5);
    }
  };

  // Step names
  const stepTitles = [
    "Services & Add-ons",
    "Select Stylist",
    "Date & Time",
    "Guest Details",
    "Review & Pay",
  ];

  // If Booking is Confirmed
  if (bookingResult) {
    return (
      <div className="max-w-xl mx-auto py-10 px-4">
        <Card variant="white" className="p-8 text-center space-y-6 rounded-[32px] shadow-lg border border-black/10">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Booking Reserved
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1E1E1E]">
              We&apos;ve Held Your Appointment!
            </h1>
            <p className="text-xs text-[#71717A]">
              Reference: <span className="font-extrabold text-[#1E1E1E] text-sm">{bookingResult.reference}</span>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F4F4F6] text-left space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#71717A]">Client:</span>
              <span className="font-bold text-[#1E1E1E]">{bookingResult.customer?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#71717A]">Phone:</span>
              <span className="font-bold text-[#1E1E1E]">{bookingResult.customer?.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#71717A]">Deposit Due:</span>
              <span className="font-extrabold text-[#1E1E1E]">
                {formatPesewas(bookingResult.amountToPayPesewas)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#71717A]">Location:</span>
              <span className="font-semibold text-[#1E1E1E]">Lagos Ave, East Legon, Accra</span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-[#71717A] text-left border-t border-black/5 pt-4">
            <p className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>An SMS confirmation has been dispatched to your Ghana phone.</span>
            </p>
            <p className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#1E1E1E] shrink-0" />
              <span>Please arrive 10 minutes prior to your start time.</span>
            </p>
          </div>

          <div className="pt-4 flex flex-col gap-2">
            <Button
              variant="blackPill"
              size="md"
              onClick={() => {
                setBookingResult(null);
                setStep(1);
                setSelectedServiceIds([]);
                setSelectedAddonIds([]);
                setSelectedSlot(null);
              }}
              className="w-full text-xs font-bold cursor-pointer"
            >
              Book Another Appointment
            </Button>
            <Link href="/">
              <Button variant="outlinePill" size="md" className="w-full text-xs font-semibold cursor-pointer">
                Return to Home
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-10 px-2 sm:px-4 space-y-8 pb-28">
      {/* Top Header & Reset */}
      <div className="flex items-center justify-between border-b border-black/5 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#1E1E1E] tracking-tight">
            Reserve Appointment
          </h1>
          <p className="text-[11px] text-[#71717A]">
            East Legon Flagship Studio • Instant Guest Checkout
          </p>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs text-[#71717A] hover:text-[#1E1E1E] px-3 py-1.5 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
          title="Reset Wizard State"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Start Over</span>
        </button>
      </div>

      {/* Progress Indicator (5 Steps) */}
      <nav aria-label="Booking Progress" className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-[#71717A]">
          <span className="text-[#1E1E1E]">Step {step} of 5:</span>
          <span>{stepTitles[step - 1]}</span>
        </div>

        {/* 5-Segment Progress Bar */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i < step
                  ? "bg-[#1E1E1E]"
                  : i === step
                  ? "bg-[#1E1E1E] ring-2 ring-black/20"
                  : "bg-[#E4E4E7]"
              }`}
            />
          ))}
        </div>

        {/* Step Tabs for Large Screens */}
        <div className="hidden sm:flex items-center justify-between text-[11px] font-semibold text-[#71717A] pt-1">
          {stepTitles.map((title, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (idx + 1 < step) setStep((idx + 1) as 1 | 2 | 3 | 4 | 5);
              }}
              disabled={idx + 1 > step}
              className={`transition-colors ${
                idx + 1 === step
                  ? "text-[#1E1E1E] font-bold"
                  : idx + 1 < step
                  ? "text-[#1E1E1E] hover:underline cursor-pointer"
                  : "text-[#A1A1AA] cursor-not-allowed"
              }`}
            >
              {idx + 1}. {title}
            </button>
          ))}
        </div>
      </nav>

      {/* Graceful Hold Countdown / Expiry Banner */}
      {hold && holdSecondsLeft !== null && (
        <div
          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 text-xs ${
            holdExpired
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : holdSecondsLeft < 120
              ? "bg-amber-50 border-amber-200 text-amber-900 animate-pulse"
              : "bg-emerald-50 border-emerald-200 text-emerald-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            <div>
              {holdExpired ? (
                <span className="font-bold">
                  Slot Hold Expired. Your selected time has been unlocked.
                </span>
              ) : (
                <span>
                  Slot locked for:{" "}
                  <strong className="font-extrabold text-sm tracking-tight">
                    {formatTimer(holdSecondsLeft)}
                  </strong>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {holdExpired ? (
              <Button
                size="sm"
                variant="blackPill"
                onClick={() => {
                  setStep(3);
                  setSelectedSlot(null);
                  setHold(null);
                  setHoldExpired(false);
                }}
                className="text-[11px] h-7 px-3 cursor-pointer"
              >
                Pick New Slot
              </Button>
            ) : (
              hold.extendedCount < 1 && (
                <Button
                  size="sm"
                  variant="outlinePill"
                  disabled={extendingHold}
                  onClick={handleExtendHold}
                  className="text-[11px] h-7 px-2.5 bg-white text-[#1E1E1E] cursor-pointer"
                >
                  {extendingHold ? "Adding..." : "+5 min"}
                </Button>
              )
            )}
          </div>
        </div>
      )}

      {/* Main Wizard Form Steps */}
      <div className="space-y-6">
        {/* STEP 1: Services & Add-ons */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#1E1E1E]">
                Select Services & Add-ons
              </h2>
              <p className="text-xs text-[#71717A]">
                Multi-select across hair, bridal glam, lashes, and dress rentals. Running subtotal updates live.
              </p>
            </div>

            {catalogLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-28 rounded-2xl bg-[#E4E4E7]/60 animate-pulse" />
                ))}
              </div>
            ) : catalogError ? (
              <div className="p-4 rounded-2xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {catalogError}
              </div>
            ) : (
              <div className="space-y-8">
                {categories.map((cat) => (
                  <div key={cat.id} className="space-y-3">
                    <h3 className="text-sm font-extrabold text-[#1E1E1E] uppercase tracking-wider border-b border-black/5 pb-1">
                      {cat.name}
                    </h3>

                    <div className="grid grid-cols-1 gap-3">
                      {cat.services.map((svc) => {
                        const isSelected = selectedServiceIds.includes(svc.id);

                        return (
                          <div
                            key={svc.id}
                            className={`rounded-2xl border transition-all p-4 ${
                              isSelected
                                ? "bg-white border-[#1E1E1E] shadow-sm ring-1 ring-[#1E1E1E]"
                                : "bg-white/80 border-black/5 hover:border-black/20"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <label className="flex items-start gap-3 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 mt-1 rounded text-[#1E1E1E] border-[#E4E4E7] focus:ring-black cursor-pointer"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedServiceIds([...selectedServiceIds, svc.id]);
                                    } else {
                                      setSelectedServiceIds(
                                        selectedServiceIds.filter((id) => id !== svc.id)
                                      );
                                      // Remove its addons
                                      const addonIdsToRemove = svc.addons.map((a) => a.id);
                                      setSelectedAddonIds(
                                        selectedAddonIds.filter(
                                          (id) => !addonIdsToRemove.includes(id)
                                        )
                                      );
                                    }
                                  }}
                                />
                                <div className="space-y-0.5">
                                  <span className="text-sm font-bold text-[#1E1E1E] block">
                                    {svc.name}
                                  </span>
                                  <div className="flex items-center gap-2 text-xs text-[#71717A]">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-[#1E1E1E]" />
                                      {svc.durationMin} min
                                    </span>
                                    {svc.bufferMin > 0 && (
                                      <span>(+{svc.bufferMin}m buffer)</span>
                                    )}
                                  </div>
                                  {svc.description && (
                                    <p className="text-xs text-[#71717A] pt-1">
                                      {svc.description}
                                    </p>
                                  )}
                                </div>
                              </label>

                              <div className="text-right shrink-0">
                                <span className="text-sm font-extrabold text-[#1E1E1E] block">
                                  {formatPesewas(svc.pricePesewas)}
                                </span>
                              </div>
                            </div>

                            {/* Service Add-ons Sub-list */}
                            {isSelected && svc.addons && svc.addons.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-black/5 pl-7 space-y-2">
                                <span className="text-[11px] font-bold text-[#1E1E1E] block">
                                  Available Add-ons for this service:
                                </span>
                                {svc.addons.map((addon) => {
                                  const isAddonSelected = selectedAddonIds.includes(addon.id);

                                  return (
                                    <label
                                      key={addon.id}
                                      className="flex items-center justify-between text-xs py-1 cursor-pointer group"
                                    >
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          className="w-3.5 h-3.5 rounded text-[#1E1E1E] border-[#E4E4E7] focus:ring-black cursor-pointer"
                                          checked={isAddonSelected}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setSelectedAddonIds([
                                                ...selectedAddonIds,
                                                addon.id,
                                              ]);
                                            } else {
                                              setSelectedAddonIds(
                                                selectedAddonIds.filter((id) => id !== addon.id)
                                              );
                                            }
                                          }}
                                        />
                                        <span className="text-[#1E1E1E] group-hover:text-black">
                                          {addon.name}{" "}
                                          {addon.durationMin > 0 && `(+${addon.durationMin}m)`}
                                        </span>
                                      </div>
                                      <span className="font-bold text-[#71717A]">
                                        +{formatPesewas(addon.pricePesewas)}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Staff Selection */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#1E1E1E]">
                Select Stylist
              </h2>
              <p className="text-xs text-[#71717A]">
                Choose your preferred artist or select &apos;Any available&apos; for fastest scheduling.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A: Any Available */}
              <button
                type="button"
                onClick={() => setSelectedStaffId("any")}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedStaffId === "any"
                    ? "bg-[#1E1E1E] text-white border-black shadow-md"
                    : "bg-white text-[#1E1E1E] border-black/5 hover:border-black/20"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                      selectedStaffId === "any" ? "bg-white/10" : "bg-[#F4F4F6]"
                    }`}
                  >
                    <Users className="w-5 h-5" />
                  </div>
                  {selectedStaffId === "any" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#1E1E1E]">
                      Selected
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-sm">Any Available Stylist</h3>
                <p
                  className={`text-xs mt-1 leading-relaxed ${
                    selectedStaffId === "any" ? "text-white/80" : "text-[#71717A]"
                  }`}
                >
                  Our smart engine assigns the best available artist using balanced rotation and zero wait time.
                </p>
              </button>

              {/* Option B: Specific Stylists */}
              {allStaff.map((staff) => {
                const isSelected = selectedStaffId === staff.id;

                return (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => setSelectedStaffId(staff.id)}
                    className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#1E1E1E] text-white border-black shadow-md"
                        : "bg-white text-[#1E1E1E] border-black/5 hover:border-black/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                          isSelected ? "bg-white/10 text-white" : "bg-[#F4F4F6] text-[#1E1E1E]"
                        }`}
                      >
                        {staff.photoUrl ? (
                          <div className="relative w-10 h-10 rounded-2xl overflow-hidden">
                            <Image
                              src={staff.photoUrl}
                              alt={staff.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#1E1E1E]">
                          Selected
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm">{staff.name}</h3>
                    {staff.bio && (
                      <p
                        className={`text-xs mt-0.5 line-clamp-2 ${
                          isSelected ? "text-white/80" : "text-[#71717A]"
                        }`}
                      >
                        {staff.bio}
                      </p>
                    )}
                    {staff.specialties?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {staff.specialties.slice(0, 3).map((spec, idx) => (
                          <span
                            key={idx}
                            className={`text-[10px] px-2 py-0.5 rounded-full ${
                              isSelected
                                ? "bg-white/15 text-white"
                                : "bg-[#F4F4F6] text-[#71717A]"
                            }`}
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Date & Time */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#1E1E1E]">
                Select Date & Time
              </h2>
              <p className="text-xs text-[#71717A]">
                Slots respect minimum notice hours and salon operating schedule.
              </p>
            </div>

            {/* Date Picker Input */}
            <div className="space-y-2">
              <Label htmlFor="booking-date">Choose Appointment Date</Label>
              <input
                id="booking-date"
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlot(null);
                }}
                className="w-full sm:w-64 h-11 px-3.5 rounded-2xl border border-[#E4E4E7] bg-white text-xs font-semibold text-[#1E1E1E] focus:outline-hidden focus:border-[#1E1E1E]"
              />
            </div>

            {/* Slots Grid */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1E1E1E]">
                  Available Slots for {selectedDate}
                </span>
                <span className="text-[11px] text-[#71717A]">
                  Duration: {totalDurationMin} minutes
                </span>
              </div>

              {slotsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <div key={n} className="h-14 rounded-2xl bg-[#E4E4E7]/60 animate-pulse" />
                  ))}
                </div>
              ) : slotsError ? (
                <div className="p-4 rounded-2xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                  {slotsError}
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="p-8 text-center rounded-[28px] border border-dashed border-[#E4E4E7] bg-white/50 space-y-2">
                  <CalendarIcon className="w-8 h-8 text-[#A1A1AA] mx-auto" />
                  <p className="text-xs font-bold text-[#1E1E1E]">
                    No available slots on this date
                  </p>
                  <p className="text-[11px] text-[#71717A] max-w-sm mx-auto">
                    All stylists may be fully booked or the salon is closed. Try selecting another date or switching to &apos;Any available stylist&apos;.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {availableSlots.map((slot, idx) => {
                    const isSelected =
                      selectedSlot?.startUtc === slot.startUtc &&
                      selectedSlot?.staffId === slot.staffId;

                    // Format Accra local time (e.g. 10:00 AM)
                    const slotTime = new Date(slot.startUtc).toLocaleTimeString("en-GB", {
                      timeZone: "Africa/Accra",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    });

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={async () => {
                          setSelectedSlot(slot);
                          await createHoldForSlot(slot);
                        }}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#1E1E1E] text-white border-black shadow-sm"
                            : "bg-white text-[#1E1E1E] border-black/5 hover:border-black/20"
                        }`}
                      >
                        <span className="text-xs font-extrabold block">
                          {slotTime}
                        </span>
                        <span
                          className={`text-[10px] block truncate mt-0.5 ${
                            isSelected ? "text-white/80" : "text-[#71717A]"
                          }`}
                        >
                          {slot.staffName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Details (No Accounts) */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#1E1E1E]">
                Guest Client Information
              </h2>
              <p className="text-xs text-[#71717A]">
                No password or account creation required. Instant SMS booking notifications.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="cust-name">Full Name *</Label>
                <Input
                  id="cust-name"
                  required
                  placeholder="e.g. Efua Hanson"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="cust-phone">Ghana Phone Number (MTN / Telecel / AT) *</Label>
                <Input
                  id="cust-phone"
                  required
                  placeholder="024 123 4567 or +233 24 123 4567"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    if (phoneError) validatePhone(e.target.value);
                  }}
                  onBlur={() => validatePhone(customerPhone)}
                  className={phoneError ? "border-rose-500" : ""}
                />
                {phoneError ? (
                  <p className="text-[11px] text-rose-600 mt-1">{phoneError}</p>
                ) : (
                  <p className="text-[11px] text-[#71717A] mt-1">
                    Normalized to international +233 standard automatically for SMS confirmation.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="cust-email">Email Address (Optional)</Label>
                <Input
                  id="cust-email"
                  type="email"
                  placeholder="efua@example.com (for calendar invite)"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="cust-notes">Notes or Styling Requests (Optional)</Label>
                <Textarea
                  id="cust-notes"
                  rows={3}
                  placeholder="Hair texture, dress sizing requirements, allergy alerts, reference notes..."
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Review & Pay */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#1E1E1E]">
                Review & Confirm Booking
              </h2>
              <p className="text-xs text-[#71717A]">
                Check appointment summary, choose payment option, and lock in your reservation.
              </p>
            </div>

            {bookingError && (
              <div className="p-4 rounded-2xl bg-rose-50 text-rose-800 text-xs border border-rose-200">
                {bookingError}
              </div>
            )}

            {/* Order Summary Card */}
            <Card variant="white" className="p-6 space-y-4 rounded-[28px] border border-black/5">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#1E1E1E] border-b border-black/5 pb-2">
                Appointment Summary
              </h3>

              <div className="space-y-2.5 text-xs">
                {selectedServices.map((svc) => (
                  <div key={svc.id} className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-[#1E1E1E]">{svc.name}</span>
                      <span className="text-[11px] text-[#71717A] block">
                        {svc.durationMin} minutes
                      </span>
                    </div>
                    <span className="font-extrabold text-[#1E1E1E]">
                      {formatPesewas(svc.pricePesewas)}
                    </span>
                  </div>
                ))}

                {selectedAddons.map((addon) => (
                  <div key={addon.id} className="flex justify-between items-start pl-4 text-xs">
                    <span className="text-[#71717A]">+ {addon.name}</span>
                    <span className="font-bold text-[#1E1E1E]">
                      {formatPesewas(addon.pricePesewas)}
                    </span>
                  </div>
                ))}

                <div className="border-t border-black/5 pt-2.5 space-y-1">
                  <div className="flex justify-between text-[#71717A]">
                    <span>Assigned Stylist:</span>
                    <span className="font-bold text-[#1E1E1E]">
                      {selectedSlot?.staffName || "Any Available Stylist"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#71717A]">
                    <span>Date & Time:</span>
                    <span className="font-bold text-[#1E1E1E]">
                      {selectedDate} •{" "}
                      {selectedSlot &&
                        new Date(selectedSlot.startUtc).toLocaleTimeString("en-GB", {
                          timeZone: "Africa/Accra",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#71717A]">
                    <span>Estimated Duration:</span>
                    <span className="font-bold text-[#1E1E1E]">
                      {totalDurationMin} minutes
                    </span>
                  </div>
                </div>

                <div className="border-t border-black/10 pt-3 flex justify-between text-sm">
                  <span className="font-black text-[#1E1E1E]">Total Amount:</span>
                  <span className="font-black text-[#1E1E1E] text-base">
                    {formatPesewas(subtotalPesewas)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Payment Options */}
            <div className="space-y-3">
              <Label>Payment Options</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                    paymentType === "DEPOSIT"
                      ? "bg-white border-[#1E1E1E] ring-1 ring-[#1E1E1E]"
                      : "bg-white/80 border-black/5"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentType"
                    checked={paymentType === "DEPOSIT"}
                    onChange={() => setPaymentType("DEPOSIT")}
                    className="mt-1 text-[#1E1E1E] focus:ring-black"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#1E1E1E] block">
                      Pay 50% Deposit Now
                    </span>
                    <span className="text-sm font-extrabold text-[#1E1E1E] block mt-0.5">
                      {formatPesewas(depositPesewas)}
                    </span>
                    <span className="text-[10px] text-[#71717A] block mt-1">
                      Balance of {formatPesewas(subtotalPesewas - depositPesewas)} due upon arrival at studio.
                    </span>
                  </div>
                </label>

                <label
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                    paymentType === "FULL"
                      ? "bg-white border-[#1E1E1E] ring-1 ring-[#1E1E1E]"
                      : "bg-white/80 border-black/5"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentType"
                    checked={paymentType === "FULL"}
                    onChange={() => setPaymentType("FULL")}
                    className="mt-1 text-[#1E1E1E] focus:ring-black"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#1E1E1E] block">
                      Pay Full Amount Now
                    </span>
                    <span className="text-sm font-extrabold text-[#1E1E1E] block mt-0.5">
                      {formatPesewas(subtotalPesewas)}
                    </span>
                    <span className="text-[10px] text-[#71717A] block mt-1">
                      Zero payment needed at appointment.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Policy Checkbox */}
            <div className="p-4 rounded-2xl bg-white border border-black/5 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={policyAgreed}
                  onChange={(e) => setPolicyAgreed(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-[#1E1E1E] border-[#E4E4E7] focus:ring-black cursor-pointer"
                />
                <span className="text-xs text-[#1E1E1E] leading-relaxed">
                  I agree to the{" "}
                  <Link href="/policies" target="_blank" className="font-bold underline">
                    Studio Policies
                  </Link>
                  , including the 24-hour cancellation refund window and 15-minute appointment grace period.
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Navigation Bar (Optimized for 360px Mobile Screens) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-black/10 py-3 px-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Running Subtotal Preview */}
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-[#71717A] tracking-wider block">
              {selectedServices.length} {selectedServices.length === 1 ? "Service" : "Services"} • {totalDurationMin}m
            </span>
            <span className="text-sm sm:text-base font-black text-[#1E1E1E] block">
              {formatPesewas(subtotalPesewas)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button
                variant="outlinePill"
                size="sm"
                onClick={() => setStep((step - 1) as 1 | 2 | 3 | 4 | 5)}
                className="text-xs h-10 px-3 sm:px-4 bg-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                <span>Back</span>
              </Button>
            )}

            {step < 5 ? (
              <Button
                variant="blackPill"
                size="sm"
                onClick={handleNext}
                className="text-xs h-10 px-5 font-bold cursor-pointer gap-1 shadow-md"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="blackPill"
                size="sm"
                disabled={submittingBooking || !policyAgreed || holdExpired}
                onClick={handleFinalSubmit}
                className="text-xs h-10 px-5 font-black cursor-pointer gap-1.5 shadow-md bg-[#1E1E1E] text-white hover:bg-black"
              >
                <CreditCard className="w-4 h-4" />
                <span>{submittingBooking ? "Holding Slot..." : "Confirm & Pay"}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingWizardPage() {
  return (
    <React.Suspense
      fallback={
        <div className="max-w-4xl mx-auto py-10 px-4 space-y-6">
          <div className="h-10 w-48 bg-[#E4E4E7]/60 rounded-2xl animate-pulse" />
          <div className="h-6 w-full bg-[#E4E4E7]/60 rounded-full animate-pulse" />
          <div className="h-64 w-full bg-[#E4E4E7]/40 rounded-[28px] animate-pulse" />
        </div>
      }
    >
      <BookingWizardContent />
    </React.Suspense>
  );
}
