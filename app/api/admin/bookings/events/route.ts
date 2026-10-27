import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { can, PERMISSION_KEYS } from "@/lib/rbac";
import { subscribeToBookingEvents, BookingEventPayload } from "@/lib/booking-events";


export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const canViewAll = can(session, PERMISSION_KEYS.BOOKINGS_VIEW_ALL);
  const canViewOwn = can(session, PERMISSION_KEYS.BOOKINGS_VIEW_OWN);
  if (!canViewAll && !canViewOwn) {
    return new Response("Forbidden", { status: 403 });
  }

  const staffId = session.staffId;
  const userSeesOnlyOwn = !canViewAll;

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connected event
  const initialData = `data: ${JSON.stringify({ type: "CONNECTED", staffId, timestamp: new Date().toISOString() })}\n\n`;
  writer.write(encoder.encode(initialData)).catch(() => {});

  // Subscribe to real-time events
  const unsubscribe = subscribeToBookingEvents((event: BookingEventPayload) => {
    // If staff only sees their own bookings, filter events not pertaining to them
    if (userSeesOnlyOwn && staffId && event.staffId && event.staffId !== staffId) {
      return;
    }

    const payload = `data: ${JSON.stringify(event)}\n\n`;
    writer.write(encoder.encode(payload)).catch(() => {});
  });

  // Keep connection alive with periodic pings every 25 seconds
  const pingInterval = setInterval(() => {
    writer.write(encoder.encode(`: ping\n\n`)).catch(() => {});
  }, 25000);

  req.signal.addEventListener("abort", () => {
    clearInterval(pingInterval);
    unsubscribe();
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
