import { NextRequest } from "next/server";
import { subscribeToBookingEvents, BookingEventPayload } from "@/lib/booking-events";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const ref = searchParams.get("ref") || searchParams.get("reference");
  const bookingId = searchParams.get("bookingId");

  if (!ref && !bookingId) {
    return new Response("Missing booking reference or id", { status: 400 });
  }

  // Verify booking exists
  const booking = await prisma.booking.findFirst({
    where: ref ? { reference: ref } : { id: bookingId! },
    select: { id: true, reference: true },
  });

  if (!booking) {
    return new Response("Booking not found", { status: 404 });
  }

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connection event
  const initialData = `data: ${JSON.stringify({
    type: "CONNECTED",
    bookingId: booking.id,
    reference: booking.reference,
    timestamp: new Date().toISOString(),
  })}\n\n`;
  writer.write(encoder.encode(initialData)).catch(() => {});

  // Subscribe to real-time events filtered to this specific booking
  const unsubscribe = subscribeToBookingEvents((event: BookingEventPayload) => {
    if (event.bookingId !== booking.id && event.reference !== booking.reference) {
      return;
    }

    const payload = `data: ${JSON.stringify(event)}\n\n`;
    writer.write(encoder.encode(payload)).catch(() => {});
  });

  // Keep alive with ping every 20 seconds
  const pingInterval = setInterval(() => {
    writer.write(encoder.encode(`: ping\n\n`)).catch(() => {});
  }, 20000);

  req.signal.addEventListener("abort", () => {
    clearInterval(pingInterval);
    unsubscribe();
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
