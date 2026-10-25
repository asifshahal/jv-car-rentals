# Project Architecture & Guidelines

- Default business data (vehicles, prices, rules, FAQ, contact) lives in `src/config/business.ts`; owner edits are stored in Firebase Firestore and compressed vehicle photos in Firestore. Keep pricing/WhatsApp logic in `src/lib/booking.ts` and preserve the config fallback for local development.
- UI components reside under `src/components/`, pages/routes under `src/routes/`.
- Styling uses Tailwind CSS with design tokens defined in `src/styles.css`.
