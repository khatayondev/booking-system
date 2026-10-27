import { ServiceDurationItem, AddonDurationItem } from "./types";

export interface BookingDurationSummary {
  serviceDurationMin: number;
  bufferMin: number;
  addonDurationMin: number;
  totalDurationMin: number;
  totalPricePesewas: number;
}

/**
 * Computes the total appointment duration and price.
 * Total duration = sum(service.durationMin) + sum(service.bufferMin) + sum(addon.durationMin).
 * Stored money is in integer pesewas.
 */
export function calculateBookingDuration(
  services: ServiceDurationItem[],
  addons: AddonDurationItem[] = []
): BookingDurationSummary {
  if (services.length === 0) {
    return {
      serviceDurationMin: 0,
      bufferMin: 0,
      addonDurationMin: 0,
      totalDurationMin: 0,
      totalPricePesewas: 0,
    };
  }

  const serviceDurationMin = services.reduce((acc, s) => acc + Math.max(0, s.durationMin), 0);
  const bufferMin = services.reduce((acc, s) => acc + Math.max(0, s.bufferMin || 0), 0);
  const addonDurationMin = addons.reduce((acc, a) => acc + Math.max(0, a.durationMin || 0), 0);

  const totalPricePesewas =
    services.reduce((acc, s) => acc + Math.max(0, s.pricePesewas), 0) +
    addons.reduce((acc, a) => acc + Math.max(0, a.pricePesewas), 0);

  const totalDurationMin = serviceDurationMin + bufferMin + addonDurationMin;

  return {
    serviceDurationMin,
    bufferMin,
    addonDurationMin,
    totalDurationMin,
    totalPricePesewas,
  };
}
