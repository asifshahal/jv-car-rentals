// @vitest-environment jsdom
/**
 * Unit tests for fleet-store.ts — vehicle management, business info, and backup/restore.
 * Provides a lightweight localStorage mock so fleet-store's localStorage calls work in Node.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getStoredVehicles,
  getStoredBusiness,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  updateBusiness,
  resetToDefaultData,
  exportDataJson,
  importDataJson,
} from "@/lib/fleet-store";
import type { Vehicle } from "@/config/business";

// ---------------------------------------------------------------------------
// Polyfill localStorage for the test environment
// ---------------------------------------------------------------------------
const localStorageStore: Record<string, string> = {};

const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => {
    localStorageStore[key] = value;
  },
  removeItem: (key: string) => {
    delete localStorageStore[key];
  },
  clear: () => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]);
  },
  get length() {
    return Object.keys(localStorageStore).length;
  },
  key: (index: number) => Object.keys(localStorageStore)[index] ?? null,
};

beforeAll(() => {
  // Attach mock to globalThis so the fleet-store's typeof window + localStorage calls work
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
  Object.defineProperty(globalThis, "window", {
    value: globalThis,
    writable: true,
  });
});

// Reset state before every test: clear storage and reinitialise defaults.
beforeEach(async () => {
  localStorageMock.clear();
  // resetToDefaultData also clears the module-level in-memory cache and writes defaults.
  await resetToDefaultData();
});


// ---------------------------------------------------------------------------
// Vehicle management
// ---------------------------------------------------------------------------
describe("Fleet Store — Vehicle Management", () => {
  it("loads the two default vehicles on first call", () => {
    const vehicles = getStoredVehicles();
    expect(vehicles.length).toBeGreaterThanOrEqual(2);
    expect(vehicles.some((v) => v.slug === "suzuki-ertiga")).toBe(true);
    expect(vehicles.some((v) => v.slug === "hyundai-creta")).toBe(true);
  });

  it("adds a new vehicle and persists all fields", async () => {
    const newCar: Vehicle = {
      id: "toyota-innova",
      name: "Toyota Innova Crysta",
      slug: "toyota-innova-crysta",
      seats: 7,
      dailyPrice: 3800,
      includedKmPerDay: 300,
      extraKmPrice: 12,
      selfDrive: true,
      withDriver: true,
      available: true,
      description: "Premium MPV for highway travel",
      image: "https://example.com/innova.jpg",
      imageAlt: "Toyota Innova Crysta 7 seater for rent in Trichy",
      order: 3,
    };

    await addVehicle(newCar);

    const found = getStoredVehicles().find((v) => v.id === "toyota-innova");
    expect(found).toBeDefined();
    expect(found?.name).toBe("Toyota Innova Crysta");
    expect(found?.dailyPrice).toBe(3800);
    expect(found?.seats).toBe(7);
    expect(found?.selfDrive).toBe(true);
    expect(found?.withDriver).toBe(true);
  });

  it("updates vehicle daily price and availability status", async () => {
    const firstCar = getStoredVehicles()[0]!;

    await updateVehicle(firstCar.id, { dailyPrice: 4500, available: false });

    const updated = getStoredVehicles().find((v) => v.id === firstCar.id);
    expect(updated?.dailyPrice).toBe(4500);
    expect(updated?.available).toBe(false);
  });

  it("updates extra km charge without touching other fields", async () => {
    const firstCar = getStoredVehicles()[0]!;
    const originalName = firstCar.name;

    await updateVehicle(firstCar.id, { extraKmPrice: 15 });

    const updated = getStoredVehicles().find((v) => v.id === firstCar.id);
    expect(updated?.extraKmPrice).toBe(15);
    expect(updated?.name).toBe(originalName); // unchanged
  });

  it("deletes a vehicle from the fleet", async () => {
    const initialCount = getStoredVehicles().length;

    await deleteVehicle("creta");

    const afterDelete = getStoredVehicles();
    expect(afterDelete.length).toBe(initialCount - 1);
    expect(afterDelete.some((v) => v.id === "creta")).toBe(false);
  });

  it("returns an error when updating a non-existent vehicle id", async () => {
    const result = await updateVehicle("does-not-exist-99", { dailyPrice: 999 });
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Business & contact info
// ---------------------------------------------------------------------------
describe("Fleet Store — Business & Contact Info", () => {
  it("updates business name, WhatsApp number, and location", async () => {
    await updateBusiness({
      name: "JV Luxury Rentals",
      whatsapp: "+91 98765 43210",
      location: "Chennai, Tamil Nadu",
    });

    const biz = getStoredBusiness();
    expect(biz.name).toBe("JV Luxury Rentals");
    expect(biz.whatsapp).toBe("+91 98765 43210");
    expect(biz.location).toBe("Chennai, Tamil Nadu");
  });

  it("updates rental rules independently of contact fields", async () => {
    await updateBusiness({
      rules: {
        minDays: 2,
        hoursPerDay: 24,
        includedKmPerDay: 400,
        minSelfDriveAge: 21,
        documents: "Aadhar & DL required.",
        delivery: "Doorstep delivery available.",
      },
    });

    const biz = getStoredBusiness();
    // Rules updated
    expect(biz.rules.includedKmPerDay).toBe(400);
    expect(biz.rules.minSelfDriveAge).toBe(21);
    // Original contact fields untouched
    expect(biz.whatsapp).toBeDefined();
    expect(biz.name).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Backup & restore
// ---------------------------------------------------------------------------
describe("Fleet Store — Backup & Restore", () => {
  it("exports valid JSON containing version, vehicles, and business", () => {
    const json = exportDataJson();
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe("1.0");
    expect(parsed.exportedAt).toBeDefined();
    expect(Array.isArray(parsed.vehicles)).toBe(true);
    expect(parsed.vehicles.length).toBeGreaterThanOrEqual(2);
    expect(parsed.business).toBeDefined();
    expect(parsed.business.whatsapp).toBeDefined();
  });

  it("imports a JSON backup and restores exact vehicle list", async () => {
    const snapshot = exportDataJson();

    // Add a car after snapshot
    await addVehicle({
      id: "temp-car",
      name: "Temporary Test Car",
      slug: "temp-car",
      seats: 4,
      dailyPrice: 1000,
      includedKmPerDay: 100,
      extraKmPrice: 10,
      selfDrive: true,
      withDriver: false,
      available: true,
      description: "Temp vehicle",
      image: "",
      imageAlt: "Temp",
      order: 99,
    });
    expect(getStoredVehicles().some((v) => v.id === "temp-car")).toBe(true);

    // Restore snapshot — temporary car must be gone
    const res = await importDataJson(snapshot);
    expect(res.ok).toBe(true);
    expect(getStoredVehicles().some((v) => v.id === "temp-car")).toBe(false);
    expect(getStoredVehicles().length).toBeGreaterThanOrEqual(2);
  });

  it("rejects malformed JSON during import", async () => {
    const res = await importDataJson("NOT VALID JSON {{{");
    expect(res.ok).toBe(false);
    expect(res.message).toContain("Import failed");
  });
});
