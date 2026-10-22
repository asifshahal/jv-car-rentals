import { describe, it, expect } from "vitest";
import { estimate, rentalDays, validate } from "./booking";
import { vehicles } from "@/config/business";

const ertiga = vehicles.find((v) => v.id === "ertiga")!;
const creta = vehicles.find((v) => v.id === "creta")!;

describe("pricing rules", () => {
  it("Ertiga self drive 2 days = ₹6,398", () => {
    expect(estimate(ertiga, "self", 2).total).toBe(6398);
  });
  it("Ertiga with driver 2 days adds ₹1,000/day = ₹8,398", () => {
    expect(estimate(ertiga, "driver", 2)).toMatchObject({ base: 6398, driver: 2000, total: 8398 });
  });
  it("Creta is ₹1,799/day with ₹7 extra km", () => {
    expect(estimate(creta, "self", 1).total).toBe(1799);
    expect(creta.extraKmPrice).toBe(7);
  });
  it("300 km included per day", () => {
    expect(estimate(creta, "self", 3).includedKm).toBe(900);
  });
});

describe("dates", () => {
  it("same-day counts as minimum 1 day", () => {
    expect(rentalDays("2026-10-25", "2026-10-25")).toBe(1);
  });
  it("return before pickup is invalid", () => {
    expect(rentalDays("2026-10-27", "2026-10-25")).toBeNull();
  });
  it("delivery requires a location", () => {
    const e = validate(
      {
        vehicle: ertiga,
        type: "self",
        pickup: "2026-11-01",
        ret: "2026-11-02",
        name: "Rahul",
        delivery: true,
        deliveryLocation: "",
      },
      "2026-10-22",
    );
    expect(e.deliveryLocation).toBeTruthy();
  });
});
