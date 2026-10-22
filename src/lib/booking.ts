import type { RentalType, Vehicle } from "@/config/business";

export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** Whole rental days between two yyyy-mm-dd dates. Same date counts as 1 day (24h). */
export function rentalDays(pickup: string, ret: string): number | null {
  const a = Date.parse(pickup + "T00:00:00Z");
  const b = Date.parse(ret + "T00:00:00Z");
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return null;
  return Math.max(1, Math.round((b - a) / 86400000));
}

export function estimate(v: Vehicle, type: RentalType, days: number) {
  const base = v.dailyPrice * days;
  const driver = type === "driver" ? v.driverFeePerDay * days : 0;
  return { base, driver, total: base + driver, includedKm: v.includedKmPerDay * days };
}

export function waNumber(raw: string) {
  return raw.replace(/\D/g, "");
}

export function waLink(number: string, message: string) {
  return `https://wa.me/${waNumber(number)}?text=${encodeURIComponent(message)}`;
}

export interface BookingInput {
  vehicle?: Vehicle;
  type?: RentalType;
  pickup: string;
  ret: string;
  name: string;
  delivery: boolean;
  deliveryLocation: string;
}

export function validate(i: BookingInput, today: string): Record<string, string> {
  const e: Record<string, string> = {};
  if (!i.vehicle) e.vehicle = "Please choose a car.";
  else if (!i.vehicle.available) e.vehicle = "This car is currently unavailable.";
  if (!i.type) e.type = "Please choose a rental type.";
  else if (i.vehicle && i.type === "self" && !i.vehicle.selfDrive)
    e.type = "Self drive isn't offered for this car.";
  else if (i.vehicle && i.type === "driver" && !i.vehicle.withDriver)
    e.type = "With driver isn't offered for this car.";
  if (!i.pickup) e.pickup = "Please choose a pickup date.";
  else if (i.pickup < today) e.pickup = "Pickup date can't be in the past.";
  if (!i.ret) e.ret = "Please choose a return date.";
  else if (i.pickup && rentalDays(i.pickup, i.ret) === null)
    e.ret = "Return date must be on or after the pickup date.";
  if (!i.name.trim()) e.name = "Please enter your name.";
  if (i.delivery && !i.deliveryLocation.trim())
    e.deliveryLocation = "Please tell us where to deliver the car.";
  return e;
}

const fmtDate = (d: string) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export function buildMessage(
  i: Required<Pick<BookingInput, "vehicle" | "type">> & BookingInput,
  businessName: string,
) {
  const days = rentalDays(i.pickup, i.ret)!;
  const est = estimate(i.vehicle, i.type, days);
  const lines = [
    `Hello ${businessName},`,
    "",
    `I would like to enquire about renting a ${i.vehicle.name}.`,
    "",
    `Name: ${i.name.trim()}`,
    `Rental Type: ${i.type === "self" ? "Self Drive" : "With Driver"}`,
    `Pickup Date: ${fmtDate(i.pickup)}`,
    `Return Date: ${fmtDate(i.ret)}`,
    `Duration: ${days} day${days > 1 ? "s" : ""}`,
    `Pickup/Delivery: ${i.delivery ? `Delivery requested — ${i.deliveryLocation.trim()}` : "Pickup from rental location"}`,
    "",
  ];
  if (i.type === "driver") {
    lines.push(`Base Rental: ${inr(est.base)}`, `Driver: ${inr(est.driver)}`);
  }
  lines.push(
    `Estimated Rental: ${inr(est.total)}`,
    "Fuel: Excluded",
    "",
    "Please confirm availability and the final rental charges.",
    "",
    "Thank you.",
  );
  return lines.join("\n");
}
