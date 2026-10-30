"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  CreditCard,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Crown,
  Search,
  ArrowRight,
  ArrowUpRight,
  Check,
  X,
  Phone,
  User,
  Mail,
  FileText,
  Star,
} from "lucide-react";
import { formatPesewas } from "@/lib/money";

async function parseJsonSafely(res: Response) {
  try {
    const text = await res.text();
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      error: {
        message: res.status >= 500 ? "Service temporarily unavailable. Please retry in a moment." : "An unexpected response was received.",
      },
    };
  }
}

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

const STORAGE_KEY = "beccascrown_booking_wizard_state";

const STEP_BACKGROUNDS: Record<number, { image: string; title: string; subtitle: string }> = {
  1: {
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=2400&q=85",
    title: "Signature Artistry",
    subtitle: "Select your treatments and add-ons.",
  },
  2: {
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=2400&q=85",
    title: "Prime Appointments",
    subtitle: "Pick an available date and 10-minute hold slot.",
  },
  3: {
    image: "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=2400&q=85",
    title: "Guest Details",
    subtitle: "Instant SMS booking updates to your phone.",
  },
  4: {
    image: "/images/hero_bridal_glam.jpg",
    title: "Secure Your Hold",
    subtitle: "MoMo and Card encrypted checkout.",
  },
};

function BookingWizardContent() {
  const searchParams = useSearchParams();
  const initialServiceId = searchParams.get("serviceId");
  const initialDate = searchParams.get("date");
  const initialStep = searchParams.get("step");

  // Catalog State
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [catalogLoading, setCatalogLoading] = React.useState(true);
  const [catalogError, setCatalogError] = React.useState<string | null>(null);

  // Active Category filter tab on Step 1
  const [activeCategoryFilter, setActiveCategoryFilter] = React.useState<string>("ALL");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Wizard Step (1 to 4 in Solo Shop mode)
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);

  // Selection States
  const [selectedServiceIds, setSelectedServiceIds] = React.useState<string[]>([]);
  const [selectedAddonIds, setSelectedAddonIds] = React.useState<string[]>([]);
  const [selectedStaffId, setSelectedStaffId] = React.useState<string>("any");
  const [selectedDate, setSelectedDate] = React.useState<string>(getTomorrowDate);
  const [selectedSlot, setSelectedSlot] = React.useState<AvailabilitySlot | null>(null);

  // Availability Slots Fetching
  const [slotsLoading, setSlotsLoading] = React.useState(true);
  const [slotsError, setSlotsError] = React.useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = React.useState<AvailabilitySlot[]>([]);

  // Customer Details (No Account)
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [customerEmail, setCustomerEmail] = React.useState("");
  const [customerBirthdayMonth, setCustomerBirthdayMonth] = React.useState<number | "">("");
  const [customerBirthdayDay, setCustomerBirthdayDay] = React.useState<number | "">("");
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
        const json = await parseJsonSafely(res);
        if (json.success && json.data) {
          setCategories(json.data.categories || []);

          // If coming from search bar or card with a pre-selected service, prioritize it
          if (initialServiceId) {
            setSelectedServiceIds([initialServiceId]);
            if (initialDate) {
              setSelectedDate(initialDate);
            }
            setSelectedSlot(null);
            setSlotsLoading(true);
            if (initialStep === "2" || !initialStep) {
              setStep(2);
            }
          } else {
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
                if (saved.step && saved.step >= 1 && saved.step <= 4) setStep(saved.step as 1 | 2 | 3 | 4);

                // Check hold validity
                if (saved.hold?.expiresAt) {
                  const expires = new Date(saved.hold.expiresAt).getTime();
                  const now = Date.now();
                  if (expires > now) {
                    setHold(saved.hold);
                    setHoldSecondsLeft(Math.floor((expires - now) / 1000));
                  } else {
                    setHoldExpired(true);
                  }
                }
              } catch (e) {
                console.warn("Could not parse saved booking state", e);
              }
            }
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
  }, [initialServiceId, initialDate, initialStep]);

  // 2. Persist State to LocalStorage on changes
  React.useEffect(() => {
    if (bookingResult) {
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

  // Fetch Slots when Date, Services, or Staff changes on Step 2
  React.useEffect(() => {
    if (step !== 2 || selectedServiceIds.length === 0 || !selectedDate) {
      if (step === 2) {
        setSlotsLoading(true);
        setAvailableSlots([]);
        setSlotsError(null);
      }
      return;
    }
    let cancelled = false;

    setSlotsLoading(true);
    setAvailableSlots([]);
    setSlotsError(null);

    const params = new URLSearchParams();
    selectedServiceIds.forEach((id) => params.append("serviceIds", id));
    selectedAddonIds.forEach((id) => params.append("addonIds", id));
    params.set("startDate", selectedDate);
    params.set("endDate", selectedDate);
    if (selectedStaffId && selectedStaffId !== "any") {
      params.set("staffId", selectedStaffId);
    }

    fetch(`/api/availability?${params.toString()}`)
      .then((res) => parseJsonSafely(res))
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

  // Services lookup & calculations
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

  const depositPesewas = React.useMemo(() => {
    return Math.round(subtotalPesewas * 0.5);
  }, [subtotalPesewas]);

  // Generate 14 Upcoming Days for the Horizontal Day Selector (Matching Reference Design)
  const upcomingDays = React.useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const isToday = i === 0;
      const isTomorrow = i === 1;
      const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
      const dayNum = d.getDate();
      days.push({
        dateStr,
        weekday,
        dayNum,
        label: isToday ? "Today" : isTomorrow ? "Tmrw" : weekday,
      });
    }
    return days;
  }, []);

  // Validation
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
      // valid
    } else if (digits.length === 9) {
      // valid
    } else {
      setPhoneError("Provide a 10-digit Ghana number (e.g. 0241234567) or +233 format");
      return false;
    }

    setPhoneError(null);
    return true;
  };

  // Create slot hold
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

      const json = await parseJsonSafely(res);
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
      const json = await parseJsonSafely(res);
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
      setStep(3);
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
            birthdayMonth: customerBirthdayMonth ? Number(customerBirthdayMonth) : undefined,
            birthdayDay: customerBirthdayDay ? Number(customerBirthdayDay) : undefined,
          },
          paymentType,
          policyAgreed: true,
        }),
      });

      const json = await parseJsonSafely(res);
      if (json.success && json.data) {
        localStorage.removeItem(STORAGE_KEY);

        // Initiate Paystack
        try {
          const payRes = await fetch("/api/payments/initialize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookingId: json.data.bookingId,
              paymentType,
            }),
          });
          const payJson = await parseJsonSafely(payRes);
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

  // Navigation handlers
  const handleNext = () => {
    if (step === 1) {
      if (selectedServiceIds.length === 0) {
        alert("Please select at least one treatment to continue");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!selectedSlot) {
        alert("Please select an available appointment slot");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!customerName.trim()) {
        alert("Please enter your name");
        return;
      }
      if (!validatePhone(customerPhone)) {
        return;
      }
      setStep(4);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Format month and year from selected date for Step 2
  const selectedDateObj = React.useMemo(() => {
    try {
      return new Date(selectedDate);
    } catch {
      return new Date();
    }
  }, [selectedDate]);

  const monthYearLabel = React.useMemo(() => {
    return selectedDateObj.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [selectedDateObj]);

  // Filtered services for Step 1
  const filteredCategories = React.useMemo(() => {
    let base = categories;
    if (activeCategoryFilter !== "ALL") {
      base = base.filter((c) => c.slug.toLowerCase().includes(activeCategoryFilter.toLowerCase()));
    }
    if (!searchQuery.trim()) return base;

    const q = searchQuery.toLowerCase().trim();
    return base
      .map((cat) => ({
        ...cat,
        services: cat.services.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.description && s.description.toLowerCase().includes(q))
        ),
      }))
      .filter((cat) => cat.services.length > 0);
  }, [categories, activeCategoryFilter, searchQuery]);

  // CONFIRMATION VIEW
  if (bookingResult) {
    return (
      <div className="relative min-h-[calc(100dvh-5rem)] w-full py-6 sm:py-10 flex items-center justify-center p-4 sm:p-8 bg-zinc-950">
        <div className="fixed inset-0 z-0">
          <Image
            src="/images/ghanaian_hero_beauty.jpg"
            alt="Becca's Crown Beauty Vault"
            fill
            className="object-cover object-center scale-105 opacity-40 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-black/85" />
        </div>
        <div className="relative z-10 w-full max-w-lg rounded-[32px] sm:rounded-[36px] bg-zinc-950/80 backdrop-blur-3xl border border-white/20 p-6 sm:p-10 text-white shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
              Appointment Reserved
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              You&apos;re Booked!
            </h1>
            <p className="text-xs text-zinc-400">
              Booking Ref: <strong className="text-white font-mono tracking-wider">{bookingResult.reference}</strong>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left text-xs space-y-2">
            <div className="flex justify-between text-zinc-400">
              <span>Client Name:</span>
              <span className="text-white font-bold">{bookingResult.customer.name}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Contact Phone:</span>
              <span className="text-white font-bold">{bookingResult.customer.phone}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Appointment Date:</span>
              <span className="text-white font-bold">{selectedDate}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Deposit Required:</span>
              <span className="text-white font-bold">{formatPesewas(bookingResult.depositRequiredPesewas)}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <Link href={`/manage/${bookingResult.manageToken}`}>
              <button
                type="button"
                className="w-full h-12 rounded-full bg-white text-zinc-950 hover:bg-zinc-100 font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer"
              >
                Proceed to Pay & Manage Booking
              </button>
            </Link>
            <Link href="/">
              <button
                type="button"
                className="w-full h-11 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Return to Home
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-5rem)] w-full py-2 sm:py-4 lg:py-3 flex items-center justify-center p-3 sm:p-6 lg:p-8 bg-zinc-950">
      {/* =========================================================================
          DYNAMIC BACKGROUND IMAGES (Changes with each step with smooth cross-fade)
      ========================================================================= */}
      <div className="fixed inset-0 z-0">
        {([1, 2, 3, 4] as const).map((s) => (
          <div
            key={s}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              step === s ? "opacity-50" : "opacity-0 pointer-events-none"
            }`}
          >
            <Image
              src={STEP_BACKGROUNDS[s].image}
              alt={STEP_BACKGROUNDS[s].title}
              fill
              priority={s === 1}
              className="object-cover object-center scale-105"
            />
          </div>
        ))}
        {/* Soft Vignette Overlay for Text & Glass Contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-black/70" />
      </div>

      <div className="relative z-10 max-w-6xl w-full h-full max-h-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        {/* =========================================================================
            LEFT COLUMN (Minimalist Editorial Typography - Changes with Step)
        ========================================================================= */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between h-full max-h-[min(650px,calc(100dvh-7rem))] py-4 text-white pr-4">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-bold text-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Step 0{step} of 04</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.06] text-white">
              {STEP_BACKGROUNDS[step].title}
            </h1>
            <p className="text-sm text-zinc-300 font-medium max-w-sm leading-relaxed">
              {STEP_BACKGROUNDS[step].subtitle}
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-zinc-400 border-t border-white/10 pt-4">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-white">4.9/5 Rating</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Live Slot Hold</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>MoMo & Card</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: THE FROSTED GLASS CARD (Fitted to Screen Height)
        ========================================================================= */}
        <div className="lg:col-span-7 w-full flex items-center justify-center h-full">
          <div className="w-full max-w-xl min-h-[500px] h-[calc(100dvh-7rem)] max-h-[640px] sm:max-h-[660px] lg:max-h-[680px] rounded-[28px] sm:rounded-[36px] bg-zinc-950/90 sm:bg-zinc-950/80 backdrop-blur-3xl border border-white/20 p-4 sm:p-5 lg:p-6 shadow-2xl text-white flex flex-col justify-between overflow-hidden transition-all duration-300">
            {/* Top Bar inside the Glass: Studio Brand Capsule & Step Indicator */}
            <div className="flex items-center justify-between pb-2.5 sm:pb-3.5 border-b border-white/10 shrink-0">
              {/* Studio Capsule */}
              <Link
                href="/"
                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 pl-1.5 pr-3 py-1 rounded-full backdrop-blur-md transition-colors"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 text-zinc-950 font-black text-[10px] sm:text-[11px] flex items-center justify-center shadow-xs">
                  BC
                </div>
                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold block leading-none text-white">
                    Becca&apos;s Crown
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-amber-200 block leading-tight">
                    Beauty Vault
                  </span>
                </div>
              </Link>

              {/* Step indicator & Return to Home Button */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-zinc-300">
                  Step {step} of 4
                </span>
                <Link
                  href="/"
                  title="Return to Home"
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Dynamic Step Header inside Glass */}
            <div className="pt-2 sm:pt-3 pb-1 space-y-0.5 sm:space-y-1 shrink-0">
              <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-snug">
                {step === 1 && "Book Your Crown Experience"}
                {step === 2 && "Choose Your Date & Time"}
                {step === 3 && "Your Contact Details"}
                {step === 4 && "Review & Confirm Slot"}
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400 line-clamp-1 sm:line-clamp-2">
                {step === 1 && "Select the signature treatments you wish to reserve today."}
                {step === 2 && "Pick your day and live time slot. Instant 10-minute calendar lock."}
                {step === 3 && "No password needed. SMS confirmations sent straight to your phone."}
                {step === 4 && "Choose your deposit option and lock in your reservation."}
              </p>
            </div>

            {/* Smart Search Bar (Only shown on Step 1 for maximum mobile height) */}
            {step === 1 && (
              <div className="my-1.5 sm:my-2 space-y-1 shrink-0">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                    }}
                    placeholder="Smart Search treatments (e.g. frontal, soft glam, lashes)..."
                    className="w-full h-9 sm:h-10 pl-9 pr-8 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all backdrop-blur-md"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 text-zinc-400 hover:text-white p-0.5 rounded-full cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Hold Timer Alert if Active */}
            {hold && holdSecondsLeft !== null && (
              <div
                className={`my-2 p-2.5 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
                  holdExpired
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-200"
                    : "bg-emerald-500/20 border-emerald-500/40 text-emerald-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {holdExpired ? (
                      <strong>Slot expired. Please pick a new slot.</strong>
                    ) : (
                      <>
                        Slot held for: <strong className="font-mono">{formatTimer(holdSecondsLeft)}</strong>
                      </>
                    )}
                  </span>
                </div>
                {!holdExpired && hold.extendedCount < 1 && (
                  <button
                    type="button"
                    onClick={handleExtendHold}
                    disabled={extendingHold}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
                  >
                    {extendingHold ? "..." : "+5 min"}
                  </button>
                )}
              </div>
            )}

            {/* =====================================================================
                STEP CONTENT CONTAINER (Dynamically fits available height)
            ===================================================================== */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 my-2 scrollbar-thin scrollbar-thumb-white/20">
              {/* ---------------------------------------------------------------
                  STEP 1: TREATMENT SELECTOR
              --------------------------------------------------------------- */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* Category Filter Pills inside Glass */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {["ALL", "hair", "bridal", "lashes", "pedicure", "facials"].map((slug) => (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => setActiveCategoryFilter(slug)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                          activeCategoryFilter === slug
                            ? "bg-white text-zinc-950 font-black shadow-xs"
                            : "bg-white/10 hover:bg-white/15 text-zinc-300 border border-white/10"
                        }`}
                      >
                        {slug === "ALL" ? "All Services" : slug}
                      </button>
                    ))}
                  </div>

                  {catalogLoading ? (
                    <div className="space-y-2.5">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="h-16 rounded-2xl bg-white/10 animate-pulse" />
                      ))}
                    </div>
                  ) : catalogError ? (
                    <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs">
                      {catalogError}
                    </div>
                  ) : filteredCategories.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-dashed border-white/15 bg-white/5 text-center space-y-2">
                      <Search className="w-6 h-6 text-zinc-500 mx-auto" />
                      <p className="text-xs font-bold text-white">No treatments found</p>
                      <p className="text-[10px] text-zinc-400">
                        No treatments match &ldquo;{searchQuery}&rdquo;. Try another term or clear filter.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setActiveCategoryFilter("ALL");
                        }}
                        className="mt-1 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[10px] text-amber-200 font-bold transition-colors cursor-pointer"
                      >
                        Clear Search & Filters
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredCategories.map((cat) =>
                        cat.services.map((svc) => {
                          const isSelected = selectedServiceIds.includes(svc.id);
                          return (
                            <div
                              key={svc.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedServiceIds(selectedServiceIds.filter((id) => id !== svc.id));
                                } else {
                                  setSelectedServiceIds([...selectedServiceIds, svc.id]);
                                }
                              }}
                              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                isSelected
                                  ? "bg-white/20 border-white/50 ring-1 ring-white/60 shadow-lg"
                                  : "bg-white/5 hover:bg-white/10 border-white/10"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected
                                      ? "bg-white text-zinc-950 border-white"
                                      : "border-white/30 bg-white/5"
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-xs font-bold text-white truncate">
                                    {svc.name}
                                  </h3>
                                  <span className="text-[10px] text-zinc-400">
                                    {svc.durationMin} mins
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs font-black text-amber-200 shrink-0">
                                {formatPesewas(svc.pricePesewas)}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ---------------------------------------------------------------
                  STEP 2: DATE & TIME (Matches Reference Screenshot Exactly!)
              --------------------------------------------------------------- */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* Selected service preview tag */}
                  {selectedServices.length > 0 && (
                    <div className="flex items-center justify-between p-2.5 bg-white/5 border border-white/10 rounded-2xl text-[11px]">
                      <div className="flex items-center gap-2 truncate">
                        <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span className="truncate font-semibold text-zinc-200">
                          {selectedServices.map((s) => s.name).join(", ")}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-[10px] text-amber-200 hover:underline shrink-0 font-bold ml-2 cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  {/* Horizontal Day Selector (Matches [Tue Today] [Wed 26] [Thu 27] in Screenshot) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-300 px-1">
                      <span>{monthYearLabel}</span>
                      <label className="text-[10px] text-zinc-400 flex items-center gap-1 cursor-pointer hover:text-white">
                        <CalendarIcon className="w-3 h-3" />
                        <span>Other Date</span>
                        <input
                          type="date"
                          value={selectedDate}
                          min={new Date().toISOString().split("T")[0]}
                          onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setSelectedSlot(null);
                            setAvailableSlots([]);
                            setSlotsLoading(true);
                          }}
                          className="sr-only"
                        />
                      </label>
                    </div>

                    {/* Day Pill Buttons */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {upcomingDays.slice(0, 5).map((d) => {
                        const isSelectedDay = selectedDate === d.dateStr;
                        return (
                          <button
                            key={d.dateStr}
                            type="button"
                            onClick={() => {
                              setSelectedDate(d.dateStr);
                              setSelectedSlot(null);
                              setAvailableSlots([]);
                              setSlotsLoading(true);
                            }}
                            className={`py-2 px-1 rounded-2xl text-center transition-all cursor-pointer ${
                              isSelectedDay
                                ? "bg-white text-zinc-950 font-black shadow-lg scale-102"
                                : "bg-white/10 hover:bg-white/15 text-zinc-300 border border-white/10"
                            }`}
                          >
                            <span className="text-[9px] uppercase tracking-wider block opacity-75">
                              {d.weekday}
                            </span>
                            <span className="text-xs font-extrabold block">
                              {d.label === "Today" ? "Today" : d.dayNum}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Slots 4-Column Grid (Matches Screenshot: 9:00, 9:30, 10:00, 10:30...) */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
                      <span>Available Time Slots</span>
                      <span>{totalDurationMin} min appointment</span>
                    </div>

                    {slotsLoading ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                          <div key={n} className="h-11 rounded-xl bg-white/10 animate-pulse" />
                        ))}
                      </div>
                    ) : slotsError ? (
                      <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs text-center">
                        {slotsError}
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="p-6 rounded-2xl border border-dashed border-white/15 bg-white/5 text-center space-y-1">
                        <Clock className="w-6 h-6 text-zinc-500 mx-auto" />
                        <p className="text-xs font-bold text-white">No slots open on this date</p>
                        <p className="text-[10px] text-zinc-400">Please choose another day above.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {availableSlots.map((slot, idx) => {
                          const isSelectedSlot =
                            selectedSlot?.startUtc === slot.startUtc &&
                            selectedSlot?.staffId === slot.staffId;

                          const slotTime = new Date(slot.startUtc).toLocaleTimeString("en-GB", {
                            timeZone: "Africa/Accra",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          });

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={async () => {
                                setSelectedSlot(slot);
                                await createHoldForSlot(slot);
                              }}
                              className={`h-11 min-h-[44px] rounded-xl text-center text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                                isSelectedSlot
                                  ? "bg-white text-zinc-950 font-black shadow-lg ring-2 ring-white scale-102"
                                  : "bg-white/10 hover:bg-white/20 text-white/90 border border-white/10"
                              }`}
                            >
                              {slotTime}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------------------
                  STEP 3: GUEST CLIENT INFORMATION (Matches Glass Inputs)
              --------------------------------------------------------------- */}
              {step === 3 && (
                <div className="space-y-3.5 animate-in fade-in duration-300">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Full Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ama Mensah"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Ghana Phone Number (MTN / Telecel / AT) *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        placeholder="024 000 1111 or +233 24 000 1111"
                        value={customerPhone}
                        onChange={(e) => {
                          setCustomerPhone(e.target.value);
                          if (phoneError) validatePhone(e.target.value);
                        }}
                        onBlur={() => validatePhone(customerPhone)}
                        className={`w-full h-11 px-4 rounded-xl sm:rounded-2xl bg-white/10 border text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-colors ${
                          phoneError ? "border-rose-500" : "border-white/20"
                        }`}
                      />
                    </div>
                    {phoneError ? (
                      <p className="text-[10px] text-rose-400">{phoneError}</p>
                    ) : (
                      <p className="text-[10px] text-zinc-400">
                        Normalized automatically for your SMS booking confirmation.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="ama@example.com (for calendar invite)"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-colors"
                    />
                  </div>

                  {/* Optional VIP Birthday Perk */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                        VIP Birthday Month &amp; Day (Optional)
                      </label>
                      <span className="text-[10px] font-bold text-amber-300/80">Birthday Crown Gift 🎁</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      Share your birth month &amp; day to unlock exclusive treatments and anniversary perks.
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <select
                        aria-label="Birthday Month"
                        value={customerBirthdayMonth}
                        onChange={(e) => setCustomerBirthdayMonth(e.target.value ? parseInt(e.target.value, 10) : "")}
                        className="h-10 px-3 rounded-xl bg-zinc-900 border border-white/20 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        <option value="">Select Month</option>
                        {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, idx) => (
                          <option key={m} value={idx + 1}>{m}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Birthday Day"
                        value={customerBirthdayDay}
                        onChange={(e) => setCustomerBirthdayDay(e.target.value ? parseInt(e.target.value, 10) : "")}
                        className="h-10 px-3 rounded-xl bg-zinc-900 border border-white/20 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        <option value="">Select Day</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>Day {d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Styling Notes / Special Requests (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Hair texture, dress sizing, lash preferences..."
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      className="w-full p-3 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------------------
                  STEP 4: SUMMARY & PAYMENT (Review & Confirm)
              --------------------------------------------------------------- */}
              {step === 4 && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {bookingError && (
                    <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs">
                      {bookingError}
                    </div>
                  )}

                  {/* Glass Receipt Summary */}
                  <div className="p-4 rounded-2xl bg-white/10 border border-white/15 space-y-2.5 text-xs">
                    <div className="border-b border-white/10 pb-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Selected Treatments
                      </p>
                      {selectedServices.map((s) => (
                        <div key={s.id} className="flex justify-between items-center pt-1">
                          <span className="font-bold text-white">{s.name}</span>
                          <span className="font-mono text-amber-200">{formatPesewas(s.pricePesewas)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1 text-zinc-300 text-[11px]">
                      <div className="flex justify-between">
                        <span>Appointment Time:</span>
                        <span className="font-bold text-white">
                          {selectedDate} at{" "}
                          {selectedSlot &&
                            new Date(selectedSlot.startUtc).toLocaleTimeString("en-GB", {
                              timeZone: "Africa/Accra",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Client:</span>
                        <span className="font-bold text-white">{customerName} ({customerPhone})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span className="font-bold text-white">{totalDurationMin} minutes</span>
                      </div>
                    </div>

                    <div className="border-t border-white/15 pt-2 flex justify-between items-center text-sm font-black">
                      <span>Total Amount:</span>
                      <span className="text-amber-300 text-base">{formatPesewas(subtotalPesewas)}</span>
                    </div>
                  </div>

                  {/* Payment Type Selection (50% Deposit vs Full) */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Choose Payment Amount
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentType("DEPOSIT")}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          paymentType === "DEPOSIT"
                            ? "bg-white text-zinc-950 border-white shadow-md font-bold"
                            : "bg-white/10 text-white border-white/10"
                        }`}
                      >
                        <span className="text-[10px] uppercase block opacity-75">Pay 50% Deposit</span>
                        <span className="text-xs font-black block mt-0.5">
                          {formatPesewas(depositPesewas)}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentType("FULL")}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          paymentType === "FULL"
                            ? "bg-white text-zinc-950 border-white shadow-md font-bold"
                            : "bg-white/10 text-white border-white/10"
                        }`}
                      >
                        <span className="text-[10px] uppercase block opacity-75">Pay Full Amount</span>
                        <span className="text-xs font-black block mt-0.5">
                          {formatPesewas(subtotalPesewas)}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Cancellation Policy Checkbox */}
                  <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-zinc-300 pt-1">
                    <input
                      type="checkbox"
                      checked={policyAgreed}
                      onChange={(e) => setPolicyAgreed(e.target.checked)}
                      className="mt-0.5 rounded border-white/30 bg-white/10 text-zinc-950 focus:ring-0 cursor-pointer"
                    />
                    <span>
                      I agree to the{" "}
                      <Link href="/policies" target="_blank" className="text-amber-200 underline font-bold">
                        Studio Policies
                      </Link>
                      , including the 24-hr reschedule window and 15-min grace period.
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* =====================================================================
                BOTTOM ACTION BAR (Sticky & Visible at all times with Live Cart Total)
            ===================================================================== */}
            <div className="pt-2.5 sm:pt-3 border-t border-white/10 flex items-center gap-2 shrink-0 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((step - 1) as 1 | 2 | 3 | 4)}
                  className="h-11 sm:h-12 px-4 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                >
                  Back
                </button>
              )}

              {step === 1 && (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={selectedServiceIds.length === 0}
                  className={`flex-1 h-11 sm:h-12 rounded-full font-black text-xs uppercase tracking-wider transition-all shadow-xl active:scale-98 flex items-center justify-between px-4 sm:px-5 cursor-pointer ${
                    selectedServiceIds.length > 0
                      ? "bg-white text-zinc-950 hover:bg-zinc-100"
                      : "bg-white/15 text-zinc-400 cursor-not-allowed opacity-60"
                  }`}
                >
                  <span className="font-bold text-[11px] sm:text-xs truncate mr-2">
                    {selectedServiceIds.length === 0
                      ? "Select treatment to continue"
                      : `${selectedServiceIds.length} selected • ${formatPesewas(subtotalPesewas)}`}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span>Date & Time</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              )}

              {step === 2 && (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!selectedSlot}
                  className={`flex-1 h-11 sm:h-12 rounded-full font-black text-xs uppercase tracking-wider transition-all shadow-xl active:scale-98 flex items-center justify-between px-4 sm:px-5 cursor-pointer ${
                    selectedSlot
                      ? "bg-white text-zinc-950 hover:bg-zinc-100"
                      : "bg-white/15 text-zinc-400 cursor-not-allowed opacity-60"
                  }`}
                >
                  <span className="font-bold text-[11px] sm:text-xs truncate mr-2">
                    {selectedSlot
                      ? new Date(selectedSlot.startUtc).toLocaleTimeString("en-GB", {
                          timeZone: "Africa/Accra",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })
                      : "Choose a time slot"}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span>Client Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              )}

              {step === 3 && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 h-11 sm:h-12 rounded-full bg-white text-zinc-950 hover:bg-zinc-100 font-black text-xs uppercase tracking-wider transition-all shadow-xl active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Review Booking</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {step === 4 && (
                <button
                  type="button"
                  disabled={submittingBooking || !policyAgreed || holdExpired}
                  onClick={handleFinalSubmit}
                  className="flex-1 h-11 sm:h-12 rounded-full bg-white text-zinc-950 hover:bg-zinc-100 font-black text-xs uppercase tracking-wider transition-all shadow-xl active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {submittingBooking
                      ? "Locking Slot..."
                      : `Confirm & Pay ${formatPesewas(paymentType === "DEPOSIT" ? depositPesewas : subtotalPesewas)}`}
                  </span>
                </button>
              )}
            </div>
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
        <div className="min-h-[85vh] flex items-center justify-center p-4">
          <div className="w-full max-w-[480px] h-[580px] rounded-[36px] bg-zinc-950/70 border border-white/10 animate-pulse" />
        </div>
      }
    >
      <BookingWizardContent />
    </React.Suspense>
  );
}
