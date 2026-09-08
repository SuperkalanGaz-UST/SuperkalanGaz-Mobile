import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { apiErrorMessage, apiFetch } from '@/lib/api';
import { normalizePhMobile } from '@/lib/phMobile';
import { supabase } from '@/lib/supabase';

/**
 * Owns the mobile auth session. Sign-in goes through Supabase Auth; the
 * resulting access token is attached to every API call by `src/lib/api.ts`.
 * The user's role/branch scope is derived server-side from that token — this
 * context never decides authorization.
 *
 * Password recovery uses Supabase Auth's recovery OTP. The temporary recovery
 * session is deliberately kept out of `session` so RootNavigator cannot expose
 * the signed-in customer app before the password has actually been changed.
 */

/**
 * Household = residential (points rewards), Commercial = business (30+1 exchange).
 * The protected Auth app_metadata claim is authoritative; local storage only
 * helps restore UI state while the session is loading.
 */
export type AccountType = 'household' | 'commercial';
export type MobileRole = 'customer' | 'driver' | 'unsupported' | null;

export interface ProfileUpdateInput {
  firstName: string;
  lastName: string;
  address: string;
  /** Empty removes the optional contact number; otherwise it is stored as E.164. */
  contactNumber: string;
}

/** AsyncStorage key for the persisted account type (survives app restarts). */
const ACCOUNT_TYPE_KEY = 'superkalan.accountType';
const PASSWORD_RECOVERY_KEY = 'superkalan.passwordRecovery';

function accountTypeFromSession(session: Session | null): AccountType | null {
  const value = session?.user.app_metadata.account_type;
  return value === 'household' || value === 'commercial' ? value : null;
}

function mobileRoleFromSession(session: Session | null): MobileRole {
  const role = session?.user.app_metadata.role;
  if (role === 'customer' || role === 'driver') return role;
  return typeof role === 'string' ? 'unsupported' : null;
}

function isActiveSession(session: Session): boolean {
  return String(session.user.app_metadata.status ?? '').toLowerCase() === 'active';
}

function isAcceptedDriverAwaitingMobileVerification(session: Session): boolean {
  const metadata = session.user.app_metadata;
  return (
    metadata.role === 'driver' &&
    metadata.status === 'Pending' &&
    typeof metadata.delivery_rider_invitation_accepted_at === 'string'
  );
}

/**
 * Customer authorization claims are written only by the NestJS service-role
 * boundary. Refreshing afterwards puts the new claim into the signed JWT used
 * by customer-only API endpoints.
 */
async function ensureCustomerSession(session: Session): Promise<{ session: Session; error: string | null }> {
  const metadata = session.user.app_metadata;
  if (
    metadata.role === 'customer' &&
    metadata.status === 'Active' &&
    (metadata.account_type === 'household' || metadata.account_type === 'commercial')
  ) {
    return { session, error: null };
  }

  try {
    const response = await apiFetch('/customer/bootstrap', { method: 'POST' });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      return { session, error: apiErrorMessage(data, 'Could not prepare this customer account.') };
    }

    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error || !refreshed.data.session) {
      return { session, error: refreshed.error?.message ?? 'Could not refresh the customer session.' };
    }
    return { session: refreshed.data.session, error: null };
  } catch {
    return { session, error: 'Could not reach the service to prepare this customer account.' };
  }
}

interface AuthContextValue {
  session: Session | null;
  /** Protected app_metadata role used only to choose the correct mobile shell. */
  sessionRole: MobileRole;
  /** Which customer experience to show. Null for Delivery Riders and signed-out users. */
  accountType: AccountType | null;
  /** True until the initial session has been restored from storage. */
  initializing: boolean;
  /** Unified customer/Delivery Rider sign-in; the server-owned role and track route the app. */
  signIn: (identifier: string, password: string) => Promise<{ error: string | null }>;
  /** Refresh protected Auth claims after app-based Delivery Rider mobile verification. */
  refreshSession: () => Promise<{ error: string | null }>;
  /** Send the non-enumerating recovery email managed by Supabase Auth. */
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  /** Exchange the emailed recovery OTP for a short-lived recovery session. */
  verifyPasswordResetOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  /** Change the password, then end the temporary recovery session locally. */
  completePasswordReset: (password: string) => Promise<{ error: string | null }>;
  /** Reload the signed-in customer's latest Auth profile metadata. */
  refreshProfile: () => Promise<{ error: string | null }>;
  updateProfile: (input: ProfileUpdateInput) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [initializing, setInitializing] = useState(true);
  const passwordRecoveryRef = useRef(false);

  useEffect(() => {
    // Restore any persisted session + account type, then keep them in sync.
    Promise.all([
      supabase.auth.getSession(),
      AsyncStorage.getItem(ACCOUNT_TYPE_KEY),
      AsyncStorage.getItem(PASSWORD_RECOVERY_KEY),
    ]).then(
      async ([{ data }, storedType, storedRecovery]) => {
        if (storedRecovery === 'true') {
          // The screen state itself is intentionally not persisted. If the app
          // was closed mid-reset, discard its recovery session and require a
          // fresh code instead of restoring it as a normal customer session.
          passwordRecoveryRef.current = true;
          if (data.session) await supabase.auth.signOut({ scope: 'local' });
          passwordRecoveryRef.current = false;
          await AsyncStorage.removeItem(PASSWORD_RECOVERY_KEY);
          setSession(null);
          setInitializing(false);
          return;
        }

        const restoredRole = mobileRoleFromSession(data.session);
        const restored = data.session && (restoredRole === 'customer' || restoredRole === null)
          ? await ensureCustomerSession(data.session)
          : null;
        const restoredSession = restored?.session ?? data.session;
        setSession(restoredSession);
        setAccountType(
          accountTypeFromSession(restoredSession) ??
            (storedType === 'household' || storedType === 'commercial' ? storedType : null),
        );
        setInitializing(false);
      },
    );
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') {
        passwordRecoveryRef.current = true;
        void AsyncStorage.setItem(PASSWORD_RECOVERY_KEY, 'true');
        setSession(null);
        return;
      }
      if (event === 'SIGNED_OUT') {
        passwordRecoveryRef.current = false;
        void AsyncStorage.removeItem(PASSWORD_RECOVERY_KEY);
        setSession(null);
        return;
      }
      if (passwordRecoveryRef.current) {
        setSession(null);
        return;
      }

      setSession(next);
      if (mobileRoleFromSession(next) === 'driver') setAccountType(null);
      const serverType = accountTypeFromSession(next);
      if (serverType) setAccountType(serverType);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    // The authenticated user's protected claims decide both role and customer
    // track. The login form never asks the user to choose either one.
    const runSignIn = async (
      credentials: { email: string; password: string } | { phone: string; password: string },
      chosenType: AccountType | null,
    ): Promise<{ error: string | null }> => {
      setAccountType(chosenType);
      if (!chosenType) await AsyncStorage.removeItem(ACCOUNT_TYPE_KEY);
      const { error } = await supabase.auth.signInWithPassword(credentials);
      if (error) return { error: error.message };

      const { data } = await supabase.auth.getSession();
      if (!data.session) return { error: 'No signed-in session was created' };

      const mobileRole = mobileRoleFromSession(data.session);
      if (mobileRole === 'driver') {
        if (chosenType) {
          await supabase.auth.signOut();
          setSession(null);
          setAccountType(null);
          return { error: 'Use Login as Delivery Rider for this account.' };
        }
        if (
          !isActiveSession(data.session) &&
          !isAcceptedDriverAwaitingMobileVerification(data.session)
        ) {
          await supabase.auth.signOut();
          setSession(null);
          setAccountType(null);
          return {
            error: 'Finish creating and accepting your Delivery Rider account from the invitation website first.',
          };
        }
        setSession(data.session);
        setAccountType(null);
        return { error: null };
      }

      if (mobileRole === 'unsupported') {
        await supabase.auth.signOut();
        setSession(null);
        setAccountType(null);
        return { error: 'This staff role is available on the web dashboard, not the mobile app.' };
      }

      const prepared = await ensureCustomerSession(data.session);
      if (prepared.error) {
        await supabase.auth.signOut();
        setSession(null);
        setAccountType(null);
        return { error: prepared.error };
      }
      const serverType = accountTypeFromSession(prepared.session);
      if (!serverType) {
        await supabase.auth.signOut();
        setSession(null);
        setAccountType(null);
        return { error: 'This customer account has no loyalty track.' };
      }
      // Normal sign-in relies entirely on the protected account-type claim.
      if (chosenType && serverType !== chosenType) {
        await supabase.auth.signOut();
        setSession(null);
        setAccountType(null);
        return {
          error: `This account uses the ${serverType === 'household' ? 'Household' : 'Commercial'} track.`,
        };
      }
      setSession(prepared.session);
      setAccountType(serverType);
      await AsyncStorage.setItem(ACCOUNT_TYPE_KEY, serverType);
      return { error: null };
    };

    return {
      session,
      sessionRole: mobileRoleFromSession(session),
      accountType,
      initializing,
      signIn: async (identifier, password) => {
        const value = identifier.trim();
        if (value.includes('@')) {
          return runSignIn({ email: value.toLowerCase(), password }, null);
        }

        const phone = normalizePhMobile(value);
        if (!phone) return { error: 'Enter a valid email or PH mobile number.' };
        return runSignIn({ phone, password }, null);
      },
      refreshSession: async () => {
        const { data, error } = await supabase.auth.refreshSession();
        if (error || !data.session) {
          return { error: error?.message ?? 'Could not refresh the Delivery Rider session.' };
        }
        setSession(data.session);
        return { error: null };
      },
      requestPasswordReset: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
        return {
          error: error ? 'Could not send the reset code. Please try again later.' : null,
        };
      },
      verifyPasswordResetOtp: async (email, token) => {
        // Mark recovery before verification because verifyOtp emits its auth
        // event before resolving, and that session must never enter MainApp.
        passwordRecoveryRef.current = true;
        await AsyncStorage.setItem(PASSWORD_RECOVERY_KEY, 'true');

        const { data, error } = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token,
          type: 'recovery',
        });
        if (error || !data.session) {
          passwordRecoveryRef.current = false;
          await AsyncStorage.removeItem(PASSWORD_RECOVERY_KEY);
          return {
            error: error?.message ?? 'This reset code is invalid or has expired.',
          };
        }

        setSession(null);
        return { error: null };
      },
      completePasswordReset: async (password) => {
        if (!passwordRecoveryRef.current) {
          return { error: 'Verify a valid reset code before changing your password.' };
        }

        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          return { error: error.message };
        }

        // Recovery proves identity only for this reset. Do not silently carry
        // that temporary session into the customer application.
        await supabase.auth.signOut({ scope: 'local' });
        passwordRecoveryRef.current = false;
        await AsyncStorage.removeItem(PASSWORD_RECOVERY_KEY);
        setSession(null);
        return { error: null };
      },
      refreshProfile: async () => {
        if (!session?.user) return { error: 'No signed-in customer found' };

        const { data, error } = await supabase.auth.getUser();
        if (error) return { error: error.message };

        // getUser validates against Auth and returns current metadata. Preserve
        // the existing tokens while replacing only the customer user payload.
        setSession((current) => current ? { ...current, user: data.user } : current);
        return { error: null };
      },
      updateProfile: async (input) => {
        if (!session?.user) return { error: 'No signed-in customer found' };

        const firstName = input.firstName.trim();
        const lastName = input.lastName.trim();
        const address = input.address.trim();
        if (!firstName || !lastName || !address) {
          return { error: 'First name, last name, and address are required' };
        }

        const rawContact = input.contactNumber.trim();
        const contactNumber = rawContact ? normalizePhMobile(rawContact) : null;
        if (rawContact && !contactNumber) {
          return { error: 'Enter a valid PH mobile number' };
        }

        // Customer-facing profile fields may live in user metadata until the
        // customer CIM endpoint lands. Authorization claims remain exclusively
        // in app_metadata and are never written by this client.
        const { error } = await supabase.auth.updateUser({
          data: {
            ...session.user.user_metadata,
            first_name: firstName,
            last_name: lastName,
            address,
            contact_number: contactNumber,
          },
        });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        // Logout must clear the local session even if the network is down or
        // Supabase cannot revoke the remote session. The app must never leave
        // the user stranded in a protected screen because sign-out failed remotely.
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          // Local cleanup below is the important part of the mobile logout flow.
        }
        passwordRecoveryRef.current = false;
        setSession(null);
        setAccountType(null);
        try {
          await AsyncStorage.multiRemove([ACCOUNT_TYPE_KEY, PASSWORD_RECOVERY_KEY]);
        } catch {
          // A storage cleanup failure must not prevent the auth state from closing.
        }
      },
    };
  }, [session, accountType, initializing]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
