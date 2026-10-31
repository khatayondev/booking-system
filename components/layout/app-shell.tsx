"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  LayoutDashboard,
  Scissors,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  Bell,
  Search,
  Plus,
  Menu,
  Crown,
  ShieldCheck,
  Palette,
  ChevronDown,
  ShoppingBag,
  Send,
  CalendarPlus,
  Phone,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Drawer, Dialog } from "@/components/ui/dialog-and-drawer";
import { Input, Label } from "@/components/ui/controls";
import { StatusChip } from "@/components/ui/status-chip";
import { InstallPwaButton } from "@/components/pwa/install-pwa-button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface SearchResult {
  id: string;
  reference: string;
  title: string;
  subtitle: string;
  phone: string;
  status: string;
  staffName: string;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

export function AppShell({
  children,
  activePath = "/dashboard",
  userName = "Akosua",
}: {
  children: React.ReactNode;
  activePath?: string;
  userName?: string;
}) {
  const router = useRouter();
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);
  const [createDropdownOpen, setCreateDropdownOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [searchModalOpen, setSearchModalOpen] = React.useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  // Notifications state
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);

  React.useEffect(() => {
    let active = true;
    const load = () => {
      fetch("/api/dashboard/notifications")
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (active && json?.data?.notifications) {
            setNotifications(json.data.notifications);
          }
        })
        .catch(() => {});
    };

    load();
    const interval = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    try {
      await fetch("/api/dashboard/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
    } catch {
      // quiet
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    try {
      await fetch("/api/dashboard/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });
    } catch {
      // quiet
    }
  };

  // Modal actions
  const [newBookingModalOpen, setNewBookingModalOpen] = React.useState(false);
  const [paymentRequestModalOpen, setPaymentRequestModalOpen] = React.useState(false);

  // Form states for modals
  const [reqPhone, setReqPhone] = React.useState("");
  const [reqAmount, setReqAmount] = React.useState("");
  const [reqNotes, setReqNotes] = React.useState("");
  const [reqSubmitted, setReqSubmitted] = React.useState(false);

  // Search handler
  React.useEffect(() => {
    let ignore = false;
    const timer = setTimeout(async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(`/api/dashboard/search?q=${encodeURIComponent(searchQuery)}`);
        if (!ignore && res.ok) {
          const json = await res.json();
          setSearchResults(json.data.results);
        }
      } catch {
        // quiet error
      } finally {
        if (!ignore) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Handle Escape key to dismiss popovers & modals
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCreateDropdownOpen(false);
        setNotificationsOpen(false);
        setSearchModalOpen(false);
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navSections: NavSection[] = [
    {
      title: "Core",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
        { label: "Bookings", href: "/bookings", icon: <Calendar className="w-4 h-4" /> },
        { label: "POS Checkout", href: "/pos", icon: <CreditCard className="w-4 h-4" /> },
        { label: "Customers", href: "/customers", icon: <UserCheck className="w-4 h-4" /> },
      ],
    },
    {
      title: "Management",
      items: [
        { label: "Users & Roles", href: "/dashboard/users", icon: <ShieldCheck className="w-4 h-4" /> },
        { label: "Services & Pricing", href: "/services", icon: <Scissors className="w-4 h-4" /> },
        // Solo direct shop mode: Stylist management hidden for direct operation
        // { label: "Staff & Shifts", href: "/staff", icon: <Users className="w-4 h-4" /> },
        { label: "Design System", href: "/design", icon: <Palette className="w-4 h-4" /> },
      ],
    },
    {
      title: "Business",
      items: [
        { label: "Sales & Reports", href: "/reports", icon: <BarChart3 className="w-4 h-4" /> },
        { label: "Audit Logs", href: "/audit", icon: <ShieldCheck className="w-4 h-4" /> },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between select-none">
      <div>
        {/* Brand */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-3 py-3 mb-6 rounded-2xl hover:bg-white/5 transition-colors group"
        >
          <div className="w-9 h-9 rounded-2xl bg-zinc-900 border border-white/15 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0 group-hover:border-amber-400/50 transition-colors">
            <Crown className="w-4 h-4 text-amber-300" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-extrabold text-white tracking-tight leading-tight uppercase">BECCA&apos;S CROWN</h1>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">Beauty Vault • Accra</p>
          </div>
        </Link>

        {/* Nav Sections */}
        <div className="space-y-6">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {section.title && (
                <p className="px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => {
                const isActive = activePath === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-semibold transition-all",
                      isActive
                        ? "bg-white text-zinc-950 font-bold shadow-md"
                        : "text-zinc-300 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Settings at Bottom */}
      <div className="pt-4 border-t border-white/10 space-y-2 mt-6">
        <InstallPwaButton variant="sidebar" />
        <Link
          href="/settings"
          onClick={() => setMobileDrawerOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-semibold transition-all text-zinc-300 hover:text-white hover:bg-white/10",
            activePath === "/settings" && "bg-white text-zinc-950 font-bold shadow-md"
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </Link>
      </div>
    </div>
  );

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="min-h-screen bg-[#F4F4F6] text-[#1E1E1E] flex flex-row antialiased">
      {/* 1. Desktop Static Full-Height Pure Black Sidebar */}
      <aside className="hidden lg:flex w-64 h-screen sticky top-0 shrink-0 bg-black text-white border-r border-white/10 p-5 flex-col justify-between overflow-y-auto z-40">
        {sidebarContent}
      </aside>

      {/* 2. Mobile Drawer with matching full black background and white content */}
      <Drawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        title="Becca's Crown Beauty Vault"
        side="left"
        className="bg-black text-white border-r border-white/10"
      >
        {sidebarContent}
      </Drawer>

      {/* 3. Main Dashboard Body (Header + Content) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-black/5 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <Button
              variant="circularIcon"
              size="iconSm"
              className="lg:hidden"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open sidebar menu"
            >
              <Menu className="w-4 h-4" />
            </Button>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#1E1E1E] tracking-tight">
                Hi, {userName}!
              </h2>
              <p className="text-xs text-[#71717A] hidden sm:block">
                Welcome to your studio overview for today.
              </p>
            </div>
          </div>

          {/* Top Bar Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <InstallPwaButton variant="header" />
            {/* Search Trigger Button */}
            <Button
              variant="circularIcon"
              size="iconSm"
              aria-label="Search bookings, customers, phone numbers"
              onClick={() => setSearchModalOpen(true)}
              className="cursor-pointer"
            >
              <Search className="w-4 h-4 text-[#71717A]" />
            </Button>

            {/* Notifications with Live Badge */}
            <div className="relative">
              <Button
                variant="circularIcon"
                size="iconSm"
                aria-label="Notifications"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="cursor-pointer"
              >
                <Bell className="w-4 h-4 text-[#71717A]" />
              </Button>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#EF4444] text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center px-1 shadow-xs">
                  {unreadCount}
                </span>
              )}

              {/* Notifications Popover */}
              {notificationsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setNotificationsOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-white border border-[#E4E4E7] shadow-2xl p-4 z-40 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-3 border-b border-[#F4F4F6]">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <h4 className="text-xs font-bold text-[#1E1E1E]">Live Studio Feed</h4>
                      </div>
                      <span className="text-[11px] text-[#71717A]">{unreadCount} unread</span>
                    </div>

                    <div className="divide-y divide-[#F4F4F6] max-h-72 overflow-y-auto my-2">
                      {notifications.map((item) => (
                        <div
                          key={item.id}
                          className="py-3 px-1 hover:bg-[#FAFAFB] rounded-xl transition-colors cursor-pointer"
                          onClick={() => {
                            handleMarkAsRead(item.id);
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h5 className="text-xs font-bold text-[#1E1E1E]">{item.title}</h5>
                            <span className="text-[10px] text-[#A1A1AA]">{item.time}</span>
                          </div>
                          <p className="text-[11px] text-[#71717A] mt-1 leading-snug">
                            {item.message}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-[#F4F4F6] text-center">
                      <button
                        type="button"
                        onClick={() => {
                          handleMarkAllAsRead();
                          setNotificationsOpen(false);
                        }}
                        className="text-[11px] font-semibold text-[#1E1E1E] hover:underline cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Black Pill 'Create' Dropdown Button */}
            <div className="relative">
              <Button
                variant="blackPill"
                size="sm"
                className="gap-1.5 shadow-sm cursor-pointer"
                onClick={() => setCreateDropdownOpen(!createDropdownOpen)}
                aria-expanded={createDropdownOpen}
                aria-haspopup="true"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create</span>
                <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
              </Button>

              {createDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setCreateDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-[#1E1E1E] text-white border border-white/10 shadow-2xl p-1.5 z-40 animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      onClick={() => {
                        setCreateDropdownOpen(false);
                        setNewBookingModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl text-left hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <CalendarPlus className="w-4 h-4 text-white/80" />
                      <span>New Booking</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCreateDropdownOpen(false);
                        setPaymentRequestModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl text-left hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Send className="w-4 h-4 text-white/80" />
                      <span>Payment Request</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCreateDropdownOpen(false);
                        router.push("/pos");
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl text-left hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4 text-white/80" />
                      <span>Walk-in Sale (POS)</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Circular avatar */}
            <div className="w-9 h-9 rounded-full bg-[#1E1E1E] text-white border-2 border-white shadow-xs flex items-center justify-center text-xs font-bold shrink-0">
              {userName.charAt(0)}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-[1600px] mx-auto min-w-0">
          {children}
        </main>
      </div>

      {/* GLOBAL SEARCH DIALOG MODAL */}
      <Dialog
        isOpen={searchModalOpen}
        onClose={() => {
          setSearchModalOpen(false);
          setSearchQuery("");
          setSearchResults([]);
        }}
        title="Global Search"
        description="Search customers, appointments, Paystack references, and Ghana phone numbers."
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-3.5 pointer-events-none" />
            <Input
              autoFocus
              placeholder="Type customer name, +233 phone, or BK-..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 text-xs rounded-2xl"
            />
          </div>

          <div className="min-h-[160px] max-h-80 overflow-y-auto divide-y divide-[#F4F4F6]">
            {isSearching ? (
              <p className="text-center py-8 text-xs text-[#71717A]">Searching database...</p>
            ) : searchResults.length > 0 ? (
              searchResults.map((res) => (
                <div
                  key={res.id}
                  onClick={() => setSearchModalOpen(false)}
                  className="py-3 px-2 hover:bg-[#FAFAFB] rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-[#1E1E1E]">{res.title}</h4>
                      <span className="text-[10px] font-mono text-[#71717A]">{res.reference}</span>
                    </div>
                    <p className="text-[11px] text-[#71717A] mt-0.5">{res.subtitle}</p>
                    <p className="text-[10px] text-[#A1A1AA] flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      <span>{res.phone}</span>
                    </p>
                  </div>
                  <StatusChip
                    status={res.status === "CONFIRMED" || res.status === "COMPLETED" ? "green" : "amber"}
                    label={res.status}
                  />
                </div>
              ))
            ) : searchQuery.length >= 2 ? (
              <p className="text-center py-8 text-xs text-[#71717A]">
                No matching customers or bookings found for &quot;{searchQuery}&quot;.
              </p>
            ) : (
              <p className="text-center py-8 text-xs text-[#A1A1AA]">
                Type at least 2 characters to search studio records.
              </p>
            )}
          </div>
        </div>
      </Dialog>

      {/* NEW BOOKING MODAL */}
      <Dialog
        isOpen={newBookingModalOpen}
        onClose={() => setNewBookingModalOpen(false)}
        title="Schedule New Appointment"
        description="Book a client session with automatic duration and station buffer checking."
      >
        <div className="space-y-4">
          <div>
            <Label>Client Name</Label>
            <Input placeholder="e.g. Efua Mansa" />
          </div>
          <div>
            <Label>Ghana Mobile Phone (+233 or 0XX)</Label>
            <Input placeholder="024 123 4567" />
          </div>
          <div>
            <Label>Service Category</Label>
            <select className="w-full h-11 px-4 text-xs bg-white border border-[#E4E4E7] rounded-2xl text-[#1E1E1E] focus:outline-none focus:border-[#1E1E1E]">
              <option>Bridal Soft Glam (GH₵ 550.00)</option>
              <option>Hybrid Volume Lash Full Set (GH₵ 280.00)</option>
              <option>Goddess Knotless Braids (GH₵ 350.00)</option>
              <option>Luxury Evening Gown Rental (GH₵ 450.00)</option>
            </select>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="outlinePill"
              size="sm"
              onClick={() => setNewBookingModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="blackPill"
              size="sm"
              onClick={() => {
                setNewBookingModalOpen(false);
                router.push("/pos");
              }}
            >
              Proceed to Slot Selection
            </Button>
          </div>
        </div>
      </Dialog>

      {/* PAYMENT REQUEST MODAL */}
      <Dialog
        isOpen={paymentRequestModalOpen}
        onClose={() => {
          setPaymentRequestModalOpen(false);
          setReqSubmitted(false);
        }}
        title="Send Mobile Money Payment Request"
        description="Dispatch Paystack MoMo or Card prompt via SMS to the customer."
      >
        {reqSubmitted ? (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs space-y-2">
            <p className="font-bold">Payment Request Dispatched</p>
            <p>
              SMS with payment link sent to {reqPhone}. Status will update automatically when the customer authorizes their MoMo prompt.
            </p>
            <Button
              variant="blackPill"
              size="sm"
              className="mt-3 w-full"
              onClick={() => {
                setPaymentRequestModalOpen(false);
                setReqSubmitted(false);
              }}
            >
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Customer Mobile Money Phone</Label>
              <Input
                placeholder="e.g. 024 555 1234 (MTN / Telecel / AT)"
                value={reqPhone}
                onChange={(e) => setReqPhone(e.target.value)}
              />
            </div>
            <div>
              <Label>Amount (GH₵)</Label>
              <Input
                placeholder="e.g. 250.00"
                value={reqAmount}
                onChange={(e) => setReqAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Purpose / Service Note</Label>
              <Input
                placeholder="e.g. Bridal makeup deposit"
                value={reqNotes}
                onChange={(e) => setReqNotes(e.target.value)}
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="outlinePill"
                size="sm"
                onClick={() => setPaymentRequestModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="blackPill"
                size="sm"
                onClick={() => setReqSubmitted(true)}
              >
                Send Request
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
