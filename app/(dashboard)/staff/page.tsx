"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ROLES, PERMISSION_KEYS } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/controls";
import { StatusChip } from "@/components/ui/status-chip";
import { Drawer, Dialog } from "@/components/ui/dialog-and-drawer";
import {
  Users,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  CalendarDays,
  Coffee,
  AlertTriangle,
  ArrowRight,
  Shield,
  Briefcase,
  Check,
  Palmtree,
  CalendarOff,
} from "lucide-react";

interface StaffServiceItem {
  id: string;
  serviceId: string;
  service: {
    id: string;
    name: string;
    pricePesewas: number;
    durationMin: number;
  };
}

interface ScheduleItem {
  id?: string;
  weekday: number;
  startTime: string;
  endTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  label?: string | null;
  isDayOff: boolean;
  active: boolean;
}

interface TimeOffItem {
  id: string;
  staffId: string;
  startUtc: string;
  endUtc: string;
  reason: string | null;
  approved: boolean;
}

interface BlockedTimeItem {
  id: string;
  staffId: string;
  startUtc: string;
  endUtc: string;
  reason: string | null;
}

interface StaffMember {
  id: string;
  name: string;
  phone: string | null;
  bio: string | null;
  photoUrl: string | null;
  specialties: string[];
  userId: string | null;
  active: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  staffServices: StaffServiceItem[];
  schedules: ScheduleItem[];
  timeOffs: TimeOffItem[];
  blockedTimes: BlockedTimeItem[];
}

interface AvailableService {
  id: string;
  name: string;
  durationMin: number;
  pricePesewas: number;
}

interface AvailableUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface ConflictingBooking {
  id: string;
  reference: string;
  status: string;
  startUtc: string;
  endUtc: string;
  customerName: string;
  customerPhone: string;
  services: string[];
}

interface EligibleCandidate {
  id: string;
  name: string;
  phone: string | null;
  specialties: string[];
}

const WEEKDAYS = [
  { day: "Monday", index: 1 },
  { day: "Tuesday", index: 2 },
  { day: "Wednesday", index: 3 },
  { day: "Thursday", index: 4 },
  { day: "Friday", index: 5 },
  { day: "Saturday", index: 6 },
  { day: "Sunday", index: 0 },
];

export default function StaffAndSchedulesPage() {
  const [activeTab, setActiveTab] = React.useState<"staff" | "schedules" | "exceptions">("staff");
  const [staffList, setStaffList] = React.useState<StaffMember[]>([]);
  const [services, setServices] = React.useState<AvailableService[]>([]);
  const [users, setUsers] = React.useState<AvailableUser[]>([]);
  const [currentUserRole, setCurrentUserRole] = React.useState<string>("OWNER_ADMIN");
  const [isLoading, setIsLoading] = React.useState(true);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Selected staff for schedule or exception management
  const [selectedStaffId, setSelectedStaffId] = React.useState<string>("");

  // Staff Drawer State (Add / Edit)
  const [staffDrawerOpen, setStaffDrawerOpen] = React.useState(false);
  const [editingStaff, setEditingStaff] = React.useState<StaffMember | null>(null);
  const [formName, setFormName] = React.useState("");
  const [formPhone, setFormPhone] = React.useState("");
  const [formBio, setFormBio] = React.useState("");
  const [formPhotoUrl, setFormPhotoUrl] = React.useState("");
  const [formSpecialties, setFormSpecialties] = React.useState<string>("");
  const [formUserId, setFormUserId] = React.useState<string>("");
  const [formServiceIds, setFormServiceIds] = React.useState<string[]>([]);
  const [formActive, setFormActive] = React.useState(true);
  const [isSavingStaff, setIsSavingStaff] = React.useState(false);

  // Schedule Drawer State
  const [scheduleModalOpen, setScheduleModalOpen] = React.useState(false);
  const [editingScheduleStaff, setEditingScheduleStaff] = React.useState<StaffMember | null>(null);
  const [draftShifts, setDraftShifts] = React.useState<ScheduleItem[]>([]);
  const [isSavingSchedule, setIsSavingSchedule] = React.useState(false);

  // Time-Off / Blocked Time Drawer State
  const [timeOffModalOpen, setTimeOffModalOpen] = React.useState(false);
  const [timeOffType, setTimeOffType] = React.useState<"LEAVE" | "BLOCKED">("LEAVE");
  const [timeOffStaffId, setTimeOffStaffId] = React.useState("");
  const [timeOffStartDate, setTimeOffStartDate] = React.useState("");
  const [timeOffStartTime, setTimeOffStartTime] = React.useState("09:00");
  const [timeOffEndDate, setTimeOffEndDate] = React.useState("");
  const [timeOffEndTime, setTimeOffEndTime] = React.useState("18:00");
  const [timeOffReason, setTimeOffReason] = React.useState("");
  const [isSavingTimeOff, setIsSavingTimeOff] = React.useState(false);

  // Conflict Resolution Modal State
  const [conflictModalOpen, setConflictModalOpen] = React.useState(false);
  const [conflictingBookings, setConflictingBookings] = React.useState<ConflictingBookingSummaryUI[]>([]);
  const [selectedConflictBooking, setSelectedConflictBooking] = React.useState<ConflictingBookingSummaryUI | null>(null);
  const [eligibleStaffForConflict, setEligibleStaffForConflict] = React.useState<EligibleCandidate[]>([]);
  const [selectedReassignStaffId, setSelectedReassignStaffId] = React.useState("");
  const [rescheduleDate, setRescheduleDate] = React.useState("");
  const [rescheduleTime, setRescheduleTime] = React.useState("10:00");
  const [isResolvingConflict, setIsResolvingConflict] = React.useState(false);

  // Bulk Holiday Block Modal State
  const [holidayModalOpen, setHolidayModalOpen] = React.useState(false);
  const [holidayName, setHolidayName] = React.useState("");
  const [holidayDate, setHolidayDate] = React.useState("");
  const [isSavingHoliday, setIsSavingHoliday] = React.useState(false);

  interface ConflictingBookingSummaryUI extends ConflictingBooking {
    resolved?: boolean;
    resolutionNote?: string;
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const isStaffReadOnly = currentUserRole === "STAFF_RECEPTIONIST";

  // Fetch initial data
  const loadData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/staff");
      if (res.ok) {
        const json = await res.json();
        setStaffList(json.data.staff || []);
        setServices(json.data.services || []);
        setUsers(json.data.users || []);
        if (json.data.currentUserRole) {
          setCurrentUserRole(json.data.currentUserRole);
        }
        if (json.data.staff && json.data.staff.length > 0 && !selectedStaffId) {
          setSelectedStaffId(json.data.staff[0].id);
        }
      }

      // Check current user role fallback
      const overviewRes = await fetch("/api/dashboard/overview");
      if (overviewRes.ok) {
        const oJson = await overviewRes.json();
        if (oJson.data?.user?.role) {
          setCurrentUserRole(oJson.data.user.role);
        }
      }
    } catch {
      showToast("Error loading staff information");
    } finally {
      setIsLoading(false);
    }
  }, [selectedStaffId]);

  React.useEffect(() => {
    let ignore = false;
    async function init() {
      if (!ignore) {
        await loadData();
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [loadData]);

  // Open Add Staff Drawer
  const handleOpenAddStaff = () => {
    setEditingStaff(null);
    setFormName("");
    setFormPhone("");
    setFormBio("");
    setFormPhotoUrl("");
    setFormSpecialties("");
    setFormUserId("");
    setFormServiceIds([]);
    setFormActive(true);
    setStaffDrawerOpen(true);
  };

  // Open Edit Staff Drawer
  const handleOpenEditStaff = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormName(staff.name);
    setFormPhone(staff.phone || "");
    setFormBio(staff.bio || "");
    setFormPhotoUrl(staff.photoUrl || "");
    setFormSpecialties(staff.specialties.join(", "));
    setFormUserId(staff.userId || "");
    setFormServiceIds(staff.staffServices.map((s) => s.serviceId));
    setFormActive(staff.active);
    setStaffDrawerOpen(true);
  };

  // Save Staff (Create / Update)
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStaffReadOnly) return;
    try {
      setIsSavingStaff(true);
      const specialtiesArray = formSpecialties
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        name: formName,
        phone: formPhone || undefined,
        bio: formBio || undefined,
        photoUrl: formPhotoUrl || undefined,
        specialties: specialtiesArray,
        userId: formUserId || null,
        serviceIds: formServiceIds,
        active: formActive,
      };

      const url = editingStaff ? `/api/admin/staff/${editingStaff.id}` : "/api/admin/staff";
      const method = editingStaff ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error?.message || "Failed to save staff member");
      }

      showToast(editingStaff ? "Staff profile updated" : "New staff member added");
      setStaffDrawerOpen(false);
      await loadData();
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || "Failed to save staff profile");
    } finally {
      setIsSavingStaff(false);
    }
  };

  // Soft-Delete Staff
  const handleDeleteStaff = async (staffId: string) => {
    if (isStaffReadOnly) return;
    if (!confirm("Are you sure you want to deactivate and remove this staff member?")) return;
    try {
      const res = await fetch(`/api/admin/staff/${staffId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete staff member");
      showToast("Staff member deactivated");
      await loadData();
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message);
    }
  };

  // Open Schedule Editor for Staff
  const handleOpenScheduleEditor = (staff: StaffMember) => {
    setEditingScheduleStaff(staff);
    // Deep clone schedules or initialize empty shifts for 7 days
    const currentSchedules: ScheduleItem[] = staff.schedules.map((s) => ({ ...s }));
    setDraftShifts(currentSchedules);
    setScheduleModalOpen(true);
  };

  // Add a new shift to a specific weekday
  const handleAddShift = (weekday: number) => {
    const newShift: ScheduleItem = {
      weekday,
      startTime: "09:00",
      endTime: "18:00",
      breakStart: "13:00",
      breakEnd: "14:00",
      label: "Regular Shift",
      isDayOff: false,
      active: true,
    };
    setDraftShifts([...draftShifts, newShift]);
  };

  // Remove a shift
  const handleRemoveShift = (index: number) => {
    const copy = [...draftShifts];
    copy.splice(index, 1);
    setDraftShifts(copy);
  };

  // Update a shift field
  const handleUpdateShift = (index: number, field: keyof ScheduleItem, value: unknown) => {
    const copy = [...draftShifts];
    copy[index] = { ...copy[index], [field]: value };
    setDraftShifts(copy);
  };

  // Save Shifts (Validates overlapping shifts)
  const handleSaveSchedule = async () => {
    if (!editingScheduleStaff || isStaffReadOnly) return;
    try {
      setIsSavingSchedule(true);
      const res = await fetch(`/api/admin/staff/${editingScheduleStaff.id}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedules: draftShifts }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to update shifts. Please ensure shifts do not overlap.");
      }

      showToast("Weekly shifts and working hours updated");
      setScheduleModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message);
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Open Time Off / Blocked Time Drawer
  const handleOpenTimeOff = (staffId?: string, type: "LEAVE" | "BLOCKED" = "LEAVE") => {
    setTimeOffType(type);
    setTimeOffStaffId(staffId || selectedStaffId || (staffList[0]?.id || ""));
    const todayStr = new Date().toISOString().split("T")[0];
    setTimeOffStartDate(todayStr);
    setTimeOffEndDate(todayStr);
    setTimeOffStartTime("09:00");
    setTimeOffEndTime("18:00");
    setTimeOffReason("");
    setTimeOffModalOpen(true);
  };

  // Save Time-Off / Blocked Time
  const handleSaveTimeOff = async (force = false) => {
    if (!timeOffStaffId || isStaffReadOnly) return;
    try {
      setIsSavingTimeOff(true);
      const startIso = new Date(`${timeOffStartDate}T${timeOffStartTime}:00Z`).toISOString();
      const endIso = new Date(`${timeOffEndDate}T${timeOffEndTime}:00Z`).toISOString();

      const endpoint =
        timeOffType === "LEAVE"
          ? `/api/admin/staff/${timeOffStaffId}/time-off`
          : `/api/admin/staff/${timeOffStaffId}/blocked-time`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startUtc: startIso,
          endUtc: endIso,
          reason: timeOffReason || (timeOffType === "LEAVE" ? "Personal Leave" : "Blocked Time"),
          force,
        }),
      });

      const json = await res.json();

      if (res.status === 409 && json.conflict) {
        // Conflicts detected! Open resolution dialog
        const affected: ConflictingBookingSummaryUI[] = json.error?.affectedBookings || [];
        setConflictingBookings(affected);
        if (affected.length > 0) {
          handleSelectConflictBooking(affected[0]);
        }
        setConflictModalOpen(true);
        setTimeOffModalOpen(false);
        return;
      }

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to schedule time off");
      }

      showToast(timeOffType === "LEAVE" ? "Leave scheduled successfully" : "Blocked time recorded");
      setTimeOffModalOpen(false);
      setConflictModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message);
    } finally {
      setIsSavingTimeOff(false);
    }
  };

  // Select a conflicting booking to fetch alternative staff
  const handleSelectConflictBooking = async (booking: ConflictingBookingSummaryUI) => {
    setSelectedConflictBooking(booking);
    setSelectedReassignStaffId("");
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/eligible-staff`);
      if (res.ok) {
        const json = await res.json();
        setEligibleStaffForConflict(json.data.eligibleStaff || []);
        if (json.data.eligibleStaff?.length > 0) {
          setSelectedReassignStaffId(json.data.eligibleStaff[0].id);
        }
      }
    } catch {
      // quiet fallback
    }
  };

  // Reassign Conflicting Booking
  const handleReassignBooking = async () => {
    if (!selectedConflictBooking || !selectedReassignStaffId) return;
    try {
      setIsResolvingConflict(true);
      const res = await fetch(`/api/admin/bookings/${selectedConflictBooking.id}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newStaffId: selectedReassignStaffId }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error?.message || "Reassignment failed");
      }

      showToast(`Booking ${selectedConflictBooking.reference} successfully reassigned`);

      // Mark this booking as resolved in local state
      const updated = conflictingBookings.map((b) =>
        b.id === selectedConflictBooking.id
          ? { ...b, resolved: true, resolutionNote: "Reassigned to colleague" }
          : b
      );
      setConflictingBookings(updated);

      // Check if all are resolved
      const remaining = updated.filter((b) => !b.resolved);
      if (remaining.length === 0) {
        // Complete the leave block automatically!
        await handleSaveTimeOff(true);
      } else {
        handleSelectConflictBooking(remaining[0]);
      }
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message);
    } finally {
      setIsResolvingConflict(false);
    }
  };

  // Reschedule Conflicting Booking
  const handleRescheduleBooking = async () => {
    if (!selectedConflictBooking || !rescheduleDate || !rescheduleTime) {
      showToast("Please choose a new date and time");
      return;
    }
    try {
      setIsResolvingConflict(true);
      const startIso = new Date(`${rescheduleDate}T${rescheduleTime}:00Z`).toISOString();
      const endIso = new Date(
        new Date(`${rescheduleDate}T${rescheduleTime}:00Z`).getTime() + 90 * 60000
      ).toISOString();

      const res = await fetch(`/api/admin/bookings/${selectedConflictBooking.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newStartUtc: startIso,
          newEndUtc: endIso,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error?.message || "Rescheduling failed");
      }

      showToast(`Booking ${selectedConflictBooking.reference} rescheduled to ${rescheduleDate} ${rescheduleTime}`);

      const updated = conflictingBookings.map((b) =>
        b.id === selectedConflictBooking.id
          ? { ...b, resolved: true, resolutionNote: `Rescheduled to ${rescheduleDate}` }
          : b
      );
      setConflictingBookings(updated);

      const remaining = updated.filter((b) => !b.resolved);
      if (remaining.length === 0) {
        await handleSaveTimeOff(true);
      } else {
        handleSelectConflictBooking(remaining[0]);
      }
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message);
    } finally {
      setIsResolvingConflict(false);
    }
  };

  // Save Bulk Holiday Block
  const handleSaveHolidayBlock = async (force = false) => {
    if (!holidayName || !holidayDate || isStaffReadOnly) return;
    try {
      setIsSavingHoliday(true);
      const startIso = new Date(`${holidayDate}T00:00:00Z`).toISOString();
      const endIso = new Date(`${holidayDate}T23:59:59Z`).toISOString();

      const res = await fetch("/api/admin/staff/holiday-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holidayName,
          startUtc: startIso,
          endUtc: endIso,
          force,
        }),
      });

      const json = await res.json();

      if (res.status === 409 && json.conflict) {
        showToast("Holiday block conflicts with existing bookings. Please review staff schedules.");
        return;
      }

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to block holiday");
      }

      showToast(`Bulk holiday "${holidayName}" blocked across all active staff`);
      setHolidayModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message);
    } finally {
      setIsSavingHoliday(false);
    }
  };

  // Delete exception (TimeOff or BlockedTime)
  const handleDeleteTimeOff = async (id: string, type: "TIMEOFF" | "BLOCKED") => {
    if (isStaffReadOnly) return;
    if (!confirm("Are you sure you want to remove this exception?")) return;
    try {
      const endpoint =
        type === "TIMEOFF"
          ? `/api/admin/staff/time-off/${id}`
          : `/api/admin/staff/blocked-time/${id}`;

      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete exception");
      showToast("Exception removed");
      await loadData();
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message);
    }
  };

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId) || staffList[0];

  return (
    <RoleGuard
      allowedRoles={[ROLES.OWNER_ADMIN, ROLES.MANAGER]}
      requiredPermission={PERMISSION_KEYS.STAFF_MANAGE}
      pageTitle="Staff & Shift Management"
      activePath="/staff"
    >
      <AppShell activePath="/staff">
      <div className="space-y-6">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#1E1E1E] text-white px-5 py-3 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2 border border-white/10 animate-in fade-in slide-in-from-bottom-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Read-Only Notice for Staff/Receptionist */}
        {isStaffReadOnly && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Read-Only Access:</strong> Staff & Receptionists can view staff rosters, shifts and exceptions. Management changes require Manager or Owner role.
              </span>
            </div>
            <StatusChip label="Read Only" status="amber" />
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1E1E1E] flex items-center gap-2.5">
              <Users className="w-6 h-6 text-[#1E1E1E]" />
              Staff, Shifts & Rosters
            </h1>
            <p className="text-xs text-[#71717A] mt-1">
              Configure stylist profiles, multiple working shifts, break windows, days off, and holiday exceptions.
            </p>
          </div>

          {/* Action Buttons */}
          {!isStaffReadOnly && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outlinePill"
                size="sm"
                onClick={() => setHolidayModalOpen(true)}
                className="rounded-full text-xs h-9 gap-1.5 cursor-pointer bg-white"
              >
                <Palmtree className="w-3.5 h-3.5" />
                <span>Bulk Block Holiday</span>
              </Button>
              <Button
                variant="outlinePill"
                size="sm"
                onClick={() => handleOpenTimeOff(selectedStaffId, "LEAVE")}
                className="rounded-full text-xs h-9 gap-1.5 cursor-pointer bg-white"
              >
                <CalendarOff className="w-3.5 h-3.5" />
                <span>Add Time Off</span>
              </Button>
              <Button
                size="sm"
                onClick={handleOpenAddStaff}
                className="bg-[#1E1E1E] text-white hover:bg-black rounded-full text-xs h-9 px-4 gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Team Member</span>
              </Button>
            </div>
          )}
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-[#F4F4F6] pb-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("staff")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "staff"
                ? "bg-[#1E1E1E] text-white shadow-xs"
                : "text-[#71717A] hover:text-[#1E1E1E] hover:bg-black/5"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team Directory ({staffList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("schedules")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "schedules"
                ? "bg-[#1E1E1E] text-white shadow-xs"
                : "text-[#71717A] hover:text-[#1E1E1E] hover:bg-black/5"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Weekly Shifts & Breaks</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("exceptions")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "exceptions"
                ? "bg-[#1E1E1E] text-white shadow-xs"
                : "text-[#71717A] hover:text-[#1E1E1E] hover:bg-black/5"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Calendar Exceptions & Leave</span>
          </button>
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-48 rounded-2xl bg-[#F4F4F6] animate-pulse" />
            ))}
          </div>
        )}

        {/* TAB 1: TEAM DIRECTORY */}
        {!isLoading && activeTab === "staff" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {staffList.map((staff) => (
                <div
                  key={staff.id}
                  className="rounded-3xl bg-white p-5 border border-black/5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all group"
                >
                  <div className="space-y-4">
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#1E1E1E] text-white flex items-center justify-center font-bold text-sm shrink-0 border border-black/5">
                          {staff.photoUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={staff.photoUrl}
                              alt={staff.name}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            staff.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[#1E1E1E] leading-tight">
                            {staff.name}
                          </h3>
                          <p className="text-[11px] text-[#71717A] mt-0.5">
                            {staff.phone || (staff.user ? staff.user.email : "No phone registered")}
                          </p>
                        </div>
                      </div>
                      <StatusChip
                        label={staff.active ? "Active" : "Inactive"}
                        status={staff.active ? "green" : "grey"}
                      />
                    </div>

                    {/* Bio */}
                    {staff.bio && (
                      <p className="text-xs text-[#71717A] line-clamp-2 italic">
                        &quot;{staff.bio}&quot;
                      </p>
                    )}

                    {/* Specialties */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                        Specialties
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {staff.specialties.length > 0 ? (
                          staff.specialties.map((spec, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F4F4F6] text-[#1E1E1E]"
                            >
                              {spec}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-[#A1A1AA]">General Stylist</span>
                        )}
                      </div>
                    </div>

                    {/* Assigned Services Count */}
                    <div className="p-2.5 rounded-xl bg-[#F4F4F6]/60 border border-black/5 flex items-center justify-between text-xs">
                      <span className="text-[#71717A] flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-[#1E1E1E]" />
                        Services Performed
                      </span>
                      <span className="font-bold text-[#1E1E1E]">
                        {staff.staffServices.length} assigned
                      </span>
                    </div>

                    {/* Linked User Login Indicator */}
                    <div className="flex items-center gap-1.5 text-[11px] text-[#71717A]">
                      <Shield className="w-3 h-3 text-[#1E1E1E]" />
                      <span>
                        Login Account:{" "}
                        <strong className="text-[#1E1E1E]">
                          {staff.user ? staff.user.email : "None (Profile only)"}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-4 mt-4 border-t border-[#F4F4F6] flex items-center justify-between gap-2">
                    <Button
                      variant="outlinePill"
                      size="sm"
                      onClick={() => handleOpenScheduleEditor(staff)}
                      className="rounded-full text-xs h-8 px-3 gap-1 cursor-pointer bg-white"
                    >
                      <Clock className="w-3 h-3" />
                      <span>Shifts</span>
                    </Button>

                    {!isStaffReadOnly && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditStaff(staff)}
                          className="rounded-full text-xs h-8 px-2.5 text-[#71717A] hover:text-[#1E1E1E] cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="rounded-full text-xs h-8 px-2.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: WEEKLY SHIFTS & BREAKS */}
        {!isLoading && activeTab === "schedules" && (
          <div className="space-y-6">
            {/* Staff Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <span className="text-xs font-bold text-[#71717A] shrink-0 mr-1">Stylist:</span>
              {staffList.map((staff) => (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => setSelectedStaffId(staff.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    selectedStaff?.id === staff.id
                      ? "bg-[#1E1E1E] text-white shadow-xs"
                      : "bg-white text-[#71717A] hover:bg-[#F4F4F6] border border-black/5"
                  }`}
                >
                  {staff.name}
                </button>
              ))}
            </div>

            {selectedStaff && (
              <div className="rounded-3xl bg-white p-6 border border-black/5 space-y-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F4F4F6] pb-4">
                  <div>
                    <h2 className="text-base font-bold text-[#1E1E1E]">
                      Weekly Schedule: {selectedStaff.name}
                    </h2>
                    <p className="text-xs text-[#71717A] mt-0.5">
                      Configure multiple shifts per day, scheduled breaks, and rest days. Shifts cannot overlap.
                    </p>
                  </div>
                  {!isStaffReadOnly && (
                    <Button
                      size="sm"
                      onClick={() => handleOpenScheduleEditor(selectedStaff)}
                      className="bg-[#1E1E1E] text-white hover:bg-black rounded-full text-xs h-8 px-4 gap-1.5 cursor-pointer self-start sm:self-auto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Shifts & Breaks</span>
                    </Button>
                  )}
                </div>

                {/* Day-by-Day View */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {WEEKDAYS.map(({ day, index }) => {
                    const dayShifts = selectedStaff.schedules.filter(
                      (s) => s.weekday === index && s.active && !s.isDayOff
                    );
                    const isDayOff = dayShifts.length === 0;

                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-2xl border transition-all ${
                          isDayOff
                            ? "bg-[#F4F4F6]/40 border-black/5 opacity-80"
                            : "bg-white border-black/10 shadow-xs"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-xs text-[#1E1E1E]">{day}</span>
                          <StatusChip
                            label={isDayOff ? "Day Off" : `${dayShifts.length} Shift(s)`}
                            status={isDayOff ? "grey" : "green"}
                          />
                        </div>

                        {isDayOff ? (
                          <div className="py-4 text-center text-xs text-[#A1A1AA] flex flex-col items-center gap-1">
                            <Coffee className="w-5 h-5 text-[#A1A1AA]/50" />
                            <span>Off duty</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {dayShifts.map((shift, sIdx) => (
                              <div
                                key={sIdx}
                                className="p-2.5 rounded-xl bg-[#F4F4F6]/70 border border-black/5 text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between font-semibold text-[#1E1E1E]">
                                  <span>{shift.label || `Shift ${sIdx + 1}`}</span>
                                  <span className="font-mono text-[11px]">
                                    {shift.startTime} – {shift.endTime}
                                  </span>
                                </div>
                                {shift.breakStart && shift.breakEnd && (
                                  <div className="flex items-center gap-1 text-[10px] text-[#71717A]">
                                    <Coffee className="w-3 h-3 text-[#1E1E1E]" />
                                    <span>
                                      Break: {shift.breakStart} – {shift.breakEnd}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CALENDAR EXCEPTIONS & LEAVE */}
        {!isLoading && activeTab === "exceptions" && (
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-6 border border-black/5 space-y-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F4F4F6] pb-4">
                <div>
                  <h2 className="text-base font-bold text-[#1E1E1E]">
                    Upcoming Time-Off & Blocked Times
                  </h2>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    Manage studio holidays, sick leave, compassionate leave, and custom blocked periods.
                  </p>
                </div>
                {!isStaffReadOnly && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outlinePill"
                      size="sm"
                      onClick={() => handleOpenTimeOff(selectedStaffId, "BLOCKED")}
                      className="rounded-full text-xs h-8 px-3 gap-1.5 cursor-pointer bg-white"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Block Time Slot</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleOpenTimeOff(selectedStaffId, "LEAVE")}
                      className="bg-[#1E1E1E] text-white hover:bg-black rounded-full text-xs h-8 px-4 gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Request Leave</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Exceptions Table */}
              <div className="space-y-4">
                {staffList.every((s) => s.timeOffs.length === 0 && s.blockedTimes.length === 0) ? (
                  <div className="py-12 text-center text-xs text-[#71717A] space-y-2">
                    <Calendar className="w-8 h-8 text-[#A1A1AA] mx-auto opacity-40" />
                    <p className="font-semibold text-[#1E1E1E]">No scheduled leave or blocked times</p>
                    <p className="text-[11px] text-[#A1A1AA]">
                      All active staff members are operating on standard weekly shift schedules.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {staffList.flatMap((staff) => [
                      ...staff.timeOffs.map((t) => ({
                        id: t.id,
                        staffName: staff.name,
                        type: "LEAVE" as const,
                        start: new Date(t.startUtc).toLocaleString("en-GB", { timeZone: "Africa/Accra" }),
                        end: new Date(t.endUtc).toLocaleString("en-GB", { timeZone: "Africa/Accra" }),
                        reason: t.reason || "Approved Leave",
                        rawItem: t,
                      })),
                      ...staff.blockedTimes.map((b) => ({
                        id: b.id,
                        staffName: staff.name,
                        type: "BLOCKED" as const,
                        start: new Date(b.startUtc).toLocaleString("en-GB", { timeZone: "Africa/Accra" }),
                        end: new Date(b.endUtc).toLocaleString("en-GB", { timeZone: "Africa/Accra" }),
                        reason: b.reason || "Blocked Period",
                        rawItem: b,
                      })),
                    ]).map((exc) => (
                      <div
                        key={exc.id}
                        className="p-4 rounded-2xl bg-[#F4F4F6]/50 border border-black/5 flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-[#1E1E1E]">{exc.staffName}</span>
                            <StatusChip
                              label={exc.type === "LEAVE" ? "Leave" : "Blocked"}
                              status={exc.type === "LEAVE" ? "amber" : "grey"}
                            />
                          </div>
                          <p className="text-[11px] font-semibold text-[#1E1E1E]">{exc.reason}</p>
                          <p className="text-[10px] text-[#71717A] font-mono">
                            {exc.start} <br />
                            to {exc.end}
                          </p>
                        </div>

                        {!isStaffReadOnly && (
                          <div className="flex justify-end pt-2 border-t border-black/5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTimeOff(exc.id, exc.type === "LEAVE" ? "TIMEOFF" : "BLOCKED")}
                              className="text-rose-500 hover:text-rose-700 h-7 px-2 text-xs rounded-full cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              <span>Remove</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DRAWER: Add / Edit Staff Member */}
      <Drawer
        isOpen={staffDrawerOpen}
        onClose={() => setStaffDrawerOpen(false)}
        title={editingStaff ? "Edit Staff Profile" : "Add New Staff Member"}
        side="right"
      >
        <form onSubmit={handleSaveStaff} className="space-y-5 pt-3">
          <div className="space-y-1.5">
            <Label htmlFor="staff-name">Full Name *</Label>
            <Input
              id="staff-name"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Jessica Kyei"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="staff-phone">Ghana Phone Number</Label>
            <Input
              id="staff-phone"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="e.g. 024 111 2233"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="staff-photo">Photo URL</Label>
            <Input
              id="staff-photo"
              value={formPhotoUrl}
              onChange={(e) => setFormPhotoUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="staff-bio">Stylist Biography</Label>
            <Input
              id="staff-bio"
              value={formBio}
              onChange={(e) => setFormBio(e.target.value)}
              placeholder="Senior Lash Technician with 5 years experience..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="staff-specialties">Specialties (comma-separated)</Label>
            <Input
              id="staff-specialties"
              value={formSpecialties}
              onChange={(e) => setFormSpecialties(e.target.value)}
              placeholder="Bridal Makeup, Volume Lashes, Brow Lamination"
            />
          </div>

          {/* Optional User Login Account */}
          <div className="space-y-1.5">
            <Label htmlFor="staff-user">Link to Login Account (Optional)</Label>
            <select
              id="staff-user"
              value={formUserId}
              onChange={(e) => setFormUserId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-black/10 bg-white text-xs focus:ring-2 focus:ring-black/20 outline-none"
            >
              <option value="">No login account (Profile only)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-[#71717A]">
              Allows the staff member to log in to the dashboard with this user credential.
            </p>
          </div>

          {/* Service Assignment */}
          <div className="space-y-2 pt-2 border-t border-[#F4F4F6]">
            <Label>Assigned Services (Can perform)</Label>
            <div className="max-h-48 overflow-y-auto space-y-1.5 p-3 rounded-2xl bg-[#F4F4F6]/50 border border-black/5">
              {services.map((svc) => {
                const checked = formServiceIds.includes(svc.id);
                return (
                  <label
                    key={svc.id}
                    className="flex items-center gap-2.5 text-xs text-[#1E1E1E] cursor-pointer hover:bg-black/5 p-1.5 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormServiceIds([...formServiceIds, svc.id]);
                        } else {
                          setFormServiceIds(formServiceIds.filter((id) => id !== svc.id));
                        }
                      }}
                      className="rounded border-black/20 text-[#1E1E1E] focus:ring-0"
                    />
                    <span className="font-medium">{svc.name}</span>
                    <span className="text-[10px] text-[#71717A] ml-auto">
                      {svc.durationMin} min
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4">
            <Button
              type="submit"
              disabled={isSavingStaff}
              className="flex-1 bg-[#1E1E1E] text-white hover:bg-black rounded-full text-xs h-10 cursor-pointer shadow-md"
            >
              {isSavingStaff ? "Saving..." : editingStaff ? "Save Profile" : "Create Staff Profile"}
            </Button>
            <Button
              type="button"
              variant="outlinePill"
              onClick={() => setStaffDrawerOpen(false)}
              className="rounded-full text-xs h-10 px-5 cursor-pointer"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Drawer>

      {/* MODAL: Edit Weekly Schedule with Multiple Shifts */}
      <Dialog
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title={`Weekly Schedule: ${editingScheduleStaff?.name}`}
        description="Configure multiple shifts per day, meal breaks, and rest days. Validation guarantees shifts cannot overlap."
      >
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {WEEKDAYS.map(({ day, index }) => {
            const dayShifts = draftShifts.map((s, idx) => ({ ...s, originalIdx: idx })).filter((s) => s.weekday === index);

            return (
              <div key={index} className="p-4 rounded-2xl bg-[#F4F4F6]/50 border border-black/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#1E1E1E]">{day}</span>
                  <Button
                    type="button"
                    variant="outlinePill"
                    size="sm"
                    onClick={() => handleAddShift(index)}
                    className="h-7 px-2.5 rounded-full text-[11px] gap-1 cursor-pointer bg-white"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Shift</span>
                  </Button>
                </div>

                {dayShifts.length === 0 ? (
                  <p className="text-xs text-[#A1A1AA] italic">Day Off (No shifts scheduled)</p>
                ) : (
                  <div className="space-y-3">
                    {dayShifts.map((shift) => (
                      <div
                        key={shift.originalIdx}
                        className="p-3 rounded-xl bg-white border border-black/10 shadow-xs space-y-2 text-xs"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px]">Start Time</Label>
                            <Input
                              type="time"
                              value={shift.startTime}
                              onChange={(e) => handleUpdateShift(shift.originalIdx, "startTime", e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px]">End Time</Label>
                            <Input
                              type="time"
                              value={shift.endTime}
                              onChange={(e) => handleUpdateShift(shift.originalIdx, "endTime", e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>

                        {/* Break inputs */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-black/5">
                          <div>
                            <Label className="text-[10px] text-[#71717A]">Break Start (Optional)</Label>
                            <Input
                              type="time"
                              value={shift.breakStart || ""}
                              onChange={(e) => handleUpdateShift(shift.originalIdx, "breakStart", e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-[#71717A]">Break End</Label>
                            <Input
                              type="time"
                              value={shift.breakEnd || ""}
                              onChange={(e) => handleUpdateShift(shift.originalIdx, "breakEnd", e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <Input
                            placeholder="Shift Label (e.g. Morning Shift)"
                            value={shift.label || ""}
                            onChange={(e) => handleUpdateShift(shift.originalIdx, "label", e.target.value)}
                            className="h-7 text-[11px] max-w-[200px]"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveShift(shift.originalIdx)}
                            className="text-rose-500 hover:text-rose-700 h-7 px-2 text-xs rounded-full cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            <span>Remove</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pt-4 border-t border-[#F4F4F6] mt-4">
          <Button
            type="button"
            disabled={isSavingSchedule}
            onClick={handleSaveSchedule}
            className="flex-1 bg-[#1E1E1E] text-white hover:bg-black rounded-full text-xs h-10 cursor-pointer shadow-md"
          >
            {isSavingSchedule ? "Validating & Saving..." : "Save Schedule & Shifts"}
          </Button>
          <Button
            type="button"
            variant="outlinePill"
            onClick={() => setScheduleModalOpen(false)}
            className="rounded-full text-xs h-10 px-5 cursor-pointer"
          >
            Cancel
          </Button>
        </div>
      </Dialog>

      {/* MODAL: Request Leave or Block Time Slot */}
      <Dialog
        isOpen={timeOffModalOpen}
        onClose={() => setTimeOffModalOpen(false)}
        title={timeOffType === "LEAVE" ? "Schedule Staff Leave" : "Block Specific Time Window"}
        description="If this blocked period conflicts with active appointments, you will be prompted to reassign or reschedule."
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Staff Member</Label>
            <select
              value={timeOffStaffId}
              onChange={(e) => setTimeOffStaffId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-black/10 bg-white text-xs outline-none"
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={timeOffStartDate}
                onChange={(e) => setTimeOffStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={timeOffStartTime}
                onChange={(e) => setTimeOffStartTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input
                type="date"
                value={timeOffEndDate}
                onChange={(e) => setTimeOffEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End Time</Label>
              <Input
                type="time"
                value={timeOffEndTime}
                onChange={(e) => setTimeOffEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Reason for Leave / Block</Label>
            <Input
              placeholder="e.g. Annual Vacation, Dental Appointment, Staff Training"
              value={timeOffReason}
              onChange={(e) => setTimeOffReason(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 pt-4">
            <Button
              type="button"
              disabled={isSavingTimeOff}
              onClick={() => handleSaveTimeOff(false)}
              className="flex-1 bg-[#1E1E1E] text-white hover:bg-black rounded-full text-xs h-10 cursor-pointer shadow-md"
            >
              {isSavingTimeOff ? "Checking Conflicts..." : "Schedule Exception"}
            </Button>
            <Button
              type="button"
              variant="outlinePill"
              onClick={() => setTimeOffModalOpen(false)}
              className="rounded-full text-xs h-10 px-5 cursor-pointer"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>

      {/* MODAL: Booking Conflict Resolution (Reassign or Reschedule) */}
      <Dialog
        isOpen={conflictModalOpen}
        onClose={() => setConflictModalOpen(false)}
        title="⚠️ Booking Conflicts Detected"
        description="The requested leave or blocked period conflicts with existing scheduled customer bookings. Please reassign or reschedule them to protect customer appointments."
      >
        <div className="space-y-5 pt-2 max-h-[75vh] overflow-y-auto pr-1">
          {/* Conflicting Appointments List */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-[#1E1E1E]">Affected Bookings ({conflictingBookings.length})</Label>
            <div className="space-y-2">
              {conflictingBookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => handleSelectConflictBooking(b)}
                  className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                    selectedConflictBooking?.id === b.id
                      ? "bg-[#1E1E1E] text-white border-black"
                      : b.resolved
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800 opacity-60"
                      : "bg-[#F4F4F6]/60 border-black/5 hover:border-black/20"
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>{b.reference}</span>
                    <StatusChip
                      label={b.resolved ? "Resolved" : b.status}
                      status={b.resolved ? "green" : "amber"}
                    />
                  </div>
                  <div className="text-[11px] opacity-80 mt-1">
                    Customer: {b.customerName} ({b.customerPhone})
                  </div>
                  <div className="text-[10px] opacity-70 font-mono mt-0.5">
                    {b.services.join(", ")} •{" "}
                    {new Date(b.startUtc).toLocaleTimeString("en-GB", { timeZone: "Africa/Accra", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Options for Selected Booking */}
          {selectedConflictBooking && !selectedConflictBooking.resolved && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Resolve {selectedConflictBooking.reference}</span>
              </div>

              {/* Option A: Reassign to Colleague */}
              <div className="space-y-2 bg-white p-3.5 rounded-xl border border-black/5">
                <p className="text-xs font-bold text-[#1E1E1E]">Option 1: Reassign to Available Colleague</p>
                {eligibleStaffForConflict.length === 0 ? (
                  <p className="text-[11px] text-[#71717A] italic">
                    No other stylist is available with matching services for this time slot.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={selectedReassignStaffId}
                      onChange={(e) => setSelectedReassignStaffId(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-black/10 bg-white text-xs outline-none"
                    >
                      {eligibleStaffForConflict.map((cand) => (
                        <option key={cand.id} value={cand.id}>
                          {cand.name} (Specialties: {cand.specialties.join(", ") || "General"})
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      disabled={isResolvingConflict || !selectedReassignStaffId}
                      onClick={handleReassignBooking}
                      className="w-full bg-[#1E1E1E] text-white hover:bg-black rounded-full text-xs h-8 cursor-pointer gap-1.5 shadow-sm"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Reassign to Colleague & Proceed</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Option B: Reschedule Booking */}
              <div className="space-y-2 bg-white p-3.5 rounded-xl border border-black/5">
                <p className="text-xs font-bold text-[#1E1E1E]">Option 2: Reschedule to Another Day</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <Button
                  type="button"
                  variant="outlinePill"
                  disabled={isResolvingConflict || !rescheduleDate}
                  onClick={handleRescheduleBooking}
                  className="w-full rounded-full text-xs h-8 cursor-pointer bg-white"
                >
                  <span>Reschedule Booking & Proceed</span>
                </Button>
              </div>
            </div>
          )}

          {/* Forced Override Button */}
          <div className="pt-3 border-t border-[#F4F4F6] flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleSaveTimeOff(true)}
              className="text-rose-600 hover:text-rose-800 text-xs rounded-full h-8 cursor-pointer"
            >
              <span>Force Save Leave (Ignore Conflicts)</span>
            </Button>
            <Button
              type="button"
              variant="outlinePill"
              onClick={() => setConflictModalOpen(false)}
              className="rounded-full text-xs h-8 px-4 cursor-pointer"
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* MODAL: Bulk Block Holiday */}
      <Dialog
        isOpen={holidayModalOpen}
        onClose={() => setHolidayModalOpen(false)}
        title="🌴 Bulk Block Holiday"
        description="Blocks the entire working day across all active stylists simultaneously for studio closures or national public holidays."
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="holiday-name">Holiday / Closure Name *</Label>
            <Input
              id="holiday-name"
              placeholder="e.g. Ghana Independence Day, Boxing Day"
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="holiday-date">Holiday Date *</Label>
            <Input
              id="holiday-date"
              type="date"
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
            />
          </div>

          <div className="p-3 rounded-2xl bg-[#F4F4F6]/70 border border-black/5 text-xs text-[#71717A] space-y-1">
            <p className="font-semibold text-[#1E1E1E]">Applicability:</p>
            <p>
              This will block appointments for <strong>all {staffList.length} active stylists</strong> from 00:00 to 23:59 UTC on {holidayDate || "the selected date"}.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-3">
            <Button
              type="button"
              disabled={isSavingHoliday || !holidayName || !holidayDate}
              onClick={() => handleSaveHolidayBlock(false)}
              className="flex-1 bg-[#1E1E1E] text-white hover:bg-black rounded-full text-xs h-10 cursor-pointer shadow-md"
            >
              {isSavingHoliday ? "Applying Bulk Block..." : "Apply Holiday Block"}
            </Button>
            <Button
              type="button"
              variant="outlinePill"
              onClick={() => setHolidayModalOpen(false)}
              className="rounded-full text-xs h-10 px-5 cursor-pointer"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </AppShell>
    </RoleGuard>
  );
}
