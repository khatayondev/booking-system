import { EventEmitter } from "node:events";

export interface BookingEventPayload {
  type:
    | "CREATED"
    | "UPDATED"
    | "STATUS_CHANGED"
    | "RESCHEDULED"
    | "REASSIGNED"
    | "NOTE_ADDED"
    | "PAYMENT_REQUEST_SENT"
    | "PAYMENT_REQUEST_VIEWED"
    | "PAYMENT_REQUEST_PAID"
    | "PAYMENT_REQUEST_FAILED"
    | "PAYMENT_REQUEST_EXPIRED"
    | "PAYMENT_REQUEST_CANCELLED";
  bookingId: string;
  reference: string;
  status?: string;
  staffId?: string;
  paymentRequestId?: string;
  amountPesewas?: number;
  customerPhone?: string;
  message?: string;
  shortCode?: string;
  rawToken?: string;
  payUrl?: string;
  timestamp: string;
}

// Global singleton to persist across hot reloads in development
declare global {
  var __bookingEventsEmitter: EventEmitter | undefined;
}

const emitter = globalThis.__bookingEventsEmitter || new EventEmitter();
emitter.setMaxListeners(100);
if (process.env.NODE_ENV !== "production") {
  globalThis.__bookingEventsEmitter = emitter;
}

export function emitBookingEvent(payload: BookingEventPayload): void {
  try {
    emitter.emit("booking_event", payload);
  } catch (err) {
    console.error("Failed to emit booking event", err);
  }
}

export function subscribeToBookingEvents(
  listener: (payload: BookingEventPayload) => void
): () => void {
  emitter.on("booking_event", listener);
  return () => {
    emitter.off("booking_event", listener);
  };
}
