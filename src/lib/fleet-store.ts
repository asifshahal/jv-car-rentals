/**
 * Fleet and Business Data Store.
 * Bridges local reactivity, offline caching, and real-time Google Cloud Firestore synchronization.
 */
import {
  business as defaultBusiness,
  vehicles as defaultVehicles,
  type Vehicle,
} from "@/config/business";
const hasFirebaseConfig = () => Boolean(
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_APP_ID,
);

export type BusinessInfo = typeof defaultBusiness;

const STORAGE_KEY_FLEET = "jv_rentals_fleet_data";
const STORAGE_KEY_BUSINESS = "jv_rentals_business_data";

export const EVENT_FLEET_CHANGED = "jv-fleet-changed";
export const EVENT_BUSINESS_CHANGED = "jv-business-changed";

function normalizeBusiness(business: Partial<BusinessInfo>): BusinessInfo {
  return {
    ...defaultBusiness,
    ...business,
    // Logo paths are application assets, not owner-editable business fields.
    // Always use the stable public URLs so old Vite-hashed paths cannot break images.
    logo: defaultBusiness.logo,
    logoWhite: defaultBusiness.logoWhite,
  };
}

// In-memory cache
let inMemoryFleet: Vehicle[] | null = null;
let inMemoryBusiness: BusinessInfo | null = null;
let isCloudSubscribed = false;

/**
 * Emit local event to notify all components in the current window.
 */
function notifyFleetChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_FLEET_CHANGED));
  }
}

function notifyBusinessChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_BUSINESS_CHANGED));
  }
}

/**
 * Reads vehicles from localStorage, falling back to default vehicles.
 */
export function getStoredVehicles(): Vehicle[] {
  if (inMemoryFleet) return inMemoryFleet;

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_FLEET);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryFleet = parsed;
          return parsed;
        }
      }
    } catch {
      // Fall through to defaults
    }
  }

  inMemoryFleet = [...defaultVehicles];
  return inMemoryFleet;
}

/**
 * Reads business and contact info from localStorage, falling back to default config.
 */
export function getStoredBusiness(): BusinessInfo {
  if (inMemoryBusiness) return inMemoryBusiness;

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_BUSINESS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          inMemoryBusiness = normalizeBusiness(parsed);
          return inMemoryBusiness;
        }
      }
    } catch {
      // Fall through to defaults
    }
  }

  inMemoryBusiness = { ...defaultBusiness };
  return inMemoryBusiness;
}

/**
 * Writes fleet data to localStorage and memory.
 */
function persistFleet(fleet: Vehicle[]) {
  inMemoryFleet = [...fleet];
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_FLEET, JSON.stringify(fleet));
    notifyFleetChange();
  }
}

/**
 * Writes business info to localStorage and memory.
 */
function persistBusiness(biz: BusinessInfo) {
  inMemoryBusiness = normalizeBusiness(biz);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_BUSINESS, JSON.stringify(inMemoryBusiness));
    notifyBusinessChange();
  }
}

/**
 * Adds a new vehicle to the fleet and synchronizes to Cloud Firestore if connected.
 */
export async function addVehicle(car: Vehicle): Promise<{ ok: boolean; error?: string }> {
  const current = getStoredVehicles();
  // Ensure unique ID
  const id = car.id || car.slug || `car-${Date.now()}`;
  const newCar: Vehicle = {
    ...car,
    id,
    order: car.order ?? current.length + 1,
  };

  const updated = [...current, newCar].sort((a, b) => a.order - b.order);
  if (hasFirebaseConfig()) {
    const { saveVehicleToCloud } = await import("./cloud-storage");
    const result = await saveVehicleToCloud(newCar);
    if (!result.ok) return { ok: false, error: result.error || "Could not save the vehicle to Firebase." };
  }
  persistFleet(updated);
  return { ok: true };
}

/**
 * Updates an existing vehicle in the fleet.
 */
export async function updateVehicle(
  id: string,
  updates: Partial<Vehicle>,
): Promise<{ ok: boolean; error?: string }> {
  const current = getStoredVehicles();
  const index = current.findIndex((c) => c.id === id);
  if (index === -1) {
    return { ok: false, error: "Vehicle not found" };
  }

  const updatedCar = { ...current[index]!, ...updates };
  const updated = [...current];
  updated[index] = updatedCar;
  updated.sort((a, b) => a.order - b.order);
  if (hasFirebaseConfig()) {
    const { saveVehicleToCloud } = await import("./cloud-storage");
    const result = await saveVehicleToCloud(updatedCar);
    if (!result.ok) return { ok: false, error: result.error || "Could not update the vehicle in Firebase." };
  }
  persistFleet(updated);
  return { ok: true };
}

/**
 * Deletes a vehicle from the fleet.
 */
export async function deleteVehicle(id: string): Promise<{ ok: boolean; error?: string }> {
  const current = getStoredVehicles();
  const updated = current.filter((c) => c.id !== id);
  if (hasFirebaseConfig()) {
    const { deleteVehicleFromCloud } = await import("./cloud-storage");
    const result = await deleteVehicleFromCloud(id);
    if (!result.ok) return { ok: false, error: result.error || "Could not remove the vehicle from Firebase." };
  }
  persistFleet(updated);
  return { ok: true };
}

/**
 * Updates business details, contact info, rules, and hero copy.
 */
export async function updateBusiness(
  updates: Partial<BusinessInfo>,
): Promise<{ ok: boolean; error?: string }> {
  const current = getStoredBusiness();
  const updated: BusinessInfo = {
    ...current,
    ...updates,
    hero: { ...current.hero, ...(updates.hero || {}) },
    rules: { ...current.rules, ...(updates.rules || {}) },
  };

  if (hasFirebaseConfig()) {
    const { saveBusinessToCloud } = await import("./cloud-storage");
    const result = await saveBusinessToCloud(updated);
    if (!result.ok) return { ok: false, error: result.error || "Could not save business settings to Firebase." };
  }
  persistBusiness(updated);
  return { ok: true };
}

/**
 * Resets fleet and business data to factory defaults.
 */
export async function resetToDefaultData(): Promise<{ ok: boolean; message?: string }> {
  if (hasFirebaseConfig()) {
    try {
      const cloud = await import("./cloud-storage");
      const [fleetResult, businessResult] = await Promise.all([
        cloud.syncAllVehiclesToCloud(defaultVehicles),
        cloud.saveBusinessToCloud(defaultBusiness),
      ]);
      if (!fleetResult.ok || !businessResult.ok) {
        return {
          ok: false,
          message: fleetResult.error || businessResult.error || "Could not reset Firebase data.",
        };
      }
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Could not reset Firebase data." };
    }
  }
  persistFleet([...defaultVehicles]);
  persistBusiness({ ...defaultBusiness });
  return { ok: true };
}

/**
 * Pulls latest vehicles and business data from Cloud Firestore.
 */
export async function pullLatestFromCloud(): Promise<{ ok: boolean; message: string }> {
  if (!hasFirebaseConfig()) {
    return { ok: false, message: "Cloud storage is not configured." };
  }

  try {
    const cloud = await import("./cloud-storage");
    const [cloudCars, cloudBusiness] = await Promise.all([
      cloud.fetchVehiclesFromCloud(),
      cloud.fetchBusinessFromCloud(),
    ]);

    let count = 0;
    if (cloudCars && cloudCars.length > 0) {
      persistFleet(cloudCars);
      count = cloudCars.length;
    }

    if (cloudBusiness) {
      persistBusiness({ ...defaultBusiness, ...cloudBusiness });
    }

    return {
      ok: true,
      message: `Successfully loaded ${count} vehicles and business data from Cloud Firestore!`,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: "Failed to pull from Cloud: " + (err?.message || String(err)),
    };
  }
}

/**
 * Pushes all local vehicles and business data to Cloud Firestore.
 */
export async function pushAllToCloud(): Promise<{ ok: boolean; message: string }> {
  if (!hasFirebaseConfig()) {
    return { ok: false, message: "Cloud storage is not configured." };
  }

  try {
    const cloud = await import("./cloud-storage");
    const cars = getStoredVehicles();
    const biz = getStoredBusiness();

    const [resCars, resBiz] = await Promise.all([
      cloud.syncAllVehiclesToCloud(cars),
      cloud.saveBusinessToCloud(biz),
    ]);

    if (!resCars.ok) {
      return { ok: false, message: resCars.error || "Failed to push vehicles to cloud" };
    }
    if (!resBiz.ok) {
      return { ok: false, message: resBiz.error || "Failed to push business info to cloud" };
    }

    return {
      ok: true,
      message: `Successfully synced ${cars.length} cars and business details to Cloud Firestore!`,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: "Failed to push to Cloud: " + (err?.message || String(err)),
    };
  }
}

/**
 * Exports all data as a formatted JSON string for backups.
 */
export function exportDataJson(): string {
  const data = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    vehicles: getStoredVehicles(),
    business: getStoredBusiness(),
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Imports vehicles and business data from a JSON backup.
 */
export async function importDataJson(jsonString: string): Promise<{ ok: boolean; message: string }> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== "object") {
      return { ok: false, message: "Invalid JSON format." };
    }

    if (Array.isArray(parsed.vehicles)) {
      persistFleet(parsed.vehicles);
    }

    if (parsed.business && typeof parsed.business === "object") {
      persistBusiness({ ...defaultBusiness, ...parsed.business });
    }

    if (hasFirebaseConfig()) {
      await pushAllToCloud();
    }

    return { ok: true, message: "Fleet data successfully imported!" };
  } catch (err: any) {
    return { ok: false, message: "Import failed: " + (err?.message || "Invalid JSON") };
  }
}

/**
 * Initializes automatic background listeners for Cloud Firestore and storage events.
 */
export function initializeStoreListeners() {
  if (typeof window === "undefined") return;

  // Listen to cross-tab updates
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY_FLEET) {
      inMemoryFleet = null;
      notifyFleetChange();
    } else if (e.key === STORAGE_KEY_BUSINESS) {
      inMemoryBusiness = null;
      notifyBusinessChange();
    }
  });

  // Subscribe to Cloud Firestore updates if configured
  if (hasFirebaseConfig() && !isCloudSubscribed) {
    isCloudSubscribed = true;
    void import("./cloud-storage").then((cloud) => {
      cloud.pullLatestFromCloud?.();
      cloud.subscribeToVehicles((cars) => {
        if (cars && cars.length > 0) persistFleet(cars);
      });
      cloud.subscribeToBusiness((biz) => {
        if (biz) persistBusiness({ ...defaultBusiness, ...biz });
      });
    }).catch((error) => {
      isCloudSubscribed = false;
      console.warn("Could not start Firebase listeners:", error);
    });
  }
}
