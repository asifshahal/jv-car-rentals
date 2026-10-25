import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, MapPin, Minus, Shield } from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import weddingImg from "@/assets/wedding.jpg";
import birthdayImg from "@/assets/birthday.jpg";
import { Header, Logo } from "@/components/site/Header";
import { BookingForm } from "@/components/site/BookingForm";
import { business, activeVehicles, faqs, rentalRules, type RentalType } from "@/config/business";
import { useFleet, useBusiness, useDynamicRentalRules, useDynamicFaqs } from "@/hooks/useFleetData";
import { inr, waLink } from "@/lib/booking";

const TITLE = "Car Rental in Trichy — Self Drive & With Driver | JV Car Rentals";
const DESC =
  "Rent a Suzuki Ertiga (7 seater) or Hyundai Creta (5 seater) in Trichy. Self drive or with driver, 300 km/day included. Enquire and book on WhatsApp.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: business.siteUrl + "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "AutoRental",
            name: business.name,
            url: business.siteUrl,
            telephone: business.whatsapp,
            areaServed: "Tiruchirappalli",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Tiruchirappalli",
              addressRegion: "Tamil Nadu",
              addressCountry: "IN",
            },
            makesOffer: activeVehicles().map((v) => ({
              "@type": "Offer",
              price: v.dailyPrice,
              priceCurrency: "INR",
              itemOffered: { "@type": "Car", name: v.name, seatingCapacity: v.seats },
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs().map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]),
      },
    ],
  }),
  component: Index,
});

const wa = (msg: string) => waLink(business.whatsapp, msg);

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mb-10 max-w-2xl">
      <p className="eyebrow text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-4xl md:text-5xl leading-[1.05]">{title}</h2>
      {sub && <p className="mt-4 text-lg text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Index() {
  const [vehicleId, setVehicleId] = useState("");
  const [type, setType] = useState<RentalType | "">("");
  const { activeVehicles: vs, vehicles: allVehicles } = useFleet();
  const { business } = useBusiness();
  const r = business.rules;
  const rules = useDynamicRentalRules();
  const dynamicFaqs = useDynamicFaqs();

  const chooseCar = (id: string, t?: RentalType) => {
    setVehicleId(id);
    if (t) setType(t);
    document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
  };

  const featuredCar = vs[0] || allVehicles[0] || {
    id: "car",
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
    image: "",
    imageAlt: "Suzuki Ertiga",
    order: 1,
  };

  return (
    <div id="top" className="pb-20 lg:pb-0">
      <Header />
      <main>
        {/* Hero */}
        <section className="relative">
          <img
            src={heroImg}
            alt="White SUV on a tree-lined road in Trichy with the Srirangam temple tower in the distance"
            width={1920}
            height={1088}
            className="h-[78vh] min-h-[520px] max-h-[820px] w-full object-cover object-[70%_center]"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--ink)_70%,transparent),transparent_65%)]" />
          <div className="absolute inset-0 flex items-end md:items-center">
            <div className="container-page pb-12 md:pb-0 text-ink-foreground">
              <p className="flex items-center gap-2 eyebrow">
                <MapPin className="size-4" />
                {business.location}
              </p>
              <h1 className="mt-4 max-w-xl text-5xl md:text-6xl leading-[1.02]">
                {business.hero.heading}
              </h1>
              <p className="mt-5 max-w-md text-lg text-ink-foreground/85">
                {business.hero.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#cars" className="btn btn-primary">
                  View Our Cars
                </a>
                <a
                  href={wa(`Hello ${business.name}, I'd like to enquire about a car rental.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline text-ink-foreground"
                >
                  WhatsApp Us
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Quick booking */}
        <section
          id="book"
          aria-labelledby="book-h"
          className="container-page relative -mt-10 md:-mt-16 z-10"
        >
          <div className="border bg-card p-5 md:p-8 shadow-[0_20px_40px_-30px_var(--ink)]">
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="book-h" className="text-3xl">
                Start your rental
              </h2>
              <p className="text-sm text-muted-foreground">
                Availability is confirmed on WhatsApp.
              </p>
            </div>
            <BookingForm
              vehicleId={vehicleId}
              onVehicleChange={setVehicleId}
              rentalType={type}
              onTypeChange={setType}
            />
          </div>
        </section>

        {/* Cars */}
        <section id="cars" className="container-page py-20 md:py-28">
          <SectionHead
            eyebrow="Our cars"
            title="Choose Your Car"
            sub="Simple daily rental pricing. Choose the car that suits your journey."
          />
          <div className="grid gap-10 md:grid-cols-2">
            {vs.map((v) => (
              <article key={v.id} className="group border-t border-foreground pt-6">
                <div className="overflow-hidden bg-secondary">
                  <img
                    src={v.image}
                    alt={v.imageAlt}
                    width={1280}
                    height={832}
                    loading="lazy"
                    className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="mt-6 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-3xl">{v.name}</h3>
                    <p className="mt-1 text-muted-foreground">{v.seats} Seater</p>
                  </div>
                  <p className="text-right">
                    <span className="font-display text-3xl font-semibold">{inr(v.dailyPrice)}</span>
                    <span className="block text-sm text-muted-foreground">per day</span>
                  </p>
                </div>
                <dl className="mt-5 grid grid-cols-2 border-y text-sm">
                  <div className="py-3 pr-3 border-r">
                    <dt className="text-muted-foreground">Included</dt>
                    <dd className="font-semibold">{v.includedKmPerDay} km / day</dd>
                  </div>
                  <div className="py-3 pl-4">
                    <dt className="text-muted-foreground">Extra km</dt>
                    <dd className="font-semibold">{inr(v.extraKmPrice)} / km</dd>
                  </div>
                </dl>
                <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <li className="flex items-center gap-1.5">
                    {v.selfDrive ? (
                      <Check className="size-4 text-primary" />
                    ) : (
                      <Minus className="size-4" />
                    )}
                    Self Drive{!v.selfDrive && " (not offered)"}
                  </li>
                  <li className="flex items-center gap-1.5">
                    {v.withDriver ? (
                      <Check className="size-4 text-primary" />
                    ) : (
                      <Minus className="size-4" />
                    )}
                    With Driver · {inr(v.driverFeePerDay)}/day
                  </li>
                  <li className="text-muted-foreground">Fuel excluded</li>
                </ul>
                <button
                  onClick={() => chooseCar(v.id)}
                  disabled={!v.available}
                  className="btn btn-primary mt-6 w-full sm:w-auto disabled:opacity-50"
                >
                  {v.available ? "Book on WhatsApp" : "Currently unavailable"}
                </button>
              </article>
            ))}
          </div>
        </section>

        {/* Rental types */}
        <section id="services" className="bg-ink text-ink-foreground py-20 md:py-28">
          <div className="container-page">
            <p className="eyebrow text-ink-muted">Services</p>
            <div className="mt-8 grid md:grid-cols-2">
              <div className="py-8 md:pr-12 md:border-r border-ink-border">
                <h2 className="text-4xl">Self Drive</h2>
                <p className="mt-2 font-display text-xl italic text-ink-muted">
                  Your journey, your way.
                </p>
                <p className="mt-5 text-ink-foreground/80">
                  Collect the car and drive it yourself — for work, family visits or a weekend away.
                </p>
                <ul className="mt-6 space-y-2 text-sm">
                  {[
                    `Minimum age: ${r.minSelfDriveAge}`,
                    "Valid driving licence required",
                    `${r.includedKmPerDay} km/day included`,
                    "Fuel excluded",
                    `${r.hoursPerDay}-hour rental day`,
                  ].map((x) => (
                    <li key={x} className="flex gap-2 border-b border-ink-border pb-2">
                      <Check className="size-4 mt-0.5 shrink-0" />
                      {x}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    setType("self");
                    document.getElementById("cars")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="btn btn-outline mt-8"
                >
                  Choose a Self Drive Car
                </button>
              </div>
              <div className="py-8 md:pl-12 border-t md:border-t-0 border-ink-border">
                <h2 className="text-4xl">With Driver</h2>
                <p className="mt-2 font-display text-xl italic text-ink-muted">
                  Travel comfortably with a driver.
                </p>
                <p className="mt-5 text-ink-foreground/80">
                  Sit back while a driver takes the wheel — useful for long trips and functions.
                </p>
                <ul className="mt-6 space-y-2 text-sm">
                  {[
                    "Driver available with the rental",
                    `${inr(r.driverFeePerDay)}/day driver charge`,
                    "Fuel excluded",
                    r.driverTerms,
                  ].map((x) => (
                    <li key={x} className="flex gap-2 border-b border-ink-border pb-2">
                      <Check className="size-4 mt-0.5 shrink-0" />
                      {x}
                    </li>
                  ))}
                </ul>
                <a
                  href={wa(
                    `Hello ${business.name}, I'd like to enquire about renting a car with a driver.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline mt-8"
                >
                  Enquire on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Occasions */}
        <section className="container-page py-20 md:py-28">
          <SectionHead eyebrow="Occasions" title="Cars for Special Moments" />
          <div className="grid gap-12 md:grid-cols-2">
            {[
              {
                img: birthdayImg,
                alt: "Car boot decorated with balloons, lights and a birthday cake",
                t: "Birthday Surprises",
                d: "We decorate the boot of the car and bring it to your chosen location so you can celebrate — then we take it back.",
                cta: "Plan a Birthday Surprise",
                msg: "I'd like to plan a birthday surprise car.",
              },
              {
                img: weddingImg,
                alt: "Car bonnet decorated with jasmine and marigold garlands for a wedding",
                t: "Wedding Cars",
                d: "Decorated cars for weddings, arranged around the bride and groom's requirements.",
                cta: "Enquire for a Wedding",
                msg: "I'd like to enquire about a wedding car.",
              },
            ].map((o) => (
              <article key={o.t}>
                <img
                  src={o.img}
                  alt={o.alt}
                  width={1024}
                  height={1024}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover"
                />
                <h3 className="mt-6 text-3xl">{o.t}</h3>
                <p className="mt-3 max-w-md text-muted-foreground">{o.d}</p>
                <a
                  href={wa(`Hello ${business.name}, ${o.msg}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-block font-semibold text-primary underline underline-offset-4 decoration-1 hover:decoration-2"
                >
                  {o.cta} →
                </a>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-y bg-secondary py-20">
          <div className="container-page">
            <h2 className="text-4xl md:text-5xl">Rent a Car in Three Simple Steps</h2>
            <ol className="mt-12 grid gap-10 md:grid-cols-3">
              {[
                ["Choose Your Car", "Select your preferred vehicle and rental type."],
                ["Share Your Details", "Choose your dates and provide your name."],
                [
                  "Confirm on WhatsApp",
                  `Your rental details are sent to ${business.name} on WhatsApp, where we confirm availability.`,
                ],
              ].map(([t, d], i) => (
                <li key={t} className="border-t border-foreground pt-5">
                  <span className="font-display text-2xl text-primary">0{i + 1}</span>
                  <h3 className="mt-2 text-2xl">{t}</h3>
                  <p className="mt-2 text-muted-foreground">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Rules + example */}
        <section
          id="rules"
          className="container-page py-20 md:py-28 grid gap-14 lg:grid-cols-[1.4fr_1fr]"
        >
          <div>
            <SectionHead eyebrow="Before you book" title="Rental Rules" />
            <ul className="divide-y border-y">
              {rules.map((x) => (
                <li key={x} className="flex gap-3 py-3.5">
                  <Check className="size-4 mt-1 shrink-0 text-primary" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <aside className="self-start border bg-card p-7" aria-labelledby="ex-h">
            <p className="eyebrow text-muted-foreground">Pricing example</p>
            <h3 id="ex-h" className="mt-3 text-2xl">
              {featuredCar.name} — 2 Days
            </h3>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt>{inr(featuredCar.dailyPrice)} × 2 days</dt>
                <dd className="font-semibold">{inr(featuredCar.dailyPrice * 2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Included distance</dt>
                <dd className="font-semibold">{featuredCar.includedKmPerDay * 2} km</dd>
              </div>
              <div className="flex justify-between">
                <dt>Additional km</dt>
                <dd className="font-semibold">{inr(featuredCar.extraKmPrice)}/km</dd>
              </div>
              <div className="flex justify-between">
                <dt>Fuel</dt>
                <dd className="font-semibold">Excluded</dd>
              </div>
              <div className="flex justify-between border-t pt-3 text-base">
                <dt>Estimated rental</dt>
                <dd className="font-display text-2xl font-semibold">
                  {inr(featuredCar.dailyPrice * 2)}
                </dd>
              </div>
            </dl>
            <p className="mt-5 text-xs text-muted-foreground">
              This is an example only, not a booking confirmation.
            </p>
          </aside>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t py-20 md:py-28">
          <div className="container-page grid gap-10 lg:grid-cols-[1fr_2fr]">
            <SectionHead eyebrow="FAQ" title="Common Questions" />
            <div className="divide-y border-y">
              {dynamicFaqs.map((f) => (
                <details key={f.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl font-semibold">
                    {f.q}
                    <span
                      className="text-2xl text-primary transition-transform group-open:rotate-45"
                      aria-hidden
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="bg-ink text-ink-foreground py-20 md:py-24">
          <div className="container-page grid gap-10 md:grid-cols-2 md:items-end">
            <div>
              <p className="eyebrow text-ink-muted">Contact</p>
              <h2 className="mt-3 text-5xl">{business.name}</h2>
              <p className="mt-4 flex items-center gap-2 text-lg">
                <MapPin className="size-5" />
                {business.fullAddress || business.location}
              </p>
              <p className="mt-2 text-lg">
                WhatsApp:{" "}
                <a href={wa(`Hello ${business.name}`)} className="underline underline-offset-4">
                  {business.whatsapp}
                </a>
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <a
                href={wa(`Hello ${business.name}, I'd like to enquire about a car rental.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Chat on WhatsApp
              </a>
              <a
                href={
                  business.mapsUrl ||
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.location)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
              >
                Get Directions
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-ink text-ink-muted border-t border-ink-border">
        <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <Logo variant="light" />
            <p className="mt-3">Car Rental in Trichy</p>
          </div>
          <div>
            <p className="eyebrow text-ink-foreground mb-3">Links</p>
            <ul className="space-y-2">
              {[
                ["Home", "#top"],
                ["Our Cars", "#cars"],
                ["Services", "#services"],
                ["Rental Rules", "#rules"],
                ["FAQ", "#faq"],
                ["Contact", "#contact"],
              ].map(([l, h]) => (
                <li key={h}>
                  <a href={h} className="hover:text-ink-foreground">
                    {l}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 text-primary hover:text-ink-foreground font-medium pt-1"
                >
                  <Shield className="size-3.5" />
                  Admin Dashboard
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="eyebrow text-ink-foreground mb-3">Services</p>
            <ul className="space-y-2">
              <li>Self Drive Car Rental</li>
              <li>Car Rental With Driver</li>
              <li>Birthday Surprise Cars</li>
              <li>Wedding Cars</li>
            </ul>
          </div>
          <div>
            <p className="eyebrow text-ink-foreground mb-3">Contact</p>
            <ul className="space-y-2">
              <li>
                <a href={wa(`Hello ${business.name}`)} className="hover:text-ink-foreground">
                  WhatsApp {business.whatsapp}
                </a>
              </li>
              <li>{business.location}</li>
            </ul>
          </div>
        </div>
        <p className="container-page border-t border-ink-border py-6 text-xs">
          © {new Date().getFullYear()} {business.name}. All rights reserved.
        </p>
      </footer>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <a href="#book" className="btn btn-primary w-full">
          Book / Enquire on WhatsApp
        </a>
      </div>
    </div>
  );
}
