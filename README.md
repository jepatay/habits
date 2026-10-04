# Habits

A private, multi-user habit tracker with streaks, a reward system, and PWA push/email reminders. Built with
React + Vite and Firebase (Auth + Firestore + Cloud Functions).

## Features

- **Invite-only access** - no public sign-up; the admin creates accounts from an in-app screen
- **Two roles** - `admin` (manages habits, rewards, users; can view everyone's progress) and `member` (checks
  off their own habits)
- **Yes/No and Measurable habits**, including "negative" habits (things to avoid)
- **Daily grid** (habit rows x date columns), per-habit detail view with score/streak charts, calendar heatmap
  and weekday breakdown
- **Reward engine** - admin defines conditions (e.g. "300 reps within 365 days", "every time she mows"),
  progress is computed live. The Rewards page has two tabs: **Rewards** (what's set up, with progress toward the
  next time it's met) and **Notifications** (one line per time an objective was met, each *to fulfill* or
  *fulfilled*; admins also get a push for each new one). A newly unlocked milestone also shows an in-app banner
- **PWA** - installable, with Web Push (Firebase Cloud Messaging) reminders and a scheduled Cloud Function email
  fallback for browsers without push support
- **Offline viewing** - Firestore's persistent local cache lets you review history with no connection (no
  offline writes)
- **Import/export** - JSON backup export for any user; admin-only import screen with a field-mapping step for
  loading historical entries from a previous app

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite |
| Auth | Firebase Authentication |
| Database | Firebase Firestore |
| Reminders | Firebase Cloud Messaging (Web Push) + scheduled Cloud Function (email fallback) |
| Charts | Recharts |
| Hosting | Render (static site) |

## Setup

### 1. Install

```bash
npm install
```

### 2. Firebase project

1. Create a Firebase project at console.firebase.google.com (Blaze/paid plan, required for Cloud Functions)
2. Enable **Authentication** with the Email/Password sign-in method
3. Enable **Firestore Database**
4. Under Project Settings > Cloud Messaging, generate a **Web Push certificate** (VAPID key)
5. Copy your Firebase web config keys

### 3. Environment variables

```bash
cp .env.example .env
```

Fill in the `VITE_FIREBASE_*` keys from your Firebase project, plus `VITE_FIREBASE_VAPID_KEY` from step 2.4.
`VITE_OPENAI_API_KEY` is optional and only used by the (not-yet-built) AI summary stretch goal - see below.

### 4. Deploy Firestore rules and indexes

```bash
npm install -g firebase-tools   # if you don't have it
firebase login
firebase use --add              # pick your project, alias "default"
firebase deploy --only firestore:rules,firestore:indexes
```

`firestore.rules` enforces: users read/write only their own `entries`; `habits` and `rewards` are readable by
their owner and any admin, but writable by admins only; a user can update their own profile doc but never their
own `role`.

### 5. Create the first admin account

There's no public sign-up, and the in-app "Add user" screen requires an existing admin. Bootstrap the first one
manually:

1. In the Firebase Console > Authentication, add a user by email/password
2. In Firestore, create `users/{that user's uid}` with:
   ```json
   { "name": "Your Name", "email": "you@example.com", "role": "admin", "colorTheme": "#22c55e" }
   ```
3. Sign in - you can now use Settings > Admin to create every other account

### 6. Run locally

```bash
npm run dev
```

### 7. Cloud Functions (reminders)

```bash
cd functions && npm install && cd ..
firebase deploy --only functions
```

`functions/index.js` runs hourly, matching each habit's `reminder.time` (UTC hour) against habits without a
logged entry for today. If the owner has a registered push token it sends a Web Push notification; otherwise it
writes a document to the `mail` collection, following the schema of the official
[**Trigger Email** Firebase Extension](https://extensions.dev/extensions/firebase/firestore-send-email) - install
that extension (with your SMTP/SendGrid provider) for the email fallback to actually deliver.

## Render deployment

1. Push to GitHub
2. In Render, create a **Static Site** pointed at this repo (or use the included `render.yaml`):
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
3. Add all `VITE_*` environment variables in Render's Environment settings
4. `render.yaml` also configures the SPA fallback rewrite so client-side routing works on refresh

## Architecture

```
src/
  firebase/
    config.js         Firebase init (Auth, Firestore w/ persistent offline cache)
    firestore.js       All Firestore CRUD/subscriptions
    messaging.js        Web Push token + foreground/background message plumbing
    adminAuth.js         Isolated secondary-app user creation (doesn't sign the admin out)
  contexts/
    AuthContext.jsx      Signed-in user + role
    ViewedUserContext.jsx Which user's data is on screen (admin can switch; members see only themselves)
  utils/
    dates.js             YYYY-MM-DD date-key helpers (no Timestamps, no timezone drift)
    streaks.js           Current/best streak computed live from entries
    habitStats.js         Score/quarterly/weekday/calendar aggregates for the detail view
    rewards.js            Reward condition -> live progress -> derived status
    exportImport.js        JSON export + generic/native import parsing
  hooks/
    useUnlockedRewards.js  Live reward progress for one user (shared by the banner and Rewards page)
  push/
    usePushSubscription.js       Enable/disable Web Push for this device
    useForegroundPushListener.js Shows a Notification for pushes that arrive while the tab is focused
  components/
    layout/               Shell: top bar (+ admin user switcher), bottom nav, route guard
    habits/                Daily grid, habit form, per-habit detail charts
    rewards/                Reward card/form, unlocked-reward banner
    admin/                  Add-user form
  pages/                  One component per route

functions/
  index.js              Scheduled hourly reminder function (push + email fallback)
```

## Known limitations / future work

- Reminder times are matched against **UTC hour**, not the user's local timezone - fine for a single-timezone
  household, worth revisiting if that changes.
- Reward status (`locked`/`in_progress`/`unlocked`) is computed live on read rather than stored, since
  `rewards` writes are admin-only; only `fulfilled` is persisted (set manually by the admin). This keeps the
  progress always accurate without needing a server-side trigger, at the cost of recomputing it per view.
- **AI-generated progress summaries** (OpenAI API) are a stretch goal, not built - `VITE_OPENAI_API_KEY` is
  reserved for it but unused today.
