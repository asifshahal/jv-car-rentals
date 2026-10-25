# JV Car Rentals

Official web platform for **JV Car Rentals** — premium self-drive and chauffeur-driven car rental services based in Trichy, Tamil Nadu.

## Features

- **Fleet Showcase**: High-resolution catalog of available cars (Suzuki Ertiga 7-seater, Hyundai Creta 5-seater) with transparent pricing and specs.
- **WhatsApp Direct Booking**: Instant quote calculation and pre-filled WhatsApp booking links for fast customer communication.
- **Rental Options**: Supports both Self Drive and With Driver rental modes.
- **Responsive & Accessible**: Mobile-first design, fast SSR performance via TanStack Start, and modern typography.
- **Owner-editable business data**: Fleet, prices, rental rules, FAQs, and contact details are managed in the secure admin panel and stored in Firebase Firestore. Vehicle photos are compressed and stored with fleet records in Firestore. Local defaults remain in `src/config/business.ts`.

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) + [React](https://react.dev)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com)
- **Routing**: [TanStack Router](https://tanstack.com/router)
- **Icons**: [Lucide React](https://lucide.dev)
- **Testing**: [Vitest](https://vitest.dev)

## Admin setup

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for Firebase Authentication, Firestore, security rules, and Vercel environment setup. The admin panel is available at `/admin` after Firebase is configured and an owner admin record is created.

## Getting Started

### Prerequisites

- Node.js 18+ (tested with Node 20+)
- npm or bun

### Installation

```bash
npm install
```

### Development

Run the local development server:

```bash
npm run dev
```

The site will be available at `http://localhost:8080/`.

### Testing & Quality

```bash
# Run unit tests
npm run test

# Run ESLint
npm run lint

# Format code with Prettier
npm run format

# Production build
npm run build
```

## License

Proprietary — All rights reserved by JV Car Rentals.
