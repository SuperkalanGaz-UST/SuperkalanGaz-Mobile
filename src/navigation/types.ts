import type { AccountType } from '@/contexts/AuthContext';
import type { NavigatorScreenParams } from '@react-navigation/native';

/**
 * Route contracts shared by native navigation and browser linking. The session
 * gate registers only the experience authorized by protected Auth claims.
 */

export type { AccountType };

// ── Auth flow ────────────────────────────────────────────────────────────────
export type AuthScreen =
  | 'login'
  | 'signup'
  | 'signup-otp'
  | 'forgot'
  | 'forgot-check'
  | 'set-password'
  | 'success';

export interface SignupDraft {
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  address: string;
  password: string;
  accountType: AccountType;
}

// ── Main app ─────────────────────────────────────────────────────────────────
export type MainScreen = 'home' | 'rewards' | 'orders' | 'more' | 'profile' | 'order-process' | 'faqs';
export type MainTab = 'home' | 'rewards' | 'orders' | 'more';
export type ProfileSection = 'personal' | 'preferences';

export interface MainNavigateOptions {
  orderId?: string;
  tab?: MainTab;
  showGuide?: boolean;
  profileSection?: ProfileSection;
  rewardsSection?: 'my' | 'all';
}

export type CustomerStack = { [Screen in MainScreen]: MainNavigateOptions | undefined };
export type PublicAuthScreen = 'login' | 'signup' | 'forgot';
export type AuthStack = { [Screen in PublicAuthScreen]: undefined };
export type DeliveryRiderStack = {
  home: undefined;
  delivery: undefined;
  profile: undefined;
  proof: undefined;
  complete: undefined;
};
export type RootStack = {
  Auth: NavigatorScreenParams<AuthStack>;
  Customer: NavigatorScreenParams<CustomerStack>;
  DeliveryRider: NavigatorScreenParams<DeliveryRiderStack>;
  VerifyMobile: undefined;
  Unavailable: undefined;
  NotFound: undefined;
};

/** Bottom-nav config shared by every signed-in surface. */
export interface MainNavProps {
  active: MainTab;
  onNavigate: (screen: MainScreen, opts?: MainNavigateOptions) => void;
}
