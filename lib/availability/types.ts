export interface TimeInterval {
  startUtc: Date;
  endUtc: Date;
}

export interface ServiceDurationItem {
  id: string;
  name: string;
  durationMin: number;
  bufferMin: number;
  pricePesewas: number;
}

export interface AddonDurationItem {
  id: string;
  name: string;
  durationMin: number;
  pricePesewas: number;
}

export interface AvailabilitySlotStaff {
  id: string;
  name: string;
  photoUrl?: string | null;
  specialties?: string[];
  loadScore?: number;
}

export interface AvailabilitySlot {
  startUtc: string; // ISO 8601 string
  endUtc: string; // ISO 8601 string
  available: boolean;
  durationMin: number;
  staffId: string;
  staffName: string;
  assignedStaff: AvailabilitySlotStaff;
  availableStaff?: AvailabilitySlotStaff[];
  pricePesewas: number;
}

export interface AvailabilityQueryInput {
  serviceIds: string[];
  addonIds?: string[];
  staffId?: string; // specific UUID, "any", or undefined
  startDate: string; // "YYYY-MM-DD" or ISO timestamp
  endDate: string; // "YYYY-MM-DD" or ISO timestamp
  now?: Date; // Injected for deterministic unit tests
}

export interface StaffShift {
  weekday: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // "09:00"
  endTime: string; // "18:00"
  breakStart?: string | null;
  breakEnd?: string | null;
  isDayOff?: boolean;
  active?: boolean;
}

export interface StaffScheduleRecord {
  id: string;
  name: string;
  photoUrl?: string | null;
  specialties: string[];
  schedules: StaffShift[];
  busyIntervals: TimeInterval[];
  currentLoad: number;
}

export interface HoldSlotInput {
  serviceIds: string[];
  addonIds?: string[];
  staffId?: string; // specific UUID or "any"
  startUtc: string; // ISO string
  endUtc?: string; // Optional (computed if omitted)
  holdDurationMin?: number; // Defaults to 10 min
  customerPhone?: string;
  now?: Date; // Injected for deterministic testing
}

export interface SlotHoldResult {
  id: string;
  token: string;
  staffId: string;
  staffName: string;
  serviceId: string;
  serviceIds: string[];
  addonIds: string[];
  startUtc: string;
  endUtc: string;
  expiresAt: string;
  holdDurationMin: number;
  extendedCount: number;
}
