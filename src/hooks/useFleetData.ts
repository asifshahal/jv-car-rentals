/**
 * React hooks for reactive access to fleet and business data.
 * Re-renders components automatically when vehicles or business info change.
 */
import { useEffect, useState } from "react";
import type { Vehicle, FaqItem } from "@/config/business";
import {
  getStoredVehicles,
  getStoredBusiness,
  initializeStoreListeners,
  EVENT_FLEET_CHANGED,
  EVENT_BUSINESS_CHANGED,
  type BusinessInfo,
} from "@/lib/fleet-store";

let initialized = false;

function ensureInitialized() {
  if (typeof window !== "undefined" && !initialized) {
    initialized = true;
    initializeStoreListeners();
  }
}

/**
 * Hook to access and observe the entire fleet.
 */
export function useFleet() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => getStoredVehicles());

  useEffect(() => {
    ensureInitialized();

    const handler = () => {
      setVehicles([...getStoredVehicles()]);
    };

    window.addEventListener(EVENT_FLEET_CHANGED, handler);
    // Initial sync
    handler();

    return () => {
      window.removeEventListener(EVENT_FLEET_CHANGED, handler);
    };
  }, []);

  const activeVehicles = vehicles
    .filter((v) => v.available !== false)
    .sort((a, b) => a.order - b.order);

  return {
    vehicles,
    activeVehicles,
    totalCount: vehicles.length,
    activeCount: activeVehicles.length,
  };
}

/**
 * Hook to access and observe business and contact information.
 */
export function useBusiness() {
  const [business, setBusiness] = useState<BusinessInfo>(() => getStoredBusiness());

  useEffect(() => {
    ensureInitialized();

    const handler = () => {
      setBusiness({ ...getStoredBusiness() });
    };

    window.addEventListener(EVENT_BUSINESS_CHANGED, handler);
    // Initial sync
    handler();

    return () => {
      window.removeEventListener(EVENT_BUSINESS_CHANGED, handler);
    };
  }, []);

  return { business };
}

/**
 * Hook providing dynamic rental rules based on current business rules and fleet.
 */
export function useDynamicRentalRules(): string[] {
  const { activeVehicles } = useFleet();
  const { business } = useBusiness();
  const r = business.rules;

  return [
    `Minimum rental period: ${r.minDays} day`,
    `Each rental day is ${r.hoursPerDay} hours`,
    `${r.includedKmPerDay} km is included per rental day`,
    "Additional kilometres are charged separately",
    ...activeVehicles.map(
      (v) => `${v.name.split(" ").pop()} additional km: ₹${v.extraKmPrice}/km`,
    ),
    "Fuel is not included",
    `Self-drive minimum age: ${r.minSelfDriveAge} years`,
    "Valid driving licence required for self-drive",
    "Standard pickup and return are at the rental location",
    r.delivery,
    r.documents,
  ];
}

/**
 * Hook providing dynamic FAQs calculated from current active vehicles and business rules.
 */
export function useDynamicFaqs(): FaqItem[] {
  const { activeVehicles } = useFleet();
  const { business } = useBusiness();
  const r = business.rules;

  return [
    {
      q: "How much does it cost to rent a car?",
      a:
        activeVehicles.length > 0
          ? activeVehicles
              .map((v) => `${v.name}: ₹${v.dailyPrice.toLocaleString("en-IN")}/day`)
              .join(" · ")
          : "Contact us on WhatsApp for custom rates.",
    },
    { q: "How many kilometres are included?", a: `${r.includedKmPerDay} km per rental day.` },
    {
      q: "What happens if I exceed the included kilometres?",
      a: `Additional kilometres are charged separately. ${activeVehicles
        .map((v) => `${v.name}: ₹${v.extraKmPrice}/km`)
        .join(" · ")}`,
    },
    { q: "Is fuel included?", a: "No. Fuel is excluded from the rental price." },
    { q: "What is the minimum rental period?", a: `One day (${r.hoursPerDay} hours).` },
    {
      q: "Can I rent a car without a driver?",
      a: "Yes. Self-drive is available for eligible customers.",
    },
    {
      q: "What is the minimum age for self-drive?",
      a: `${r.minSelfDriveAge} years, with a valid driving licence.`,
    },
    {
      q: "Can I get the car delivered to my location?",
      a: "Standard pickup and return are at the rental location. Delivery / pickup may be available for an additional distance-based charge.",
    },
    {
      q: "Can I rent a car with a driver?",
      a: "With-driver service availability depends on the vehicle. Contact us to confirm availability and charges.",
    },
    {
      q: "How do I book?",
      a: "Select your car and rental details, then continue to WhatsApp to confirm availability and finalise the booking.",
    },
  ];
}
