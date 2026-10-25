/**
 * Business configuration. Every editable value lives here so a future admin
 * panel (or backend database) can replace this object without touching UI.
 */
import ertigaImg from "@/assets/ertiga.jpg";
import cretaImg from "@/assets/creta.jpg";
import logoImg from "@/assets/logo.png";
import logoWhiteImg from "@/assets/logo-white.png";

export type RentalType = "self" | "driver";

export interface Vehicle {
  id: string;
  name: string;
  slug: string;
  seats: number;
  dailyPrice: number;
  includedKmPerDay: number;
  extraKmPrice: number;
  selfDrive: boolean;
  withDriver: boolean;
  driverFeePerDay: number;
  available: boolean;
  description: string;
  image: string;
  imageAlt: string;
  order: number;
}

export interface FaqItem {
  q: string;
  a: string;
}

export const business = {
  name: "JV Car Rentals",
  tagline: "Drive More Possibilities",
  logo: logoImg,
  logoWhite: logoWhiteImg,
  whatsapp: "+91 75399 02681",
  location: "Trichy, Tamil Nadu",
  fullAddress: "", // TODO admin: exact pickup address not finalised
  mapsUrl: "", // TODO admin: Google Maps link
  siteUrl: "https://jvcarrentals.in", // TODO admin: update after domain is connected
  hero: {
    heading: "Reliable Car Rentals in Trichy",
    description:
      "Self Drive & With Driver options for everyday travel, special occasions and more.",
  },
  rules: {
    minDays: 1,
    hoursPerDay: 24,
    includedKmPerDay: 300,
    minSelfDriveAge: 20,
    driverFeePerDay: 1000,
    documents: "Required documents and security requirements apply and will be shared on WhatsApp.",
    driverTerms: "Other driver terms are confirmed during booking.",
    delivery:
      "Delivery / pickup to another location may be available for an additional distance-based charge.",
  },
};

export const vehicles: Vehicle[] = [
  {
    id: "ertiga",
    name: "Suzuki Ertiga",
    slug: "suzuki-ertiga",
    seats: 7,
    dailyPrice: 3199,
    includedKmPerDay: 300,
    extraKmPrice: 10,
    selfDrive: true,
    withDriver: true,
    driverFeePerDay: 1000,
    available: true,
    description: "Seven seats for family trips, temple visits and group travel.",
    image: ertigaImg,
    imageAlt: "Silver Suzuki Ertiga 7 seater available for rent in Trichy",
    order: 1,
  },
  {
    id: "creta",
    name: "Hyundai Creta",
    slug: "hyundai-creta",
    seats: 5,
    dailyPrice: 1799,
    includedKmPerDay: 300,
    extraKmPrice: 7,
    selfDrive: true,
    withDriver: true,
    driverFeePerDay: 1000,
    available: true,
    description: "A comfortable five-seat SUV for city drives and highway trips.",
    image: cretaImg,
    imageAlt: "White Hyundai Creta 5 seater SUV available for rent in Trichy",
    order: 2,
  },
];

export const getBusinessConfig = () => {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("jv_rentals_business_data");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          return {
            ...business,
            ...parsed,
            hero: { ...business.hero, ...(parsed.hero || {}) },
            rules: { ...business.rules, ...(parsed.rules || {}) },
          };
        }
      }
    } catch {
      // Fall through to default
    }
  }
  return business;
};

export const activeVehicles = (): Vehicle[] => {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("jv_rentals_fleet_data");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .filter((v: Vehicle) => v.available !== false)
            .sort((a: Vehicle, b: Vehicle) => a.order - b.order);
        }
      }
    } catch {
      // Fall through to default
    }
  }
  return [...vehicles].filter((v) => v.available !== false).sort((a, b) => a.order - b.order);
};

export const rentalRules = (): string[] => {
  const r = getBusinessConfig().rules;
  return [
    `Minimum rental period: ${r.minDays} day`,
    `Each rental day is ${r.hoursPerDay} hours`,
    `${r.includedKmPerDay} km is included per rental day`,
    "Additional kilometres are charged separately",
    ...activeVehicles().map(
      (v) => `${v.name.split(" ").pop()} additional km: ₹${v.extraKmPrice}/km`,
    ),
    "Fuel is not included",
    `Self-drive minimum age: ${r.minSelfDriveAge} years`,
    "Valid driving licence required for self-drive",
    "Standard pickup and return are at the rental location",
    r.delivery,
    r.documents,
  ];
};

export const faqs = (): FaqItem[] => {
  const vs = activeVehicles();
  const r = getBusinessConfig().rules;
  return [
    {
      q: "How much does it cost to rent a car?",
      a:
        vs.length > 0
          ? vs.map((v) => `${v.name}: ₹${v.dailyPrice.toLocaleString("en-IN")}/day`).join(" · ")
          : "Contact us on WhatsApp for custom rates.",
    },
    { q: "How many kilometres are included?", a: `${r.includedKmPerDay} km per rental day.` },
    {
      q: "What happens if I exceed the included kilometres?",
      a: `Additional kilometres are charged separately. ${vs.map((v) => `${v.name}: ₹${v.extraKmPrice}/km`).join(" · ")}`,
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
      a: `Yes. A driver can be arranged for ₹${r.driverFeePerDay.toLocaleString("en-IN")}/day.`,
    },
    {
      q: "How do I book?",
      a: "Select your car and rental details, then continue to WhatsApp to confirm availability and finalise the booking.",
    },
  ];
};
