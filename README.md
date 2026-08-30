# superkalan-crm-mobile

Customer and Delivery Rider mobile app for the **Superkalan Gaz CRM** — Expo + React Native +
TypeScript. SA/FA/BO/BM continue to use the web dashboard. Customer and invitation-provisioned
Delivery Rider experiences are role-gated by protected server-issued claims.

Scope (the 5 confirmed modules, mobile slices):

- **CIM** — profile, saved addresses, purchase history.
- **SRD** — place orders (`order_source: 'Mobile App'`), track delivery **status milestones
  only** (never live GPS coordinates).
- **LPM** — view loyalty points / rewards.
- **CSAT** — post-delivery star rating + complaint submission.
- **Delivery Rider / SRD / Fleet** — accept a Branch Owner's identity-bound branch invitation
  through web or mobile onboarding, then use mobile to manage availability, accept or decline
  assigned service-request offers, and update delivery milestones. SinoTrack ST-901 through
  Traccar remains the authoritative live GPS source.

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
    ├── screens/            # role-gated Customer and Delivery Rider screens
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

## Google SMTP for email verification codes

Supabase Auth owns signup-code generation and verification. Google SMTP is
configured in Supabase rather than in this mobile app, so the Google password is
never bundled into the Expo build.

1. Turn on 2-Step Verification for the Google or Google Workspace sender account,
   then create an App Password for Supabase.
2. In the Supabase dashboard, open **Authentication → SMTP Settings**, enable
   custom SMTP, and enter:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - Username: the complete Google email address
   - Password: the 16-character Google App Password (not the normal account password)
   - Sender email: the same Google email address
   - Sender name: `Superkalan Gaz`
3. Keep email confirmation enabled. Under **Authentication → Email Templates → Confirm signup**,
   make the template display the OTP with `{{ .Token }}`. For example:

   ```html
   <h2>Verify your Superkalan Gaz account</h2>
   <p>Your verification code is:</p>
   <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px;">{{ .Token }}</p>
   <p>If you did not create this account, you can ignore this email.</p>
   ```
4. Under **Authentication → Sign In / Providers → Email**, set **Email OTP length** to
   `6`. This must match the mobile app's six-box OTP input. The equivalent Management API
   setting is `mailer_otp_length: 6`.

5. Under **Authentication → Email Templates → Reset password**, make the shared recovery
   template code-only. Both mobile and web verify this value with Supabase's `recovery`
   OTP type. Do not include `{{ .ConfirmationURL }}` in this template:

   ```html
   <h2>Reset your Superkalan Gaz password</h2>
   <p>Your password reset code is:</p>
   <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px;">{{ .Token }}</p>
   <p>If you did not request a password reset, you can ignore this email.</p>
   ```

6. Under **Authentication → Email Templates → Invite user**, keep invitations link-only.
   Invitation acceptance proves the invited identity and must use the single-use URL:

   ```html
   <h2>You have been invited to Superkalan Gaz</h2>
   <p><a href="{{ .ConfirmationURL }}">Accept invitation</a></p>
   <p>If you were not expecting this invitation, you can ignore this email.</p>
   ```

The resulting delivery rule is: signup verification and password recovery use codes;
Franchise Administrator and Delivery Rider invitations use single-use links.

For Delivery Rider onboarding, also enable a supported Supabase Phone provider. In local
custom-scheme development, allow `superkalan://delivery-rider-invitation**`. For laptop or
production web onboarding, allow the configured HTTPS/LAN
`/delivery-rider-invitation**` route. The API sends the SMS OTP only after the recipient
opens the verified email invitation and creates their private password in either client.

The mobile sign-up flow calls `signUp` before opening the OTP screen, verifies
the entered code with `verifyOtp`, and supports requesting a fresh code. No SMTP
credential belongs in `.env`, `.env.example`, or client-side TypeScript.

## Delivery Rider journey

See [`docs/driver-registration-user-journey.md`](docs/driver-registration-user-journey.md)
for the invitation registration, Branch Owner authorization, Fleet-roster, vehicle-assignment, and order
acceptance flow.

## Conventions

- Customer and Delivery Rider navigation must be separated by protected server-issued role claims;
  there are no SA/FA/BO/BM screens in this app.
- Customers receive milestones only. Delivery Rider workflow actions do not make the phone the GPS
  tracker and do not expose Traccar credentials; live vehicle positions continue to come
  from SinoTrack ST-901 hardware through the NestJS API.
- `src/lib/phMobile.ts` is a byte-for-byte copy of the web util; keep them in sync (AGENTS.md
  drift note). The API DTOs remain the real validation boundary.
- Talk to the API only; branch scoping is enforced server-side.
