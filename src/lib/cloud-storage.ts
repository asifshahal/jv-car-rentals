/**
 * Firebase Authentication & Firestore Integration for JV Car Rentals.
 * Integrates with Google Cloud Firestore, the industry standard online document store.
 * Supports environment variables or runtime configuration from the Admin Panel.
 */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import type { Vehicle } from "@/config/business";

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
}

const COLLECTION_VEHICLES = "jv_vehicles";
const COLLECTION_SETTINGS = "jv_settings";
const DOC_BUSINESS = "business_info";
const COLLECTION_ADMINS = "jv_admins";

/** Firebase web configuration is public client configuration, supplied at build/deploy time. */
export function getFirebaseConfig(): FirebaseConfig | null {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;
  if (!projectId || !apiKey || !appId) return null;

  return {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId,
  };
}

/**
 * Checks whether Firebase credentials are present.
 */
export function isFirebaseConfigured(): boolean {
  return !!getFirebaseConfig();
}

let cachedDb: Firestore | null = null;
let lastConfigHash = "";

/**
 * Initializes or returns the active Firestore instance.
 */
export function getDb(): Firestore | null {
  const config = getFirebaseConfig();
  if (!config) return null;

  const configHash = JSON.stringify(config);
  if (cachedDb && lastConfigHash === configHash) {
    return cachedDb;
  }

  try {
    const appName = "jv-car-rentals-app";
    const existingApps = getApps();
    const app = existingApps.find((a) => a.name === appName) || initializeApp(config, appName);
    cachedDb = getFirestore(app);
    lastConfigHash = configHash;
    return cachedDb;
  } catch (err) {
    console.error("Failed to initialize Firebase Firestore:", err);
    return null;
  }
}



export function getAuthClient() {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

function getFirebaseApp(): FirebaseApp | null {
  const config = getFirebaseConfig();
  if (!config) return null;
  const appName = "jv-car-rentals-app";
  const existing = getApps().find((candidate) => candidate.name === appName);
  if (existing) return existing;
  try {
    return initializeApp(config, appName);
  } catch {
    return null;
  }
}

export async function signInAdmin(email: string, password: string) {
  const auth = getAuthClient();
  if (!auth) throw new Error("Firebase is not configured yet.");
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signOutAdmin() {
  const auth = getAuthClient();
  if (auth) await signOut(auth);
}

export function observeAdminAuth(callback: (user: User | null) => void) {
  const auth = getAuthClient();
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

export async function hasAdminAccess(uid: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  const snapshot = await getDoc(doc(db, COLLECTION_ADMINS, uid));
  return snapshot.exists() && snapshot.data().enabled === true;
}

export async function compressVehicleImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Choose an original image smaller than 15 MB.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This image could not be opened. Try a JPG, PNG, or WebP photo.");
  }

  try {
    let scale = Math.min(1, 1400 / bitmap.width, 1000 / bitmap.height);
    for (let resizeAttempt = 0; resizeAttempt < 4; resizeAttempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not prepare this photo.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.82, 0.72, 0.62, 0.52]) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/webp", quality),
        );
        if (blob && blob.type === "image/webp" && blob.size <= 300 * 1024) {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error("Could not prepare this photo."));
            reader.onload = () => resolve(String(reader.result));
            reader.readAsDataURL(blob);
          });
          if (dataUrl.length > 450_000) throw new Error("The compressed photo is still too large. Choose a simpler photo.");
          return dataUrl;
        }
      }
      scale *= 0.78;
    }
  } finally {
    bitmap.close();
  }

  throw new Error("This photo could not be compressed enough. Choose a different photo.");
}

/**
 * Tests connection to Google Cloud Firestore.
 */
export async function testFirebaseConnection(): Promise<{
  ok: boolean;
  message: string;
  details?: string;
}> {
  const db = getDb();
  if (!db) {
    return {
      ok: false,
      message: "Firebase configuration is missing. Please provide API Key and Project ID.",
    };
  }

  try {
    // Attempt a lightweight read from jv_settings
    const settingsDoc = doc(db, COLLECTION_SETTINGS, DOC_BUSINESS);
    await getDoc(settingsDoc);
    return {
      ok: true,
      message: `Successfully connected to Google Cloud Firestore (Project: ${getFirebaseConfig()?.projectId})!`,
    };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    return {
      ok: false,
      message: "Connection failed. Please check your credentials and Firestore security rules.",
      details: errMsg,
    };
  }
}

/**
 * Fetches all vehicles from Cloud Firestore.
 */
export async function fetchVehiclesFromCloud(): Promise<Vehicle[] | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const colRef = collection(db, COLLECTION_VEHICLES);
    const snap = await getDocs(colRef);
    if (snap.empty) {
      return [];
    }

    const items: Vehicle[] = [];
    snap.forEach((docSnap) => {
      items.push({ ...(docSnap.data() as Vehicle), id: docSnap.id });
    });
    return items.sort((a, b) => a.order - b.order);
  } catch (err) {
    console.error("Failed to fetch vehicles from Cloud Firestore:", err);
    return null;
  }
}

/**
 * Saves a single vehicle to Cloud Firestore.
 */
export async function saveVehicleToCloud(vehicle: Vehicle): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  if (!db) return { ok: false, error: "Firebase not configured" };

  try {
    const docRef = doc(db, COLLECTION_VEHICLES, vehicle.id);
    await setDoc(docRef, vehicle, { merge: true });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Deletes a vehicle from Cloud Firestore.
 */
export async function deleteVehicleFromCloud(vehicleId: string): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  if (!db) return { ok: false, error: "Firebase not configured" };

  try {
    const docRef = doc(db, COLLECTION_VEHICLES, vehicleId);
    await deleteDoc(docRef);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Overwrites / syncs all vehicles to Cloud Firestore in a single atomic batch.
 */
export async function syncAllVehiclesToCloud(
  vehicles: Vehicle[],
): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  if (!db) return { ok: false, error: "Firebase not configured" };

  try {
    const batch = writeBatch(db);

    // Save each vehicle
    for (const vehicle of vehicles) {
      const docRef = doc(db, COLLECTION_VEHICLES, vehicle.id);
      batch.set(docRef, vehicle);
    }

    await batch.commit();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Fetches business configuration & contact info from Cloud Firestore.
 */
export async function fetchBusinessFromCloud(): Promise<any | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const docRef = doc(db, COLLECTION_SETTINGS, DOC_BUSINESS);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.error("Failed to fetch business info from Cloud Firestore:", err);
    return null;
  }
}

/**
 * Saves business configuration & contact info to Cloud Firestore.
 */
export async function saveBusinessToCloud(
  businessData: any,
): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  if (!db) return { ok: false, error: "Firebase not configured" };

  try {
    const docRef = doc(db, COLLECTION_SETTINGS, DOC_BUSINESS);
    await setDoc(docRef, businessData, { merge: true });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Subscribes to live vehicle updates from Cloud Firestore.
 */
export function subscribeToVehicles(onData: (vehicles: Vehicle[]) => void): () => void {
  const db = getDb();
  if (!db) return () => {};

  try {
    const colRef = collection(db, COLLECTION_VEHICLES);
    return onSnapshot(
      colRef,
      (snap) => {
        const items: Vehicle[] = [];
        snap.forEach((d) => {
          items.push({ ...(d.data() as Vehicle), id: d.id });
        });
        items.sort((a, b) => a.order - b.order);
        onData(items);
      },
      (err) => {
        console.warn("Cloud Firestore vehicle listener error:", err);
      },
    );
  } catch {
    return () => {};
  }
}

/**
 * Subscribes to live business info updates from Cloud Firestore.
 */
export function subscribeToBusiness(onData: (business: any) => void): () => void {
  const db = getDb();
  if (!db) return () => {};

  try {
    const docRef = doc(db, COLLECTION_SETTINGS, DOC_BUSINESS);
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          onData(snap.data());
        }
      },
      (err) => {
        console.warn("Cloud Firestore business info listener error:", err);
      },
    );
  } catch {
    return () => {};
  }
}
