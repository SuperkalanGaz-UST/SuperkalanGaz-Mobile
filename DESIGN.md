# DESIGN.md — Superkalan Gaz Mobile (Customer and Delivery Rider App)

> UI/UX format for the role-gated Customer and Delivery Rider Expo/React Native app
> (`SuperkalanGaz-Mobile`). The existing reference screens are Customer-facing; Delivery Rider
> screens must reuse the same tokens and primitives while using a separate Delivery Rider
> navigation tree.
> The screens were ported from the original
> [Figma Make prototype](https://www.figma.com/design/AtT82H0L2pN7gKwY11PHBS/Superkalan-Gaz-Mobile-App--Copy-).
> The generated web-React bundle was removed after the native port because it was never
> shipped. The
> **shared primitives in `src/components/ui/` are the reference implementation**; new screens
> should compose them. This file governs how screens *look and are assembled*;
> behavior/permissions come from Jira + the API.
>
> Sibling doc: [`superkalan-crm-web/DESIGN.md`](../superkalan-crm-web/DESIGN.md). The two
> clients deliberately share one brand — same primary blue (`#007BC1`) and, where the web
> uses a neutral system font, the mobile app uses **Poppins** per Figma. Keep tokens in
> sync so the CRM and the customer app read as one product.

Reference implementation: `src/components/ui/` (shared primitives) + `src/screens/home/HomeScreen.tsx`.
Design source of truth: the linked Figma design and the tokens in `src/theme/colors.ts`.

---

## 1. Design Principles

- **One app across account types.** Household and Commercial are the two customer
  personas. They share the same shell — `AppHeader`, `BottomNav`, `SideMenu`
  (`src/components/ui/`) — and differ only in *data*, never in styling. The account type is
  chosen on the login tab and persisted in `AuthContext`; new surfaces must work identically
  for both.
- **Role-separated journeys.** Customer and Delivery Rider are authorization roles, not account-type
  styling variants. After authentication, route from protected server-issued claims to
  either Customer or Delivery Rider navigation. An invited but unactivated Rider sees only
  invitation/verification status and sign-out; they must never reach operational screens.
- **Token-first, never ad-hoc.** Every color comes from `@/theme/colors`, every font from
  `@/theme/fonts`. Do not inline raw hex or font strings in a screen — if a value is
  missing, add a token (§2/§3) rather than hardcoding it.
- **Figma-accurate.** Values in the styles trace to the linked Figma design and the
  provenance comments in `colors.ts`. When a design changes, update the token/comment, not
  just the screen.
- **Real session data only.** Greeting name, account type, points, and orders should render
  from the signed-in Supabase user / API — never hardcoded personas. The ported screens
  currently show the Figma mock (e.g. "Juan", 163 points) marked `SCAFFOLD` in code; wire
  them to `src/lib/api.ts` (CIM/SRD/LPM) when the endpoints land. Login/Sign-up/Logout are
  already wired to `AuthContext`.
- **Safe-area aware.** Every full-screen surface uses `useSafeAreaInsets()` for top and
  bottom padding (headers add `insets.top`; scroll content and the tab bar add
  `insets.bottom`). Never hardcode status-bar/home-indicator offsets.

---

## 2. Color Tokens (`src/theme/colors.ts`)

Import as `import { colors } from '@/theme/colors'`. Grouped by role:

**Brand / semantic**

| Token | Hex | Use |
| --- | --- | --- |
| `primary` | `#007BC1` | Primary actions, headers, active tab, section titles, FAB — **matches web brand blue** |
| `primaryDark` | `#006399` | Pressed/darker primary |
| `primaryTint` | `#E6F1FB` | Tinted primary fills |
| `success` | `#1D9E75` | Positive/confirmation |
| `danger` | `#CC1903` | Destructive/alerts (**matches web brand red**) |
| `warning` | `#C07A12` | Caution |

**Neutrals / surfaces**

| Token | Hex | Use |
| --- | --- | --- |
| `text` | `#1A1A18` | Primary text |
| `textMuted` | `#6B6B67` | Secondary text |
| `border` | `#E4E4E0` | Hairline borders |
| `surface` | `#FFFFFF` | Cards |
| `surfaceMuted` | `#F7F7F6` | Recessed fills |
| `background` | `#F5F6F8` | App canvas |

**Contextual groups** (scoped to a surface — see `colors.ts` for the full set):
- **Login** (`loginBackground`, `heading` `#044674`, `label` `#002540`, `placeholder`,
  `inputBorder`).
- **Home / loyalty** (`helloAccent` `#81D1FF`, `pointsTop`→`pointsBottom` gradient,
  `homeSheet`, `claimBtn`, `detailsBtn`, `activeFooter`, `activeCardBorder`,
  `navInactive` `#9DB2CE`).

Rules:
- **`#007BC1` and `#CC1903` are shared with the web CRM** — if either moves, change both
  repos together.
- A new one-off color belongs in `colors.ts` with a `// Figma:` provenance comment, not
  inlined in a screen. `ColorToken` (exported) keeps usage type-safe.

---

## 3. Typography (`src/theme/fonts.ts`)

**Poppins** is the brand typeface. `fontMap` is loaded once at the app root via
`useFonts(fontMap)` in `App.tsx` (the app renders nothing until fonts resolve). Reference
weights as `fontFamily: fonts.<weight>`:

| Token | Family | Weight |
| --- | --- | --- |
| `fonts.light` | `Poppins_300Light` | 300 |
| `fonts.regular` | `Poppins_400Regular` | 400 |
| `fonts.medium` | `Poppins_500Medium` | 500 |
| `fonts.semibold` | `Poppins_600SemiBold` | 600 |
| `fonts.bold` | `Poppins_700Bold` | 700 |

**Type ramp actually in use** (size · weight → role):

| Size | Weight | Role |
| --- | --- | --- |
| 24 | bold | Screen greeting, login heading |
| 20 | semibold | Section titles (`primary`), order size/price |
| 16 | bold | Segmented-control labels |
| 14 | regular / semibold | Field labels, input text, primary button text |
| 13 | regular / semibold | Login subtitle, tab text |
| 12 | regular / medium | On-card buttons, sub-greeting, meta |
| 10–11 | light / regular / semibold | Footnotes, product descriptions, card footers |
| 7 | medium | Tiny inline meta (e.g. reorder date) |

Rule: never pass a bare weight/`fontWeight` — always a `fonts.*` family, so Poppins is
guaranteed and weights render consistently across iOS/Android.

---

## 4. Spacing & Layout

De-facto scale (multiples of ~4; standardize new work to these): **2 · 4 · 8 · 10 · 12 ·
16 · 20 · 24 · 26**.

- **Page horizontal inset:** 16–24 (auth `20–24`, signed-in header `24`, sheet body `16–24`).
- **Spacing scale:** `spacing` in `src/theme/metrics.ts` (`xs 4 · sm 8 · md 12 · lg 16 · xl
  20 · xxl 24`).
- **Section rhythm:** section title `marginTop: 20`, `marginBottom: 12`; inter-card gap `12`.
- **Blue header → white sheet:** the white sheet overlaps the header by `marginTop: -24` and
  rounds its top corners (radius `24`) — the signature signed-in silhouette (`AppHeader` →
  sheet, in every main screen).
- **Scroll padding:** `contentContainerStyle` adds `paddingBottom: 130` so content clears the
  floating `BottomNav`.

---

## 5. Radii & Elevation

**Corner radii** — `radii` in `src/theme/metrics.ts`: `chip 5` (on-card buttons) · `card 10`
(standard cards + inputs) · `button 8` (CTAs) · `sheet 20` (bottom sheets) · `header 24` (the
white sheet under the blue header) · `pill 999`. Auth card uses `20`, the floating nav bar
`28`, the FAB `28` (circle).

**Elevation** — `src/theme/metrics.ts` exports the two shared shadows:

```
cardShadow: shadowColor '#000', offset {0,4}, opacity 0.25, radius 4, elevation 4
navShadow:  softer, upward — powers the floating BottomNav + FAB
```

Reference `cardShadow` / `navShadow` from `@/theme/metrics` instead of inlining shadow
objects.

---

## 6. Iconography

- **Feather** from `@expo/vector-icons` is the primary icon set (chevrons, header actions,
  nav, form icons). **Ionicons** is used for filled stars + radio buttons. Sizes: `16` inline
  chevrons · `22` tab bar & section chevrons · `24` header actions.
- Tab icons tint **`primary` when active, `navInactive` (`#9DB2CE`) when inactive**.
- Product/cylinder art are PNGs in `assets/images`, registered in `src/lib/assets.ts` and
  resolved by size via `cylinderFor('11 KG')` (`resizeMode="contain"`, sizes `2.7/5/11/22/50
  KG`). Rewards, payment logos, promo and mascots are also keyed in `assets.ts`.

---

## 7. Component Patterns

Shared primitives now live in `src/components/ui/`. Reuse them; don't re-style equivalents.

- **Controls** (`controls.tsx`):
  - `PrimaryButton` — full-width, `height 52`, radius `10`, `primary` fill, `18/semibold`
    white; disabled → `muted` fill.
  - `DarkButton` — navy (`darkNavy`) pill, `height 56`, radius `20`, `14/medium` white;
    used across the auth flow (Verify / Confirm).
  - `TextField` — `height 38`, radius `10`, 1px `cardBorder`, focus border `primary`, error
    border `danger`; trailing eye toggle for `secure`. `bare` variant = pale-blue auth fill.
  - `PhoneField` — fixed non-editable `+63` prefix element per AGENTS.md §16 (never
    placeholder text); user types the 10-digit subscriber number.
  - `OtpInput` — six auto-advancing 1-char boxes used by password recovery and Delivery Rider activation.
- **Header + shell** — `AppHeader` (blue greeting bar, safe-area aware, help + menu actions)
  over a white sheet (`marginTop: -24`, radius `24`); `BottomNav` (floating bar with
  Home / Rewards / History / More destinations plus a raised center cylinder action labeled
  **Order**); `SideMenu` (right slide-out drawer).
- **Cards** — white, radius `10`, `cardShadow`. Points card = `LinearGradient`
  (`pointsTop`→`pointsBottom`) in `HomeScreen`. Active-order card: 1px `activeCardBorder` +
  tinted `activeFooter` strip. Reorder card: 172×101, 1px `primary`. Quick-order card: 2px
  `primary`, `minHeight 91`.
- **Overlays** (`overlays.tsx`) — `LogoutConfirmModal`, `PromoModal`, `Toast`; the app tour is
  `AppGuideOverlay` (`AppGuide.tsx`). Bottom sheets (redeem, feedback, reset-password, payment)
  are RN `Modal`s with a dimmed backdrop + rounded-top sheet.
- **Icons** — `@expo/vector-icons` **Feather** (chevrons, header actions, nav) + **Ionicons**
  (filled stars, radio buttons). Replaces the Figma inline SVGs / lucide.
- **Pressed state** — `Pressable`s use the style-function form with `pressed && …pressedDim`
  (`opacity: 0.85`). Keep this uniform; don't invent per-screen pressed treatments.

---

## 8. Navigation & Shell

- `App.tsx`: `useFonts(fontMap)` → `SafeAreaProvider` → `AuthProvider` → `RootNavigator`.
- **Session-gated state machines** (not React Navigation). `RootNavigator.tsx` reads the real
  Supabase session and mounts one of two lightweight `useState` screen-enum machines that
  mirror the Figma Make prototype's `onNavigate` reducer:
  - `AuthFlow.tsx` (signed out) → `login · forgot · forgot-check ·
    set-password · success`.
  - `MainApp.tsx` (signed in) → `home · orders · profile · order-process · faqs` (Home owns an
    internal `home | rewards` tab). A successful sign-in/up or sign-out flips the session and
    swaps the whole tree.
- **Header + sheet silhouette** is the layout contract for signed-in surfaces: `AppHeader`
  (blue greeting + help/menu) → white rounded sheet (`marginTop: -24`, radius `24`) → sections
  → `BottomNav`. New primary screens should adopt it.
- **Account type** (Household/Commercial) is chosen on the login tab and persisted in
  `AuthContext`; screens read it from the session rather than mounting different scaffolds.

---

## 9. Conventions & Rules

- **Path alias `@/` → `src/`** (`babel.config.js` + `tsconfig.json`, kept in sync). Import
  `@/theme/...`, `@/lib/...`, `@/components/ui/...` — not deep relative paths.
- **Prefer tokens over raw values** — colors from `@/theme/colors`, fonts from `@/theme/fonts`,
  spacing/radii/shadows from `@/theme/metrics`. Some one-off Figma hexes still appear inline in
  screens; promote them to `colors.ts` when touched.
- **Safe-area insets, not magic numbers**, for all edge padding (§1).
- **Mark unwired data `SCAFFOLD`** and point at `src/lib/api.ts`; never present invented
  figures as confirmed.
- **Keep shared brand tokens in lockstep with the web CRM** (`#007BC1`, `#CC1903`, Poppins).
- **`tsc` caveat:** the installed TS/RN combo emits environmental "View cannot be used as a
  JSX component" errors across `node_modules` + RN core. Metro/Babel strip types, so the app
  bundles/runs fine (`npx expo export`). Filter real errors with `grep -vE 'TS2786|TS2607'`.

**Recommended next steps:**
1. Wire `SCAFFOLD` data to the API (CIM profile, SRD orders/tracking, LPM points/redemption).
   The order flow implies `order_source = Mobile App`; surface delivery **milestones only**.
2. Add a typed `Text`/`Heading` wrapper that binds `fonts.*` + the §3 ramp.
3. Finish tokenising the remaining inline hexes in the ported screens into `colors.ts`.

---

## 10. File Map

| File | Role |
| --- | --- |
| `App.tsx` | Font load + `SafeAreaProvider` + `AuthProvider` + `RootNavigator` |
| `src/theme/colors.ts` | Color tokens — brand + extended Figma palette (§2) |
| `src/theme/fonts.ts` | Poppins `fontMap` + `fonts` (§3) |
| `src/theme/metrics.ts` | `spacing` · `radii` · `cardShadow` · `navShadow` (§4–§5) |
| `src/navigation/types.ts` | Screen/tab enums shared by both machines |
| `src/navigation/RootNavigator.tsx` | Session gate → `AuthFlow` or `MainApp` (§8) |
| `src/navigation/AuthFlow.tsx` | Signed-out state machine (login/forgot) (§8) |
| `src/navigation/MainApp.tsx` | Signed-in state machine (home/orders/profile/order/faqs) (§8) |
| `src/components/ui/controls.tsx` | **Reference:** buttons, `TextField`, `PhoneField`, and `OtpInput` (§7) |
| `src/components/ui/AppHeader.tsx` · `BottomNav.tsx` · `SideMenu.tsx` | Shared shell (§7–§8) |
| `src/components/ui/overlays.tsx` · `AppGuide.tsx` | Confirm/promo/toast modals + app tour (§7) |
| `src/screens/auth/*` | `LoginScreen` (wired to `AuthContext`) and `ForgotFlow` |
| `src/screens/home/HomeScreen.tsx` · `RewardsScreen.tsx` | Home (points/reorder/quick-order) + Rewards surface |
| `src/screens/orders/OrdersScreen.tsx` | Orders list/details + post-delivery CSAT feedback |
| `src/screens/order/OrderProcessScreen.tsx` | Order flow: select → review → track (+ address/schedule/payment/confirm sheets) |
| `src/screens/profile/ProfileScreen.tsx` | Profile: details/preferences + reset-password sheet |
| `src/screens/faqs/FaqScreen.tsx` | Searchable FAQ accordion |
| `src/lib/assets.ts` | Image registry + `cylinderFor()` (§6) |
| `src/lib/api.ts` | API client (data wiring target) |
| `src/lib/phMobile.ts` | PH mobile normalization (AGENTS.md §16) |
| `src/contexts/AuthContext.tsx` | Supabase session + account type |
| `src/constants/config.ts` | `API_URL` runtime config |
