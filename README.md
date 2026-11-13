# Selah — Illuminated Bible Reading Ledger

A local-first Bible reading tracker for recording daily Scripture readings, visualizing progress across all **66 books (1,189 chapters)**, maintaining reading rhythms, collecting **28 illuminated achievement seals**, and optionally syncing your ledger across devices with Firebase.

## Features

- **Sanctuary Dashboard**: Typographic canonical ledger metrics for Whole Bible, Old Testament (`929` ch), and New Testament (`260` ch), paired with a proportional **66-book Canonical Spine Bar**, one-click **Quick Log**, a 52-week **Reading Rhythm Heatmap** (with tap/hover daily inspection and monthly table), and an active **Sanctuary Lamp** streak tracker (with optional 1 rest day per week grace).
- **Scripture Library & 1,189-Chapter Mosaic**: Filter all 66 books by Testament, division, or completion status; switch between Bookshelf cards and the whole-Bible Mosaic; open any book sheet to toggle individual chapters, select spans with touch-friendly **Range** tap mode or desktop `Shift+Click`, increment re-read cycles (`+1 Re-read`), and attach reflection notes.
- **Hall of Seals (Achievements)**: **28** curated achievements across Bronze, Silver, Gold, and Luminous tiers (including secret seals) with custom SVG medallions, celebration toasts, and an interactive seal detail modal.
- **Journal & Guided Reading Plans**: Searchable chronological reading log with inline reflection/chapter editing and deletion, plus 4 progress-synced plans:
  - *Gospels & Acts Journey* (45 days)
  - *Psalms & Proverbs Month* (31 days)
  - *New Testament in 90 Days* (90 days)
  - *Canonical Bible in 1 Year* (365 days)
- **Mobile-Friendly & Touch-First Layout**: Responsive 4-tab bottom navigation dock below `1024px`, slide-up bottom-sheet modals below `640px`, stacked two-row OT/NT canonical spine bars on small screens, horizontally scrollable filter chip rails, and safe-area inset support.
- **Adaptive Themes & Backup**: **Dawn Parchment** (light) and **Vesper Candlelight** (dark) themes, IndexedDB local-first storage via `Dexie`, timezone-safe `Temporal.PlainDate` date math, and JSON backup export/import.
- **Optional Cloud Account & Sync**: Sign in with Email/Password or Google via Firebase Auth to sync readings, preferences, and theme settings to Cloud Firestore, with local-vs-cloud reconciliation (`Merge into my account` or `Keep cloud only`) when signing in on a device with existing local logs. Runs fully offline/locally when Firebase credentials are not configured.

## Getting Started

```bash
npm install
npm run dev
```

### Optional: Firebase Auth & Firestore Sync

The app works immediately with local browser storage. To enable account sign-in and cloud sync:

1. Copy `.env.example` to `.env.local` and fill in your Firebase web app configuration:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
2. Enable **Email/Password** and **Google** sign-in in Firebase Authentication.
3. Deploy the included `firestore.rules` and `firestore.indexes.json` using the Firebase CLI.

## Web Hosting (GitHub Pages)

Pushing to `main` runs `.github/workflows/deploy-pages.yml`, builds the Vite bundle with the Pages base path (`VITE_BASE_PATH`) and `VITE_FIREBASE_*` repository secrets, and deploys the static site to **GitHub Pages** (`https://inchbrayock.github.io/Selah/`).

- If using Firebase Authentication (Google / Email sign-in) on the hosted site, ensure `inchbrayock.github.io` is added under **Firebase Console → Authentication → Settings → Authorized domains**.

## Mobile App (Android APK & iPhone Safari PWA)

Selah wraps the compiled Vite app (`dist/`) as a native Android APK via Capacitor using bundle ID `com.selah.bible`, while iPhone uses the free Safari "Add to Home Screen" web app (no Mac or Apple Developer account required).

### Android (GitHub Actions APK or Local Android Studio)

1. **Cloud APK builds & automatic in-app updates:** Pushing a `v*` tag runs `.github/workflows/android-apk.yml` on `ubuntu-latest`, attaches the signed `.apk` and `update.json` directly to the GitHub Release, and installed Android builds automatically check, download, verify, and prompt to install newer releases (configurable in **Sanctuary Settings → App updates**).
   - Without keystore secrets, manual workflow runs fall back to a debug-signed `.apk`.
   - For a signed release `.apk` with Google Sign-In, add these repository secrets:
     - Firebase web build env vars (`VITE_FIREBASE_*`) and `GOOGLE_SERVICES_JSON_BASE64` (base64 of `android/app/google-services.json`, refreshed after registering your keystore SHA-1)
     - Release keystore: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`
2. **Local Android Studio builds:**
   - Ensure `android/app/google-services.json` (gitignored) is present and register your debug/release keystore SHA-1 in Firebase if using Google Sign-In.
   - Optionally copy a gitignored `android/keystore.properties` (`storeFile`, `storePassword`, `keyAlias`, `keyPassword`) for local signed release builds, then run:
     ```bash
     npm run cap:sync
     npm run cap:android
     ```

### iOS (Safari "Add to Home Screen" — Free, No Apple Developer Account Required)

- On iPhone, open the deployed web app in **Safari** and tap **Share > Add to Home Screen**.
- `index.html` includes `apple-touch-icon.png`, `apple-mobile-web-app-capable`, dynamic `theme-color` matching Dawn/Vesper, `public/manifest.webmanifest`, and a web-only offline service worker (`public/sw.js`, skipped inside Capacitor native builds).

## Scripts

- `npm run dev` — Start the Vite development server
- `npm run build` — Type-check with TypeScript (`tsc -b`) and build production assets
- `npm run preview` — Preview the production bundle locally
- `npm test` — Run the Vitest unit and component test suite
- `npm run cap:sync` — Build web assets and sync the Android Capacitor project
- `npm run cap:android` — Open the Android project in Android Studio
- `npm run cap:assets` — Regenerate native Android app icons and splash screens from `assets/`

## Tech Stack

- **UI**: React 19, TypeScript, Tailwind CSS v4, Motion, Lucide React
- **Mobile**: Capacitor 8 (`@capacitor/app`, `@capacitor/filesystem`, `@capacitor/haptics`, `@capacitor/share`, `@capacitor/splash-screen`, `@capacitor/status-bar`, `@capacitor-firebase/authentication`), `@fontsource-variable/newsreader`, `@fontsource/ibm-plex-sans`
- **Data & Sync**: Dexie (IndexedDB), Firebase Auth & Cloud Firestore, `temporal-polyfill`
- **Build & Test**: Vite 7, Vitest, Testing Library, jsdom
