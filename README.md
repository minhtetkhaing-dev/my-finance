# Clarity Finance

One Expo/React Native TypeScript app for web, Android, and iOS, using Supabase Auth and Postgres. It implements the supplied dashboard, history, categories, login, profile, planning, and dark-mode designs.

## Implemented

- Email/password signup, login, password-reset email, logout, and Google OAuth
- Live dashboard totals, budget progress, history search/chart, and transaction creation
- Income/expense categories and custom category creation
- Category editing and deletion with selectable Ionicons, colors, and MMK budgets
- Expense and income entry with optional category and note; uncategorized transactions are supported
- Avatar upload to Supabase Storage with per-user write/delete policies and a 5 MB image limit
- Editable profile, monthly spending cap, yearly savings goal, and persistent dark mode
- Secure per-user RLS, ownership validation, indexes, and signup starter categories

New accounts show zero balances and empty lists until real data is saved in Supabase.

## 1. Prerequisites and install

Use Node.js 22 LTS (the current Node 20.19.3 is one patch below React Native's minimum). Install Expo Go on a phone. iOS simulator/local builds need macOS + Xcode; Android emulator/local builds need Android Studio. EAS cloud builds need neither.

```bash
npm install
```

## 2. Create the Supabase database

1. Open Supabase Dashboard → `my-finance` → SQL Editor.
2. Paste all of `supabase/migrations/20260703100000_initial_finance_schema.sql` and click **Run**.
3. Confirm `profiles`, `categories`, and `transactions` appear in Table Editor.

For an existing installation, also run `supabase/migrations/20260703144436_add_initial_capital.sql`. This adds required starting-capital onboarding without deleting existing data.
Run `supabase/migrations/20260703145419_add_avatar_storage.sql` to create the public avatar bucket and secure per-user upload policies.

The SQL explicitly grants Data API access to `authenticated`, blocks `anon`, enables RLS, and limits every row to its owner.

## 3. Environment and auth

`.env` is configured with the supplied project URL and publishable key. For a new checkout, copy `.env.example` to `.env`. Publishable client values are protected by RLS. Never add the database password, Google client secret, Supabase secret key, or service-role key to app code.

In Supabase Dashboard → Authentication → URL Configuration, add:

```text
clarityfinance://auth/callback
clarityfinance://auth/reset
http://localhost:8081/**
https://your-production-web-domain.com/**
```

Keep Google's authorized callback URI as `https://lzoddslttfppxtkdqxry.supabase.co/auth/v1/callback`.

For production native Google login, create separate Android and iOS OAuth clients. Android uses package `com.minhtetkhaing.clarityfinance` and the EAS signing SHA-1. iOS uses bundle ID `com.minhtetkhaing.clarityfinance`. Add web, Android, and iOS client IDs (web first, comma-separated) in Supabase's Google provider. The Google secret stays only in the Supabase dashboard.

## 4. Run the app

```bash
npm start
```

Press `w` (web), `a` (Android), or `i` (iOS), or run `npm run web`, `npm run android`, or `npm run ios`. On a phone, scan Expo's QR code while both devices use the same Wi-Fi. OAuth deep links are most reliable in a development build.

## 5. Android and iOS builds

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
```

Installable Android preview APK:

```bash
npx eas-cli@latest build --platform android --profile preview
```

Store builds (Apple builds require an Apple Developer account):

```bash
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
# or both
npx eas-cli@latest build --platform all --profile production
```

Let EAS manage signing credentials for the easiest first setup. Submit with `npx eas-cli@latest submit --platform android` or `--platform ios`.

## 6. Web production

```bash
npx expo export --platform web
```

Deploy `dist/` to a static host, then add that domain to Supabase redirect URLs and Google Authorized JavaScript origins.

## Checks and project map

```bash
npm run typecheck
npx expo-doctor
```

- `App.tsx`: fonts, theme/auth providers, session gate
- `src/screens`: all screens and data-entry flows
- `src/hooks/useFinanceData.ts`: Supabase reads
- `src/lib/supabase.ts`: persistent Supabase client
- `src/theme.ts`: Clarity light/dark tokens
- `supabase/migrations`: schema, grants, RLS, triggers

## Important security action

The database password and Google client secret were shared in the request. Treat both as exposed and rotate them in Supabase/Google Cloud before production. They are intentionally absent from this repository.
