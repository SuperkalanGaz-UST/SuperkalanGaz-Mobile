# superkalan-crm-mobile

Customer-only mobile app for the **Superkalan Gaz CRM** — Expo + React Native + TypeScript.
Staff (FA/BO/BM) use the web dashboard; this app is **customers only** (AGENTS.md §2, §7).

Scope (the 5 confirmed modules, customer slice):

- **CIM** — profile, saved addresses, purchase history.
- **SRD** — place orders (`order_source: 'Mobile App'`), track delivery **status milestones
  only** (never live GPS coordinates).
- **LPM** — view loyalty points / rewards.
- **CSAT** — post-delivery star rating + complaint submission.

All data access goes through the NestJS API (`superkalan-crm-api`) with a branch-scoped JWT.
Supabase is used for **auth only** — never the data SDK (AGENTS.md §4).

## Folder structure

```
superkalan-crm-mobile/
├── App.tsx                 # Root: AuthProvider + RootNavigator
├── index.ts                # registerRootComponent(App)
├── app.json                # Expo config
├── package.json            # scripts + deps (install via `npx expo install`)
├── tsconfig.json           # strict; `@/*` -> `src/*`
├── babel.config.js         # babel-preset-expo + `@` path alias
├── .env.example            # EXPO_PUBLIC_API_URL, Supabase auth keys
├── assets/                 # images/, fonts/
└── src/
    ├── components/         # shared presentational components
    │   └── ui/             #   primitives (Button, Card, Field, …)
    ├── contexts/           # AuthContext (session)
    ├── hooks/              # reusable hooks
    ├── navigation/         # RootNavigator + stacks/tabs
    ├── screens/            # feature screens (customer-only)
    │   ├── auth/           #   sign in / register
    │   ├── home/           #   dashboard / reorder
    │   ├── orders/         #   place order · track milestones
    │   ├── loyalty/        #   points / rewards
    │   ├── profile/        #   profile · addresses · history
    │   └── feedback/       #   CSAT rating · complaint
    ├── lib/                # api client (same backend as web), supabase, phMobile
    │   ├── api.ts          #   apiFetch + apiErrorMessage → superkalan-crm-api
    │   ├── supabase.ts     #   auth only (never data)
    │   └── phMobile.ts     #   PH mobile normalization (copy of web util)
    ├── theme/              # colors (aligned to web brand)
    ├── types/              # shared TS types / API models
    └── constants/          # config (API_URL, …)
```

## Bootstrap

Dependencies are intentionally not pinned yet — install them with Expo so versions match the
installed SDK:

```bash
cd superkalan-crm-mobile
npx create-expo-app@latest .        # only if you want Expo to generate its own baseline
# — or install directly into this structure —
npx expo install expo react react-native expo-status-bar expo-constants
npx expo install @react-navigation/native @react-navigation/native-stack \
  @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage
npm install -D typescript @types/react babel-plugin-module-resolver eslint

cp .env.example .env                # then fill in API + Supabase values
npx expo start
```

## Conventions

- Customer-only: **no staff/admin screens**, and **no map with live coordinates** — milestones
  only (AGENTS.md §7, mobile section).
- `src/lib/phMobile.ts` is a byte-for-byte copy of the web util; keep them in sync (AGENTS.md
  drift note). The API DTOs remain the real validation boundary.
- Talk to the API only; branch scoping is enforced server-side.
