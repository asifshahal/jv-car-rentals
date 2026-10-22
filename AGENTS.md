# Project Architecture & Guidelines

- Business data (vehicles, prices, rules, FAQ, contact) lives only in `src/config/business.ts` and pricing/WhatsApp logic in `src/lib/booking.ts`, so a future admin panel or backend store can replace the config without UI changes.
- UI components reside under `src/components/`, pages/routes under `src/routes/`.
- Styling uses Tailwind CSS with design tokens defined in `src/styles.css`.
