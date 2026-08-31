import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { apiErrorMessage, apiFetch, apiPublicFetch } from '@/lib/api';
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

/** Details collected by the sign-up form (Figma "Create a … Account"). */
export interface SignUpInput {
  /** Which identifier the customer registered with. */
  method: 'email' | 'phone';
  /** Email address, or canonical E.164 phone (`+639XXXXXXXXX`) when method is phone. */
  identifier: string;
  password: string;
  firstName: string;
  lastName: string;
  /** Home address (Household) or business address (Commercial). */
  address: string;
  accountType: AccountType;
}

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

async function requestSignUpOtpResend(
  method: SignUpInput['method'],
  identifier: string,
): Promise<{ error: string | null }> {
  try {
    const response = await apiPublicFetch('/auth/resend-signup-code', {
      method: 'POST',
      body: JSON.stringify({ method, identifier }),
    });
    const data: unknown = await response.json().catch(() => null);
    return {
      error: response.ok
        ? null
        : apiErrorMessage(data, 'Could not resend the verification code.'),
    };
  } catch (err) {
    return {
      error: err instanceof Error
        ? err.message
        : 'Could not resend the verification code.',
    };
  }
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
  /**
   * Register a new customer and request the signup code from Supabase Auth.
   * `needsConfirmation` is true when the caller must show the OTP screen.
   */
  signUp: (input: SignUpInput) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  /** Confirm the email or SMS code that Supabase sent for a pending signup. */
  verifySignUpOtp: (
    method: SignUpInput['method'],
    identifier: string,
    token: string,
  ) => Promise<{ error: string | null }>;
  /** Ask Supabase to send a fresh signup code through the configured provider. */
  resendSignUpOtp: (
    method: SignUpInput['method'],
    identifier: string,
  ) => Promise<{ error: string | null }>;
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
      // Signup recovery still knows which track the user selected. Normal
      // sign-in passes null and relies entirely on the protected claim.
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
      signUp: async (input) => {
        setAccountType(input.accountType);

        // Keep signup behind the API so it can start OTP delivery and attach
        // service-role-only app_metadata claims. The mobile client can write
        // user_metadata, but it must never control authorization claims.
        try {
          const res = await apiPublicFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
              method: input.method,
              identifier: input.identifier,
              password: input.password,
              firstName: input.firstName,
              lastName: input.lastName,
              address: input.address,
              accountType: input.accountType,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            const registrationError = apiErrorMessage(data, 'Registration failed');
            if (/already (?:been )?registered/i.test(registrationError)) {
              const credentials =
                input.method === 'email'
                  ? { email: input.identifier, password: input.password }
                  : { phone: input.identifier, password: input.password };
              const existingSignIn = await runSignIn(credentials, input.accountType);
              if (!existingSignIn.error) {
                return { error: null, needsConfirmation: false };
              }

              // A previous attempt may have created an unverified identity.
              // With the correct password Supabase identifies that state as
              // "not confirmed"; resend and resume OTP instead of dead-ending.
              if (/not confirmed/i.test(existingSignIn.error)) {
                const resent = await requestSignUpOtpResend(input.method, input.identifier);
                if (!resent.error) {
                  await AsyncStorage.setItem(ACCOUNT_TYPE_KEY, input.accountType);
                  return { error: null, needsConfirmation: true };
                }
                return { error: resent.error, needsConfirmation: false };
              }
            }
            return { error: registrationError, needsConfirmation: false };
          }
          await AsyncStorage.setItem(ACCOUNT_TYPE_KEY, input.accountType);
          const needsConfirmation = data.needsConfirmation === true;
          if (needsConfirmation) return { error: null, needsConfirmation: true };

          // Projects with confirmation disabled return an immediately usable
          // account, but the server cannot install its session in this client.
          // Sign in once here so registration never leaves the customer stuck.
          const credentials =
            input.method === 'email'
              ? { email: input.identifier, password: input.password }
              : { phone: input.identifier, password: input.password };
          const signedIn = await runSignIn(credentials, input.accountType);
          return { error: signedIn.error, needsConfirmation: false };
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : 'Registration failed',
            needsConfirmation: false,
          };
        }
      },
      verifySignUpOtp: async (method, identifier, token) => {
        const { data, error } =
          method === 'email'
            ? await supabase.auth.verifyOtp({
                email: identifier,
                token,
                type: 'email',
              })
            : await supabase.auth.verifyOtp({
                phone: identifier,
                token,
                type: 'sms',
              });
        if (error) return { error: error.message };
        const verifiedSession = data.session ?? (await supabase.auth.getSession()).data.session;
        if (!verifiedSession) return { error: 'No signed-in customer session was created' };
        const prepared = await ensureCustomerSession(verifiedSession);
        if (!prepared.error) setSession(prepared.session);
        return { error: prepared.error };
      },
      resendSignUpOtp: requestSignUpOtpResend,
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
        await supabase.auth.signOut();
        await AsyncStorage.removeItem(ACCOUNT_TYPE_KEY);
        setAccountType(null);
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
