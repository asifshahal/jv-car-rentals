import { useEffect, useMemo, useState } from "react";
import type { RentalType } from "@/config/business";
import { useFleet, useBusiness } from "@/hooks/useFleetData";
import { buildMessage, estimate, inr, rentalDays, validate, waLink } from "@/lib/booking";

interface Props {
  vehicleId: string;
  onVehicleChange: (id: string) => void;
  rentalType: RentalType | "";
  onTypeChange: (t: RentalType) => void;
}

function Err({ id, msg }: { id: string; msg?: string }) {
  return msg ? (
    <p id={id} role="alert" className="mt-1.5 text-sm text-destructive">
      {msg}
    </p>
  ) : null;
}

export function BookingForm({ vehicleId, onVehicleChange, rentalType, onTypeChange }: Props) {
  const { activeVehicles: vs } = useFleet();
  const { business } = useBusiness();
  const [pickup, setPickup] = useState("");
  const [ret, setRet] = useState("");
  const [name, setName] = useState("");
  const [delivery, setDelivery] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [today, setToday] = useState("");
  useEffect(() => setToday(new Date().toLocaleDateString("en-CA")), []);

  const vehicle = vs.find((v) => v.id === vehicleId);
  const days = pickup && ret ? rentalDays(pickup, ret) : null;
  const est = useMemo(
    () => (vehicle && rentalType === "self" && days ? estimate(vehicle, days) : null),
    [vehicle, rentalType, days],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      vehicle,
      type: rentalType || undefined,
      pickup,
      ret,
      name,
      delivery,
      deliveryLocation,
    };
    const errs = validate(input, today);
    if (!business.whatsapp)
      errs.form = "WhatsApp booking is temporarily unavailable. Please try again later.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const msg = buildMessage(
      { ...input, vehicle: vehicle!, type: rentalType as RentalType },
      business.name,
    );
    window.open(waLink(business.whatsapp, msg), "_blank", "noopener");
  };

  const label = "block text-sm font-semibold mb-1.5";

  return (
    <form
      onSubmit={submit}
      noValidate
      className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
      aria-label="Start your rental"
    >
      <div>
        <label htmlFor="car" className={label}>
          Choose your car
        </label>
        <select
          id="car"
          className="field"
          value={vehicleId}
          onChange={(e) => onVehicleChange(e.target.value)}
          aria-invalid={!!errors.vehicle}
          aria-describedby="car-err"
        >
          <option value="">Select a car</option>
          {vs.map((v) => (
            <option key={v.id} value={v.id} disabled={!v.available}>
              {v.name} — {v.seats} seater · {inr(v.dailyPrice)}/day
              {!v.available ? " (unavailable)" : ""}
            </option>
          ))}
        </select>
        <Err id="car-err" msg={errors.vehicle} />
      </div>

      <fieldset>
        <legend className={label}>Rental type</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["self", "Self Drive"],
              ["driver", "With Driver"],
            ] as const
          ).map(([v, l]) => (
            <label
              key={v}
              className={`field flex cursor-pointer items-center gap-2 ${rentalType === v ? "!border-primary bg-accent" : ""}`}
            >
              <input
                type="radio"
                name="type"
                value={v}
                checked={rentalType === v}
                disabled={v === "driver" && Boolean(vehicle && !vehicle.withDriver)}
                onChange={() => onTypeChange(v)}
                className="accent-primary"
              />
              <span className="text-sm font-medium">
                {l}{v === "driver" && vehicle ? ` — ${vehicle.withDriver ? "Available" : "Not available"}` : ""}
              </span>
            </label>
          ))}
        </div>
        <Err id="type-err" msg={errors.type} />
      </fieldset>

      <div>
        <label htmlFor="name" className={label}>
          Your name
        </label>
        <input
          id="name"
          className="field"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!!errors.name}
        />
        <Err id="name-err" msg={errors.name} />
      </div>

      <div>
        <label htmlFor="pickup" className={label}>
          Pickup date
        </label>
        <input
          id="pickup"
          type="date"
          min={today}
          className="field"
          value={pickup}
          onChange={(e) => setPickup(e.target.value)}
          aria-invalid={!!errors.pickup}
        />
        <Err id="pickup-err" msg={errors.pickup} />
      </div>

      <div>
        <label htmlFor="return" className={label}>
          Return date
        </label>
        <input
          id="return"
          type="date"
          min={pickup || today}
          className="field"
          value={ret}
          onChange={(e) => setRet(e.target.value)}
          aria-invalid={!!errors.ret}
        />
        <Err id="ret-err" msg={errors.ret} />
      </div>

      <fieldset>
        <legend className={label}>Pickup / delivery</legend>
        <div className="grid gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="del"
              checked={!delivery}
              onChange={() => setDelivery(false)}
              className="accent-primary size-4"
            />
            Pick up from our location
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="del"
              checked={delivery}
              onChange={() => setDelivery(true)}
              className="accent-primary size-4"
            />
            Request delivery / pickup
          </label>
        </div>
        {delivery && (
          <div className="mt-3">
            <label htmlFor="dloc" className="sr-only">
              Delivery location
            </label>
            <input
              id="dloc"
              className="field"
              placeholder="Area or address in Trichy"
              value={deliveryLocation}
              onChange={(e) => setDeliveryLocation(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Additional charges may apply based on distance.
            </p>
            <Err id="dloc-err" msg={errors.deliveryLocation} />
          </div>
        )}
      </fieldset>

      <div className="md:col-span-2 lg:col-span-3 flex flex-col gap-4 border-t pt-5 md:flex-row md:items-center md:justify-between">
        <div aria-live="polite">
          {rentalType === "driver" ? (
            <>
              <p className="eyebrow text-muted-foreground">
                With driver{days ? ` · ${days} day${days > 1 ? "s" : ""}` : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                Availability and charges will be confirmed with you on WhatsApp.
              </p>
            </>
          ) : est && days ? (
            <>
              <p className="eyebrow text-muted-foreground">
                Estimated rental · {days} day{days > 1 ? "s" : ""}
              </p>
              <p className="font-display text-3xl font-semibold">{inr(est.total)}</p>
              <p className="text-sm text-muted-foreground">{est.includedKm} km included · fuel excluded</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Choose a car, rental type and dates to see an estimate.
            </p>
          )}
          {errors.form && (
            <p role="alert" className="mt-1 text-sm text-destructive">
              {errors.form}
            </p>
          )}
        </div>
        <button type="submit" className="btn btn-primary w-full md:w-auto">
          Continue on WhatsApp
        </button>
      </div>
    </form>
  );
}
