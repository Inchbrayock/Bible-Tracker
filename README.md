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
2. Enable **Email/Password**, **Google**, and (for iOS App Store compliance) **Apple** sign-in in Firebase Authentication.
3. Deploy the included `firestore.rules` and `firestore.indexes.json` using the Firebase CLI.

## Mobile Apps (Android & iOS with Capacitor)

Selah wraps the compiled Vite app (`dist/`) for iOS and Android via Capacitor using bundle ID `com.selah.bible`.

### Android (Local Windows / macOS / Linux Build)

1. In Firebase Console, add an **Android app** with package name `com.selah.bible`.
2. Add your debug and release signing SHA-1 / SHA-256 fingerprints in Firebase Project Settings so native Google Sign-In works.
3. Download `google-services.json` into `android/app/google-services.json` (gitignored).
4. Build and open in Android Studio:
   ```bash
   npm run cap:sync
   npm run cap:android
   ```

### iOS (macOS Xcode or GitHub Actions)

1. In Firebase Console, add an **iOS app** with bundle ID `com.selah.bible`, and enable the **Apple** sign-in provider in Firebase Authentication.
2. In Apple Developer Portal, enable the **Sign in with Apple** capability for App ID `com.selah.bible` (matches `ios/App/App/App.entitlements`).
3. Download `GoogleService-Info.plist` and add its `REVERSED_CLIENT_ID` URL scheme to `ios/App/App/Info.plist` if opening locally in Xcode (`npm run cap:ios`).
4. **Building iOS from Windows via GitHub Actions:** Run or tag (`v*`) `.github/workflows/ios-release.yml` on `macos-latest`.
   - Without signing secrets, it runs `npx cap sync ios` and an unsigned iOS Simulator build check.
   - To export a signed `.ipa` (and optionally upload to TestFlight), add these repository secrets:
     - Firebase web build env vars (`VITE_FIREBASE_*`) and `GOOGLE_SERVICE_INFO_PLIST_BASE64`
     - Apple signing: `APPLE_TEAM_ID`, `IOS_CERTIFICATE_BASE64`, `IOS_CERTIFICATE_PASSWORD`, `IOS_PROVISIONING_PROFILE_BASE64`
     - Optional TestFlight upload: `APPLE_API_KEY_ID`, `APPLE_API_ISSUER_ID`, `APPLE_API_KEY_P8_BASE64`

   > **Note for Windows:** `capacitor.config.ts` uses SwiftPM symlinks for `@capacitor-firebase/authentication`. If `npx cap sync ios` reports an `EPERM` symlink error without Windows Developer Mode, Android syncing still completes cleanly and the macOS CI runner resolves iOS Swift packages cleanly.

## Scripts

- `npm run dev` — Start the Vite development server
- `npm run build` — Type-check with TypeScript (`tsc -b`) and build production assets
- `npm run preview` — Preview the production bundle locally
- `npm test` — Run the Vitest unit and component test suite
- `npm run cap:sync` — Build web assets and sync native Android/iOS Capacitor projects
- `npm run cap:android` — Open the Android project in Android Studio
- `npm run cap:ios` — Open the iOS project in Xcode (macOS)
- `npm run cap:assets` — Regenerate native app icons and splash screens from `assets/`

## Tech Stack

- **UI**: React 19, TypeScript, Tailwind CSS v4, Motion, Lucide React
- **Mobile**: Capacitor 8 (`@capacitor/app`, `@capacitor/filesystem`, `@capacitor/haptics`, `@capacitor/share`, `@capacitor/splash-screen`, `@capacitor/status-bar`, `@capacitor-firebase/authentication`), `@fontsource-variable/newsreader`, `@fontsource/ibm-plex-sans`
- **Data & Sync**: Dexie (IndexedDB), Firebase Auth & Cloud Firestore, `temporal-polyfill`
- **Build & Test**: Vite 7, Vitest, Testing Library, jsdom
