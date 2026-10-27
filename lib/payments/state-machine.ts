import { AppError } from "@/lib/api-response";
import { PaymentStatusType, BookingStatusType } from "./types";

/**
 * Permitted transitions for PaymentStatus.
 * Key: current status, Value: array of allowed next statuses.
 */
export const ALLOWED_PAYMENT_TRANSITIONS: Record<PaymentStatusType, PaymentStatusType[]> = {
  PENDING: ["PAID", "FAILED"],
  PAID: ["REFUNDED", "PARTIALLY_REFUNDED"],
  FAILED: [], // Terminal
  REFUNDED: [], // Terminal
  PARTIALLY_REFUNDED: ["REFUNDED"],
};

/**
 * Permitted transitions for BookingStatus.
 */
export const ALLOWED_BOOKING_TRANSITIONS: Record<BookingStatusType, BookingStatusType[]> = {
  HELD: ["PENDING_PAYMENT", "CANCELLED"],
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["COMPLETED", "CANCELLED", "NO_SHOW"],
  COMPLETED: [], // Terminal
  CANCELLED: [], // Terminal
  NO_SHOW: [], // Terminal
};

/**
 * Checks whether a payment transition is valid according to the state machine.
 */
export function canTransitionPayment(
  current: PaymentStatusType,
  next: PaymentStatusType
): boolean {
  if (current === next) return true; // Idempotent same-state is allowed
  return ALLOWED_PAYMENT_TRANSITIONS[current]?.includes(next) ?? false;
}

/**
 * Validates payment transition or throws AppError.
 */
export function assertPaymentTransition(
  current: PaymentStatusType,
  next: PaymentStatusType
): void {
  if (!canTransitionPayment(current, next)) {
    throw new AppError(
      `Illegal payment transition from ${current} to ${next}`,
      400,
      "INVALID_PAYMENT_TRANSITION"
    );
  }
}

/**
 * Checks whether a booking transition is valid according to the state machine.
 */
export function canTransitionBooking(
  current: BookingStatusType,
  next: BookingStatusType
): boolean {
  if (current === next) return true; // Idempotent same-state
  return ALLOWED_BOOKING_TRANSITIONS[current]?.includes(next) ?? false;
}

/**
 * Validates booking transition or throws AppError.
 */
export function assertBookingTransition(
  current: BookingStatusType,
  next: BookingStatusType
): void {
  if (!canTransitionBooking(current, next)) {
    throw new AppError(
      `Illegal booking transition from ${current} to ${next}`,
      400,
      "INVALID_BOOKING_TRANSITION"
    );
  }
}

export interface BookingDepositCheck {
  status: BookingStatusType;
  totalPesewas: number;
  depositRequiredPesewas: number;
  amountPaidPesewas: number;
}

/**
 * Guard confirming that a booking can be officially confirmed:
 * 1. Currency must be GHS
 * 2. Cumulative paid amount must be at least the required deposit
 * 3. Booking must be in an eligible state (HELD or PENDING_PAYMENT)
 */
export function assertCanConfirmBooking(
  booking: BookingDepositCheck,
  incomingPaidPesewas: number,
  currency: string
): void {
  if (currency.toUpperCase() !== "GHS") {
    throw new AppError(
      `Invalid payment currency: expected GHS, received ${currency}`,
      400,
      "CURRENCY_MISMATCH"
    );
  }

  const cumulativePaid = booking.amountPaidPesewas + incomingPaidPesewas;
  if (cumulativePaid < booking.depositRequiredPesewas) {
    throw new AppError(
      `Insufficient payment amount: received ${cumulativePaid} pesewas, but deposit requires at least ${booking.depositRequiredPesewas} pesewas`,
      400,
      "INSUFFICIENT_DEPOSIT_AMOUNT"
    );
  }

  if (booking.status !== "PENDING_PAYMENT" && booking.status !== "HELD" && booking.status !== "CONFIRMED") {
    throw new AppError(
      `Cannot confirm booking in status "${booking.status}"`,
      400,
      "INVALID_BOOKING_STATUS"
    );
  }
}
