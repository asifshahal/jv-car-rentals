# Firebase setup for the JV Car Rentals admin panel

This setup uses Firebase Authentication for owner sign-in and Cloud Firestore for fleet, business settings, and compressed car photos. It does **not** use Firebase Storage or require a billing account. Cloud Firestore has a no-cost quota on the Spark plan; if that quota is exceeded, Firestore access can pause until the quota resets. Each Firestore document is limited to 1 MiB, so the admin compresses each uploaded photo to a small WebP image before saving it in the car record.

## One-time setup

1. Create a Firebase project and register a Web app.
2. Enable **Authentication → Sign-in method → Email/Password**, then create the owner account. Use a strong password and do not put it in this repository.
3. Create one Cloud Firestore database on the Spark plan.
4. Create a Firestore document at `jv_admins/{OWNER_AUTH_UID}` with the boolean field `enabled: true`. Copy the UID from the Authentication users list. Do not grant admin status to other users.
5. In the Firestore **Rules** page, publish the rules from `firestore.rules`. They allow public reads of website data and restrict writes to an authenticated account with an enabled admin record.
6. Copy `.env.example` to `.env.local` and fill it with the Firebase Web App settings. Set the same `VITE_FIREBASE_*` variables in Vercel for Production and Preview deployments, then redeploy.
7. Open `/admin`, sign in with the owner account, and add/update a vehicle. Uploaded photos are compressed and saved with that vehicle in Firestore.

## Important behavior

- Firebase settings must be configured before `/admin` can be used.
- `jv_vehicles` and `jv_settings/business_info` are publicly readable so the public website can show current data. Writes require the admin allow-list document.
- Admin allow-list records are created and managed in Firebase Console, not through the website.
- Uploaded photos are converted to WebP and kept under 450 KB as data URLs, leaving room for the other vehicle fields under Firestore's 1 MiB document limit.
- Keep `.env.local` out of version control. The repository ignores `.env` files.
- Export a JSON backup from the admin panel before bulk imports or resets.
