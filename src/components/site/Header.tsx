import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Shield, X } from "lucide-react";
import { useBusiness } from "@/hooks/useFleetData";
import { waLink } from "@/lib/booking";

const nav = [
  ["Home", "/#top"],
  ["Our Cars", "/#cars"],
  ["Services", "/#services"],
  ["Rental Rules", "/#rules"],
  ["FAQ", "/#faq"],
  ["Contact", "/#contact"],
] as const;

export function Logo({
  className = "",
  variant = "default",
  imgClassName = "h-11 md:h-12 w-auto object-contain",
}: {
  className?: string;
  variant?: "default" | "light";
  imgClassName?: string;
}) {
  const { business } = useBusiness();
  const isLight = variant === "light" || className.includes("text-ink-foreground");
  const src = isLight ? business.logoWhite : business.logo;

  return (
    <a
      href="/#top"
      className={`inline-flex items-center gap-2 transition-opacity hover:opacity-90 ${className}`}
      aria-label={`${business.name} home`}
    >
      <img
        src={src}
        alt={business.name}
        className={imgClassName}
        width={788}
        height={464}
        loading="eager"
      />
    </a>
  );
}

export function Header() {
  const { business } = useBusiness();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const wa = waLink(
    business.whatsapp,
    `Hello ${business.name}, I'd like to enquire about a car rental.`,
  );

  return (
    <header
      className={`sticky top-0 z-40 border-b bg-background/95 backdrop-blur transition-colors ${scrolled ? "border-border" : "border-transparent"}`}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-7 text-sm">
            {nav.map(([l, h]) => (
              <li key={h}>
                <a
                  href={h}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2.5">
          <Link
            to="/admin"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border rounded transition-colors hover:border-foreground/40"
            title="Admin Dashboard"
          >
            <Shield className="size-3.5 text-primary" />
            <span>Admin</span>
          </Link>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary !min-h-10 !px-4 text-sm"
          >
            WhatsApp Us
          </a>
          <button
            className="lg:hidden p-2"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Mobile" className="lg:hidden border-t bg-background">
          <ul className="container-page py-3">
            {nav.map(([l, h]) => (
              <li key={h}>
                <a
                  href={h}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-lg font-display border-b border-border last:border-0"
                >
                  {l}
                </a>
              </li>
            ))}
            <li className="pt-2">
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 py-3 text-base text-primary font-medium"
              >
                <Shield className="size-4" />
                Admin Panel (Fleet & Store)
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
