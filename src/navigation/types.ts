import type { AccountType } from '@/contexts/AuthContext';

/**
 * Navigation contracts for the two customer state machines. The signed-out flow
 * (`AuthFlow`) and the signed-in app (`MainApp`) each drive their own screen enum
 * via a lightweight reducer, mirroring the Figma Make prototype's navigation.
 * The real session gate (RootNavigator) decides which machine is mounted.
 */

export type { AccountType };

// ── Auth flow ────────────────────────────────────────────────────────────────
export type AuthScreen =
  | 'login'
  | 'forgot'
  | 'forgot-check'
  | 'set-password'
  | 'success';

// ── Main app ─────────────────────────────────────────────────────────────────
export type MainScreen = 'home' | 'orders' | 'more' | 'profile' | 'order-process' | 'faqs';
export type MainTab = 'home' | 'rewards' | 'orders' | 'more';
export type ProfileSection = 'personal' | 'preferences';

export interface MainNavigateOptions {
  tab?: MainTab;
  showGuide?: boolean;
  profileSection?: ProfileSection;
}

/** Bottom-nav config shared by every signed-in surface. */
export interface MainNavProps {
  active: MainTab;
  onNavigate: (screen: MainScreen, opts?: MainNavigateOptions) => void;
}
