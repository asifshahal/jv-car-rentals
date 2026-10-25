import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useId, useMemo, useState } from "react";
import {
  Car,
  Check,
  ChevronDown,
  Cloud,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  KeyRound,
  Lock,
  LogOut,
  MapPin,
  MessageSquare,
  Minus,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Trash2,
  Unlock,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import ertigaImg from "@/assets/ertiga.jpg";
import cretaImg from "@/assets/creta.jpg";
import { inr, waLink } from "@/lib/booking";
import type { Vehicle } from "@/config/business";
import {
  addVehicle,
  updateVehicle,
  deleteVehicle,
  updateBusiness,
  resetToDefaultData,
  exportDataJson,
  importDataJson,
  pullLatestFromCloud,
  pushAllToCloud,
  getStoredVehicles,
  getStoredBusiness,
} from "@/lib/fleet-store";
import {
  getFirebaseConfig,
  isFirebaseConfigured,
  testFirebaseConnection,
  observeAdminAuth,
  signInAdmin,
  signOutAdmin,
  hasAdminAccess,
  compressVehicleImage,
} from "@/lib/cloud-storage";
import { useFleet, useBusiness } from "@/hooks/useFleetData";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Portal — Fleet & Business Settings | JV Car Rentals" },
      { name: "description", content: "Manage vehicles, prices, contact details, and cloud storage." },
    ],
  }),
  component: AdminPage,
});

// Image Presets for Quick Car Addition
const CAR_PRESETS = [
  { name: "Suzuki Ertiga (Local)", url: ertigaImg, seats: 7, alt: "Silver Suzuki Ertiga 7 seater" },
  { name: "Hyundai Creta (Local)", url: cretaImg, seats: 5, alt: "White Hyundai Creta 5 seater SUV" },
  {
    name: "Toyota Innova Crysta",
    url: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80",
    seats: 7,
    alt: "Toyota Innova Crysta premium MPV",
  },
  {
    name: "Mahindra Thar 4x4",
    url: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80",
    seats: 4,
    alt: "Mahindra Thar 4x4 adventure SUV",
  },
  {
    name: "Compact Hatchback (Swift)",
    url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80",
    seats: 5,
    alt: "Compact hatchback for city rental",
  },
  {
    name: "Executive Sedan",
    url: "https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1200&q=80",
    seats: 5,
    alt: "Executive sedan for business & highway",
  },
];

type AdminTab = "fleet" | "business" | "rules" | "cloud";

function AdminPage() {
  const { vehicles } = useFleet();
  const { business } = useBusiness();

  // Firebase Authentication plus a server-enforced Firestore admin allow-list.
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Active Tab
  const [activeTab, setActiveTab] = useState<AdminTab>("fleet");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "self" | "driver">("all");
  const [filterAvailability, setFilterAvailability] = useState<"all" | "available" | "unavailable">("all");

  // Car Modal State
  const [isCarModalOpen, setIsCarModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Vehicle | null>(null);

  // Cloud State
  const [cloudStatus, setCloudStatus] = useState<{
    configured: boolean;
    testing: boolean;
    message?: string;
    ok?: boolean;
  }>({
    configured: false,
    testing: false,
  });

  // Syncing state
  const [isSyncing, setIsSyncing] = useState(false);

  // Resolve the signed-in user and verify the admin allow-list entry.
  useEffect(() => {
    setCloudStatus((prev) => ({ ...prev, configured: isFirebaseConfigured() }));
    if (!isFirebaseConfigured()) {
      setAuthLoading(false);
      return;
    }
    return observeAdminAuth(async (user) => {
      setAuthLoading(true);
      if (!user) {
        setIsAuthenticated(false);
        setAuthEmail("");
        setAuthLoading(false);
        return;
      }
      try {
        const allowed = await hasAdminAccess(user.uid);
        setIsAuthenticated(allowed);
        setAuthEmail(user.email || "");
        setAuthError(allowed ? "" : "This account has no admin access. Contact the project owner.");
      } catch {
        setIsAuthenticated(false);
        setAuthError("Could not verify admin access. Check the Firebase security rules.");
      } finally {
        setAuthLoading(false);
      }
    });
  }, []);

  // Filtered cars
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((car) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          car.name.toLowerCase().includes(q) ||
          car.slug.toLowerCase().includes(q) ||
          car.description.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (filterType === "self" && !car.selfDrive) return false;
      if (filterType === "driver" && !car.withDriver) return false;
      if (filterAvailability === "available" && car.available === false) return false;
      if (filterAvailability === "unavailable" && car.available !== false) return false;
      return true;
    });
  }, [vehicles, searchQuery, filterType, filterAvailability]);

  // Sign in with Firebase Authentication, then require an enabled admin record.
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const user = await signInAdmin(email.trim(), password);
      const allowed = await hasAdminAccess(user.uid);
      if (!allowed) {
        await signOutAdmin();
        setAuthError("This account has no admin access. Contact the project owner.");
        return;
      }
      setAuthEmail(user.email || email.trim());
      setIsAuthenticated(true);
      setPassword("");
      toast.success("Signed in to JV Car Rentals Admin");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign-in failed.";
      setAuthError(message.includes("Firebase is not configured") ? message : "Email or password is incorrect.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOutAdmin();
      setIsAuthenticated(false);
      setAuthEmail("");
      toast.info("Signed out from the admin panel");
    } catch {
      toast.error("Could not sign out. Please try again.");
    }
  };

  // Test Cloud Connection
  const handleTestCloud = async () => {
    setCloudStatus((prev) => ({ ...prev, testing: true }));
    const res = await testFirebaseConnection();
    setCloudStatus((prev) => ({
      ...prev,
      testing: false,
      ok: res.ok,
      message: res.message,
    }));
    if (res.ok) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  // Push to Cloud
  const handlePushToCloud = async () => {
    setIsSyncing(true);
    const res = await pushAllToCloud();
    setIsSyncing(false);
    if (res.ok) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  // Pull from Cloud
  const handlePullFromCloud = async () => {
    setIsSyncing(true);
    const res = await pullLatestFromCloud();
    setIsSyncing(false);
    if (res.ok) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  // Toggle Car Availability
  const handleToggleCarAvailability = async (car: Vehicle) => {
    const updated = !car.available;
    const result = await updateVehicle(car.id, { available: updated });
    if (result.ok) toast.success(`${car.name} marked as ${updated ? "available" : "unavailable"}`);
    else toast.error(result.error || "Could not update availability.");
  };

  // Delete Car
  const handleDeleteCar = async (car: Vehicle) => {
    if (window.confirm(`Are you sure you want to remove "${car.name}" from the fleet?`)) {
      const result = await deleteVehicle(car.id);
      if (result.ok) toast.success(`Removed ${car.name}`);
      else toast.error(result.error || "Could not remove the vehicle.");
    }
  };

  // Duplicate Car
  const handleDuplicateCar = async (car: Vehicle) => {
    const newCar: Vehicle = {
      ...car,
      id: `${car.slug}-copy-${Date.now().toString().slice(-4)}`,
      name: `${car.name} (Copy)`,
      slug: `${car.slug}-copy`,
      order: vehicles.length + 1,
    };
    const result = await addVehicle(newCar);
    if (result.ok) toast.success(`Duplicated ${car.name}`);
    else toast.error(result.error || "Could not duplicate the vehicle.");
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const json = exportDataJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jv-car-rentals-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Fleet & business backup exported successfully!");
  };

  // Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const res = await importDataJson(content);
        if (res.ok) {
          toast.success(res.message);
        } else {
          toast.error(res.message);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Reset to Defaults
  const handleResetDefaults = async () => {
    if (
      window.confirm(
        "Are you sure you want to reset the fleet and business settings to factory defaults? All custom changes will be reverted.",
      )
    ) {
      const result = await resetToDefaultData();
      if (result.ok) toast.success("Restored factory fleet defaults");
      else toast.error(result.message || "Could not restore factory defaults.");
    }
  };

  // Do not expose admin controls until Firebase auth and the admin allow-list pass.
  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center">Checking admin access…</div>;
  }

  if (!isAuthenticated) {
    const configured = isFirebaseConfigured();
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md border bg-card p-8 shadow-xl">
          <div className="text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="size-7" />
            </div>
            <h1 className="mt-4 text-3xl font-display font-semibold">JV Car Rentals</h1>
            <p className="mt-1 text-sm text-muted-foreground">Secure Admin Sign In</p>
          </div>

          {!configured ? (
            <div className="mt-8 border bg-secondary/50 p-4 text-sm">
              <p className="font-semibold">Firebase setup is required</p>
              <p className="mt-2 text-muted-foreground">Add the Firebase web app settings to the local environment and Vercel, then enable Email/Password sign-in. See FIREBASE_SETUP.md.</p>
            </div>
          ) : (
            <form onSubmit={handleLoginSubmit} className="mt-8 space-y-4">
              <div>
                <label htmlFor="admin-email" className="block text-sm font-medium">Admin email</label>
                <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="field mt-2" required />
              </div>
              <div>
                <label htmlFor="admin-password" className="block text-sm font-medium">Password</label>
                <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="field mt-2" required />
              </div>
              {authError && <p role="alert" className="text-sm text-destructive">{authError}</p>}
              <button type="submit" className="btn btn-primary w-full"><Unlock className="size-4" /> Sign in</button>
            </form>
          )}
          {authError && !configured && <p role="alert" className="mt-3 text-sm text-destructive">{authError}</p>}
          <div className="mt-6 border-t pt-4 text-center">
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">← Return to public website</Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate fleet stats
  const totalCars = vehicles.length;
  const activeCars = vehicles.filter((v) => v.available !== false).length;
  const selfDriveCars = vehicles.filter((v) => v.selfDrive).length;
  const withDriverCars = vehicles.filter((v) => v.withDriver).length;
  const avgDailyPrice =
    totalCars > 0
      ? Math.round(vehicles.reduce((acc, v) => acc + (v.dailyPrice || 0), 0) / totalCars)
      : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="flex size-9 items-center justify-center rounded bg-primary text-primary-foreground font-display font-bold text-lg">
                JV
              </span>
              <div>
                <span className="block font-display text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
                  JV Car Rentals
                </span>
                <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">
                  Fleet & Cloud Admin
                </span>
              </div>
            </Link>
          </div>

          {/* Cloud Status Pill & Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("cloud")}
              className={`hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                cloudStatus.configured
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
              }`}
              title="Click to manage Firestore settings"
            >
              <Cloud className="size-3.5" />
              <span>
                {cloudStatus.configured
                  ? `Firestore Active (${getFirebaseConfig()?.projectId || "Connected"})`
                  : "Local Mode (Connect Cloud)"}
              </span>
              <span
                className={`size-2 rounded-full ${
                  cloudStatus.configured ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
            </button>

            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded hover:bg-accent transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              title="Open public website in new tab"
            >
              <Eye className="size-3.5 text-muted-foreground" />
              <span>View Site</span>
              <ExternalLink className="size-3" />
            </Link>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 border border-destructive/20 rounded transition-colors"
              title="Lock Admin Session"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-page py-8">
        {/* KPI Stats Bar */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-5">
          <div className="border bg-card p-4 rounded">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Fleet</p>
            <p className="mt-1.5 font-display text-3xl font-semibold">{totalCars}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Registered vehicles</p>
          </div>
          <div className="border bg-card p-4 rounded">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Available Now</p>
            <p className="mt-1.5 font-display text-3xl font-semibold text-emerald-600 dark:text-emerald-400">
              {activeCars}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Active on site</p>
          </div>
          <div className="border bg-card p-4 rounded">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Self Drive</p>
            <p className="mt-1.5 font-display text-3xl font-semibold">{selfDriveCars}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Eligible models</p>
          </div>
          <div className="border bg-card p-4 rounded">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">With Driver</p>
            <p className="mt-1.5 font-display text-3xl font-semibold">{withDriverCars}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Chauffeur option</p>
          </div>
          <div className="col-span-2 sm:col-span-1 border bg-card p-4 rounded">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Avg Daily Rate</p>
            <p className="mt-1.5 font-display text-3xl font-semibold">{inr(avgDailyPrice)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Per day average</p>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="mt-8 border-b flex flex-wrap gap-2 text-sm font-medium">
          <button
            onClick={() => setActiveTab("fleet")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 transition-colors ${
              activeTab === "fleet"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Car className="size-4" />
            <span>Vehicles & Fleet ({totalCars})</span>
          </button>

          <button
            onClick={() => setActiveTab("business")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 transition-colors ${
              activeTab === "business"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Phone className="size-4" />
            <span>Contact & Business Details</span>
          </button>

          <button
            onClick={() => setActiveTab("rules")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 transition-colors ${
              activeTab === "rules"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="size-4" />
            <span>Rental Rules & Terms</span>
          </button>

          <button
            onClick={() => setActiveTab("cloud")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 transition-colors ${
              activeTab === "cloud"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Cloud className="size-4" />
            <span>Cloud Database (Firestore)</span>
            {cloudStatus.configured ? (
              <span className="size-2 rounded-full bg-emerald-500" />
            ) : (
              <span className="size-2 rounded-full bg-amber-500" />
            )}
          </button>
        </div>

        {/* TAB 1: FLEET MANAGEMENT */}
        {activeTab === "fleet" && (
          <section className="mt-6 space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <div className="relative min-w-[240px] max-w-sm flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search car name, slug, description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="field !pl-9 !min-h-10 text-sm"
                  />
                </div>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="field !min-h-10 !w-auto text-sm"
                >
                  <option value="all">All Drive Types</option>
                  <option value="self">Self Drive Only</option>
                  <option value="driver">With Driver Only</option>
                </select>

                <select
                  value={filterAvailability}
                  onChange={(e) => setFilterAvailability(e.target.value as any)}
                  className="field !min-h-10 !w-auto text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="available">Available Only</option>
                  <option value="unavailable">Unavailable Only</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingCar(null);
                    setIsCarModalOpen(true);
                  }}
                  className="btn btn-primary !min-h-10 !px-4 text-sm"
                >
                  <Plus className="size-4" />
                  <span>Add New Car</span>
                </button>
              </div>
            </div>

            {/* Fleet List / Cards */}
            {filteredVehicles.length === 0 ? (
              <div className="border bg-card p-12 text-center rounded">
                <Car className="mx-auto size-12 text-muted-foreground/50" />
                <h3 className="mt-4 font-display text-2xl font-semibold">No vehicles found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {searchQuery ? "Try refining your search filter." : "Start by adding your first car to the fleet."}
                </p>
                <button
                  onClick={() => {
                    setEditingCar(null);
                    setIsCarModalOpen(true);
                  }}
                  className="btn btn-primary mt-6 !min-h-10"
                >
                  <Plus className="size-4" />
                  Add New Car
                </button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredVehicles.map((car) => (
                  <article
                    key={car.id}
                    className={`border bg-card rounded overflow-hidden flex flex-col transition-all ${
                      car.available === false ? "opacity-75 border-dashed" : "shadow-sm"
                    }`}
                  >
                    {/* Car Image Banner */}
                    <div className="relative aspect-[16/10] bg-secondary overflow-hidden">
                      <img
                        src={car.image || ertigaImg}
                        alt={car.imageAlt || car.name}
                        className="size-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded shadow-sm ${
                            car.available !== false
                              ? "bg-emerald-600 text-white"
                              : "bg-destructive text-destructive-foreground"
                          }`}
                        >
                          {car.available !== false ? "Available" : "Unavailable"}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-black/60 text-white rounded">
                          #{car.order ?? 1}
                        </span>
                      </div>
                      <div className="absolute bottom-2.5 left-2.5">
                        <span className="px-2 py-0.5 text-xs font-medium bg-card/90 text-foreground backdrop-blur rounded">
                          {car.seats} Seater
                        </span>
                      </div>
                    </div>

                    {/* Car Info */}
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-xl font-display font-semibold leading-snug">{car.name}</h3>
                          <p className="text-xs text-muted-foreground">/{car.slug}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-display text-2xl font-bold text-primary">
                            {inr(car.dailyPrice)}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">per day</span>
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{car.description}</p>

                      {/* Pricing Specs Grid */}
                      <dl className="mt-4 grid grid-cols-2 gap-2 border-y py-3 text-xs">
                        <div>
                          <dt className="text-muted-foreground">Included Km</dt>
                          <dd className="font-semibold">{car.includedKmPerDay} km / day</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Extra Km Price</dt>
                          <dd className="font-semibold">{inr(car.extraKmPrice)} / km</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Self Drive</dt>
                          <dd className="font-semibold flex items-center gap-1">
                            {car.selfDrive ? (
                              <Check className="size-3.5 text-emerald-600" />
                            ) : (
                              <Minus className="size-3.5 text-muted-foreground" />
                            )}
                            {car.selfDrive ? "Allowed" : "No"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Driver Option</dt>
                          <dd className="font-semibold flex items-center gap-1">
                            {car.withDriver ? (
                              <>
                                <Check className="size-3.5 text-emerald-600" />
                                <span>{car.withDriver ? "Available" : "Not available"}</span>
                              </>
                            ) : (
                              <Minus className="size-3.5 text-muted-foreground" />
                            )}
                          </dd>
                        </div>
                      </dl>

                      {/* Card Action Buttons */}
                      <div className="mt-5 pt-1 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleToggleCarAvailability(car)}
                          className={`text-xs px-2.5 py-1.5 rounded border transition-colors ${
                            car.available !== false
                              ? "hover:bg-destructive/10 text-destructive border-destructive/20"
                              : "hover:bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          }`}
                          title={car.available !== false ? "Set as unavailable" : "Set as available"}
                        >
                          {car.available !== false ? "Mark Unavailable" : "Mark Available"}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDuplicateCar(car)}
                            className="p-1.5 text-muted-foreground hover:text-foreground border rounded hover:bg-accent"
                            title="Duplicate vehicle"
                          >
                            <Copy className="size-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setEditingCar(car);
                              setIsCarModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:opacity-90"
                            title="Edit vehicle details"
                          >
                            <Edit3 className="size-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleDeleteCar(car)}
                            className="p-1.5 text-destructive hover:bg-destructive/10 border border-destructive/20 rounded"
                            title="Delete vehicle"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: CONTACT DETAILS & BUSINESS INFO */}
        {activeTab === "business" && (
          <section className="mt-6 max-w-4xl space-y-8">
            <BusinessContactForm initialBusiness={business} onSave={updateBusiness} />
          </section>
        )}

        {/* TAB 3: RENTAL RULES & POLICIES */}
        {activeTab === "rules" && (
          <section className="mt-6 max-w-4xl space-y-8">
            <RentalRulesForm initialBusiness={business} onSave={updateBusiness} vehicles={vehicles} />
          </section>
        )}

        {/* TAB 4: CLOUD STORAGE (GOOGLE CLOUD FIRESTORE) */}
        {activeTab === "cloud" && (
          <section className="mt-6 max-w-4xl space-y-8">
            <div className="border bg-card p-6 md:p-8 rounded space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Cloud className="size-6 text-primary" />
                    <h2 className="text-2xl font-display font-semibold">Firestore Connection</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Cloud Firestore stores fleet, pricing, business settings, and compact vehicle photos. Firebase Storage is not used.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {cloudStatus.configured ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-full">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      Connected to Firestore
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-full">
                      <span className="size-2 rounded-full bg-amber-500" />
                      Local Storage Mode
                    </span>
                  )}
                </div>
              </div>

              {/* Cloud Sync Actions */}
              {cloudStatus.configured && (
                <div className="bg-primary/5 border border-primary/20 p-5 rounded">
                  <h3 className="text-base font-semibold">Live Firestore Synchronization</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your fleet and business settings are backed up and synced automatically. You can also trigger manual cloud pushes or pulls.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={handlePushToCloud}
                      disabled={isSyncing}
                      className="btn btn-primary !min-h-9 !px-3.5 text-xs"
                    >
                      <Upload className="size-3.5" />
                      <span>{isSyncing ? "Syncing..." : "Push Local Fleet to Firestore"}</span>
                    </button>

                    <button
                      onClick={handlePullFromCloud}
                      disabled={isSyncing}
                      className="btn btn-outline !min-h-9 !px-3.5 text-xs"
                    >
                      <Download className="size-3.5" />
                      <span>{isSyncing ? "Syncing..." : "Pull Latest from Firestore"}</span>
                    </button>

                    <button
                      onClick={handleTestCloud}
                      disabled={cloudStatus.testing}
                      className="btn btn-outline !min-h-9 !px-3.5 text-xs"
                    >
                      <RefreshCw className={`size-3.5 ${cloudStatus.testing ? "animate-spin" : ""}`} />
                      <span>Test Connection</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="border-t pt-6 space-y-3">
                <h3 className="text-lg font-semibold">Firebase project configuration</h3>
                <p className="text-sm text-muted-foreground">Project settings are read from environment variables, not entered into the public admin page. Configure them in your local <code>.env.local</code> file and in Vercel Project Settings → Environment Variables. Setup steps are in <code>FIREBASE_SETUP.md</code>.</p>
                {getFirebaseConfig() && <p className="text-xs text-muted-foreground">Connected project: {getFirebaseConfig()?.projectId}</p>}
              </div>

              {/* Offline & Data Backup Tools */}
              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-semibold">Local Backup & Recovery</h3>
                <p className="text-xs text-muted-foreground">
                  Safely export all vehicles, pricing, contact details and rental rules as a JSON file, or restore
                  from a past backup.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleExportBackup}
                    className="btn btn-outline !min-h-9 !px-3.5 text-xs"
                  >
                    <Download className="size-3.5" />
                    <span>Export Fleet JSON Backup</span>
                  </button>

                  <label className="btn btn-outline !min-h-9 !px-3.5 text-xs cursor-pointer">
                    <Upload className="size-3.5" />
                    <span>Import Fleet JSON Backup</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={handleResetDefaults}
                    className="btn btn-outline !min-h-9 !px-3.5 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <RefreshCw className="size-3.5" />
                    <span>Reset Factory Fleet Defaults</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* CAR ADD / EDIT MODAL DIALOG */}
      {isCarModalOpen && (
        <CarEditorModal
          car={editingCar}
          totalCount={vehicles.length}
          onClose={() => {
            setIsCarModalOpen(false);
            setEditingCar(null);
          }}
          onSave={async (carData) => {
            const result = editingCar
              ? await updateVehicle(editingCar.id, carData)
              : await addVehicle(carData);
            if (!result.ok) {
              toast.error(result.error || "Could not save the vehicle.");
              return false;
            }
            toast.success(editingCar ? `Updated ${carData.name}` : `Added ${carData.name} to fleet`);
            setIsCarModalOpen(false);
            setEditingCar(null);
            return true;
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// CAR EDITOR MODAL COMPONENT
// ==========================================
function CarEditorModal({
  car,
  totalCount,
  onClose,
  onSave,
}: {
  car: Vehicle | null;
  totalCount: number;
  onClose: () => void;
  onSave: (car: Vehicle) => Promise<boolean>;
}) {
  const [name, setName] = useState(car?.name || "");
  const [slug, setSlug] = useState(car?.slug || "");
  const [seats, setSeats] = useState(car?.seats ?? 7);
  // Keep currency inputs as strings while editing so an empty field stays empty.
  const [dailyPrice, setDailyPrice] = useState(String(car?.dailyPrice ?? 2999));
  const [includedKmPerDay, setIncludedKmPerDay] = useState(car?.includedKmPerDay ?? 300);
  const [extraKmPrice, setExtraKmPrice] = useState(String(car?.extraKmPrice ?? 10));
  const [selfDrive, setSelfDrive] = useState(car?.selfDrive ?? true);
  const [withDriver, setWithDriver] = useState(car?.withDriver ?? true);
  const [available, setAvailable] = useState(car?.available ?? true);
  const [description, setDescription] = useState(car?.description || "");
  const [image, setImage] = useState(car?.image || ertigaImg);
  const [imageAlt, setImageAlt] = useState(car?.imageAlt || "");
  const [order, setOrder] = useState(car?.order ?? totalCount + 1);

  const [saving, setSaving] = useState(false);

  // Auto generate slug from name if new
  const handleNameChange = (val: string) => {
    setName(val);
    if (!car) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generatedSlug);
      setImageAlt(`${val} available for rent in Trichy`);
    }
  };

  // Compress vehicle photos before storing them with their Firestore vehicle record.
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!car?.id && !slug && !name.trim()) {
      toast.error("Enter the car name before adding a photo.");
      return;
    }
    setSaving(true);
    try {
      const dataUrl = await compressVehicleImage(file);
      setImage(dataUrl);
      toast.success("Photo optimized and ready to save with this vehicle.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Photo upload failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a car name");
      return;
    }
    if (!slug.trim()) {
      toast.error("Please enter a URL slug");
      return;
    }
    if (![dailyPrice, extraKmPrice].every((value) => /^\d+$/.test(value))) {
      toast.error("Enter a whole number for each price.");
      return;
    }

    setSaving(true);
    const vehicleData: Vehicle = {
      id: car?.id || slug,
      name: name.trim(),
      slug: slug.trim(),
      seats: Number(seats) || 5,
      dailyPrice: Number(dailyPrice),
      includedKmPerDay: Number(includedKmPerDay) || 300,
      extraKmPrice: Number(extraKmPrice),
      selfDrive: Boolean(selfDrive),
      withDriver: Boolean(withDriver),
      available: Boolean(available),
      description: description.trim(),
      image: image.startsWith("data:") ? "" : image || ertigaImg,
      imageAlt: imageAlt.trim() || `${name} rental in Trichy`,
      order: Number(order) || 1,
    };

    const saved = await onSave(vehicleData);
    setSaving(false);
    if (!saved) return;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-card border shadow-2xl rounded overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-secondary/30">
          <div>
            <h2 className="font-display text-2xl font-semibold">
              {car ? `Edit Vehicle: ${car.name}` : "Add New Vehicle to Fleet"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Define vehicle specifications, daily pricing, drive options, and imagery.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-accent"
          >
            ✕
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section: Basic Details */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary border-b pb-1">
              1. Basic Information
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium">Car Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Toyota Innova Crysta"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="field mt-1 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium">URL Slug *</label>
                <input
                  type="text"
                  placeholder="e.g. toyota-innova-crysta"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="field mt-1 text-sm font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium">Seating Capacity *</label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={seats}
                  onChange={(e) => setSeats(Number(e.target.value))}
                  className="field mt-1 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium">Display Order Rank</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                  className="field mt-1 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section: Pricing & Distances */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary border-b pb-1">
              2. Rental Pricing & Distance
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium">Daily Rental Rate (₹/day) *</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">
                    ₹
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={dailyPrice}
                    onChange={(e) => setDailyPrice(e.target.value.replace(/\D/g, ""))}
                    className="field !pl-8 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium">Included Km / Day *</label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min={50}
                    step={10}
                    value={includedKmPerDay}
                    onChange={(e) => setIncludedKmPerDay(Number(e.target.value))}
                    className="field !pr-10 text-sm"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    km
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium">Extra Km Charge (₹/km) *</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">
                    ₹
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={extraKmPrice}
                    onChange={(e) => setExtraKmPrice(e.target.value.replace(/\D/g, ""))}
                    className="field !pl-8 text-sm"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Drive Options */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary border-b pb-1">
              3. Drive Modes & Availability
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <label className="flex items-center gap-3 border p-3 rounded cursor-pointer bg-card hover:bg-accent/40">
                <input
                  type="checkbox"
                  checked={selfDrive}
                  onChange={(e) => setSelfDrive(e.target.checked)}
                  className="size-4 rounded text-primary"
                />
                <div>
                  <span className="block text-xs font-semibold">Self-Drive Allowed</span>
                  <span className="text-[11px] text-muted-foreground">Customer drives car</span>
                </div>
              </label>

              <label className="flex items-center gap-3 border p-3 rounded cursor-pointer bg-card hover:bg-accent/40">
                <input
                  type="checkbox"
                  checked={withDriver}
                  onChange={(e) => setWithDriver(e.target.checked)}
                  className="size-4 rounded text-primary"
                />
                <div>
                  <span className="block text-xs font-semibold">With Driver Available</span>
                  <span className="text-[11px] text-muted-foreground">Let customers know if this option is available</span>
                </div>
              </label>

              <label className="flex items-center gap-3 border p-3 rounded cursor-pointer bg-card hover:bg-accent/40">
                <input
                  type="checkbox"
                  checked={available}
                  onChange={(e) => setAvailable(e.target.checked)}
                  className="size-4 rounded text-primary"
                />
                <div>
                  <span className="block text-xs font-semibold">Active for Booking</span>
                  <span className="text-[11px] text-muted-foreground">Visible on public site</span>
                </div>
              </label>
            </div>

          </div>

          {/* Section: Vehicle Image & Presets */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary border-b pb-1">
              4. Car Image & Photography
            </h3>

            {/* Quick Presets Picker */}
            <div className="mt-3">
              <label className="block text-xs font-medium text-muted-foreground">
                Choose from popular presets or upload your own. Uploaded photos are resized and compressed before saving:
              </label>
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2">
                {CAR_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setImage(p.url);
                      setImageAlt(p.alt);
                    }}
                    className={`border rounded p-1 text-left transition-all ${
                      image === p.url ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "hover:border-foreground/40"
                    }`}
                  >
                    <img src={p.url} alt={p.name} className="aspect-[16/10] w-full object-cover rounded-sm" />
                    <span className="block mt-1 text-[10px] font-medium truncate text-center">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom URL or Upload */}
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <label className="block text-xs font-medium">Image URL / Path</label>
                <input
                  type="text"
                  placeholder="https://... or /src/assets/..."
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="field mt-1 text-xs font-mono"
                />
              </div>

              <div className="self-end">
                <label className="btn btn-outline !min-h-12 !px-4 text-xs cursor-pointer">
                  <Upload className="size-4" />
                  <span>Upload Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Preview Box */}
            {image && (
              <div className="mt-3 border p-2 rounded bg-secondary/20 flex items-center gap-3">
                <img
                  src={image}
                  alt={imageAlt || "Car preview"}
                  className="size-16 object-cover rounded border"
                />
                <div className="flex-1">
                  <label className="block text-xs font-medium">Image Alt Text (SEO)</label>
                  <input
                    type="text"
                    value={imageAlt}
                    onChange={(e) => setImageAlt(e.target.value)}
                    placeholder="e.g. Silver Toyota Innova Crysta available for rent in Trichy"
                    className="field mt-1 !min-h-8 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section: Description */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary border-b pb-1">
              5. Description & Highlights
            </h3>
            <div className="mt-3">
              <textarea
                rows={3}
                placeholder="Spacious vehicle for family trips, outstation travel, temple visits, and wedding events..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="field !min-h-[80px] text-sm"
              />
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline !min-h-10 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary !min-h-10 !px-6 text-sm"
            >
              {saving ? "Saving..." : car ? "Update Vehicle" : "Add Vehicle to Fleet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// BUSINESS & CONTACT DETAILS FORM COMPONENT
// ==========================================
function BusinessContactForm({
  initialBusiness,
  onSave,
}: {
  initialBusiness: ReturnType<typeof getStoredBusiness>;
  onSave: (updates: Partial<ReturnType<typeof getStoredBusiness>>) => Promise<any>;
}) {
  const [name, setName] = useState(initialBusiness.name);
  const [tagline, setTagline] = useState(initialBusiness.tagline);
  const [phone, setPhone] = useState(initialBusiness.phone);
  const [whatsapp, setWhatsapp] = useState(initialBusiness.whatsapp);
  const [location, setLocation] = useState(initialBusiness.location);
  const [fullAddress, setFullAddress] = useState(initialBusiness.fullAddress || "");
  const [mapsUrl, setMapsUrl] = useState(initialBusiness.mapsUrl || "");
  const [siteUrl, setSiteUrl] = useState(initialBusiness.siteUrl || "https://jvcarrentals.in");

  const [heading, setHeading] = useState(initialBusiness.hero?.heading || "Reliable Car Rentals in Trichy");
  const [heroDesc, setHeroDesc] = useState(
    initialBusiness.hero?.description ||
      "Self Drive & With Driver options for everyday travel, special occasions and more.",
  );

  const [isSaving, setIsSaving] = useState(false);

  const testWaLink = waLink(whatsapp, `Hello ${name}, testing WhatsApp booking connection.`);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsapp.trim()) {
      toast.error("Please enter a valid WhatsApp phone number");
      return;
    }

    setIsSaving(true);
    const result = await onSave({
      name: name.trim(),
      tagline: tagline.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim(),
      location: location.trim(),
      fullAddress: fullAddress.trim(),
      mapsUrl: mapsUrl.trim(),
      siteUrl: siteUrl.trim(),
      hero: {
        heading: heading.trim(),
        description: heroDesc.trim(),
      },
    });
    setIsSaving(false);
    if (result?.ok === false) toast.error(result.error || "Could not save business information.");
    else toast.success("Business information saved.");
  };

  return (
    <form onSubmit={handleSubmit} className="border bg-card p-6 md:p-8 rounded space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-display font-semibold">Contact & Business Information</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update phone numbers, WhatsApp link, physical pickup location, and hero titles across the entire website.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Business Brand Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field mt-1 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Brand Tagline
          </label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="field mt-1 text-sm"
          />
        </div>

        {/* Primary call number */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary">
            Call Phone Number *
          </label>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. +91 97888 12015"
            className="field mt-1 text-sm font-semibold"
            required
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Shown as the call number in the moving contact strip.
          </p>
        </div>

        {/* WhatsApp & Booking Phone */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary">
            WhatsApp Number *
          </label>
          <div className="relative mt-1">
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="e.g. +91 80727 23844"
              className="field text-sm font-semibold"
              required
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            This updates all WhatsApp and booking buttons, and the WhatsApp number in the moving strip.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Area / City Served *
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Trichy, Tamil Nadu"
            className="field mt-1 text-sm"
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Garage / Pickup Physical Address
          </label>
          <input
            type="text"
            value={fullAddress}
            onChange={(e) => setFullAddress(e.target.value)}
            placeholder="e.g. No. 45, Rockins Road, Cantonment, Tiruchirappalli - 620001"
            className="field mt-1 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Google Maps Location Link
          </label>
          <input
            type="url"
            value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
            placeholder="https://maps.google.com/?q=..."
            className="field mt-1 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Website Domain URL
          </label>
          <input
            type="url"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="https://jvcarrentals.in"
            className="field mt-1 text-sm"
          />
        </div>
      </div>

      {/* Hero Content Section */}
      <div className="border-t pt-6 space-y-4">
        <h3 className="text-base font-semibold">Homepage Hero Section Copy</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium">Hero Heading</label>
            <input
              type="text"
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              className="field mt-1 text-sm font-display text-lg"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium">Hero Description Subtitle</label>
            <textarea
              rows={2}
              value={heroDesc}
              onChange={(e) => setHeroDesc(e.target.value)}
              className="field mt-1 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Live WhatsApp Test Box */}
      <div className="border p-4 rounded bg-emerald-500/5 border-emerald-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            WhatsApp Integration Preview
          </span>
          <p className="text-xs text-muted-foreground">
            Click to test sending an inquiry to <strong>{whatsapp}</strong>:
          </p>
        </div>
        <a
          href={testWaLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline !min-h-9 !px-3 text-xs bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white"
        >
          <MessageSquare className="size-3.5" />
          Test WhatsApp Link
        </a>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="btn btn-primary !min-h-11 !px-8 text-sm"
        >
          {isSaving ? "Saving Changes..." : "Save Contact & Business Info"}
        </button>
      </div>
    </form>
  );
}

// ==========================================
// RENTAL RULES & POLICIES FORM COMPONENT
// ==========================================
function RentalRulesForm({
  initialBusiness,
  onSave,
  vehicles,
}: {
  initialBusiness: ReturnType<typeof getStoredBusiness>;
  onSave: (updates: Partial<ReturnType<typeof getStoredBusiness>>) => Promise<any>;
  vehicles: Vehicle[];
}) {
  const currentRules = initialBusiness.rules;
  const [minDays, setMinDays] = useState(currentRules.minDays ?? 1);
  const [hoursPerDay, setHoursPerDay] = useState(currentRules.hoursPerDay ?? 24);
  const [includedKmPerDay, setIncludedKmPerDay] = useState(currentRules.includedKmPerDay ?? 300);
  const [minSelfDriveAge, setMinSelfDriveAge] = useState(currentRules.minSelfDriveAge ?? 20);
  const [documents, setDocuments] = useState(
    currentRules.documents || "Required documents and security requirements apply and will be shared on WhatsApp.",
  );
  const [delivery, setDelivery] = useState(
    currentRules.delivery ||
      "Delivery / pickup to another location may be available for an additional distance-based charge.",
  );

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const result = await onSave({
      rules: {
        ...currentRules,
        minDays: Number(minDays),
        hoursPerDay: Number(hoursPerDay),
        includedKmPerDay: Number(includedKmPerDay),
        minSelfDriveAge: Number(minSelfDriveAge),
        documents: documents.trim(),
        delivery: delivery.trim(),
      },
    });
    setIsSaving(false);
    if (result?.ok === false) toast.error(result.error || "Could not save rental rules.");
    else toast.success("Rental rules saved.");
  };

  return (
    <form onSubmit={handleSubmit} className="border bg-card p-6 md:p-8 rounded space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-display font-semibold">Rental Rules & Policies</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Define standard rental hours, kilometre allowances, minimum age limits, and delivery terms.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium">Min Rental Period (Days)</label>
          <input
            type="number"
            min={1}
            value={minDays}
            onChange={(e) => setMinDays(Number(e.target.value))}
            className="field mt-1 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium">Hours Per Rental Day</label>
          <input
            type="number"
            min={12}
            max={48}
            value={hoursPerDay}
            onChange={(e) => setHoursPerDay(Number(e.target.value))}
            className="field mt-1 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium">Standard Included Km / Day</label>
          <input
            type="number"
            min={50}
            step={50}
            value={includedKmPerDay}
            onChange={(e) => setIncludedKmPerDay(Number(e.target.value))}
            className="field mt-1 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium">Min Age for Self-Drive</label>
          <input
            type="number"
            min={18}
            max={50}
            value={minSelfDriveAge}
            onChange={(e) => setMinSelfDriveAge(Number(e.target.value))}
            className="field mt-1 text-sm"
            required
          />
        </div>

      </div>

      <div className="space-y-4 border-t pt-4">
        <div>
          <label className="block text-xs font-medium">Delivery & Pickup Policy Note</label>
          <textarea
            rows={2}
            value={delivery}
            onChange={(e) => setDelivery(e.target.value)}
            className="field mt-1 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium">Required Documents & Security Deposit Note</label>
          <textarea
            rows={2}
            value={documents}
            onChange={(e) => setDocuments(e.target.value)}
            className="field mt-1 text-sm"
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="btn btn-primary !min-h-11 !px-8 text-sm"
        >
          {isSaving ? "Saving..." : "Save Rental Rules"}
        </button>
      </div>
    </form>
  );
}
