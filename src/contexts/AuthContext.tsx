import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { apiErrorMessage, apiFetch, apiPublicFetch } from '@/lib/api';
import { normalizePhMobile } from '@/lib/phMobile';
import { supabase } from '@/lib/supabase';

/**
 * Owns the customer's auth session. Sign-in goes through Supabase Auth; the
 * resulting access token is attached to every API call by `src/lib/api.ts`.
 * The customer's role/branch scope is derived server-side from that token — this
 * context never decides authorization.
 *
 * SCAFFOLD: session plumbing only. Fetch the customer profile from the API once
 * signed in, and expand the surface (register, reset password) as screens land.
 */

/**
 * Household = residential (points rewards), Commercial = business (30+1 exchange).
 * The backend has no account-type field yet, so the login tab is the source of
 * truth: we persist the customer's choice and route the app home from it. Move
 * this onto the server profile once the API exposes it.
 */
export type AccountType = 'household' | 'commercial';

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
  if (metadata.role === 'customer' && metadata.status === 'Active') {
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
  /** Which customer experience to show. Null only when signed out. */
  accountType: AccountType | null;
  /** True until the initial session has been restored from storage. */
  initializing: boolean;
  signIn: (email: string, password: string, accountType: AccountType) => Promise<{ error: string | null }>;
  /** Phone sign-in. `phone` must be canonical E.164 (`+639XXXXXXXXX`). */
  signInWithPhone: (
    phone: string,
    password: string,
    accountType: AccountType,
  ) => Promise<{ error: string | null }>;
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

  useEffect(() => {
    // Restore any persisted session + account type, then keep them in sync.
    Promise.all([supabase.auth.getSession(), AsyncStorage.getItem(ACCOUNT_TYPE_KEY)]).then(
      async ([{ data }, storedType]) => {
        const restored = data.session ? await ensureCustomerSession(data.session) : null;
        setSession(restored?.session ?? data.session);
        if (storedType === 'household' || storedType === 'commercial') setAccountType(storedType);
        setInitializing(false);
      },
    );
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    // Shared by both sign-in methods: record the chosen account type up front so
    // the app routes to the right home the instant the session lands, and persist
    // it only once the credentials actually check out.
    const runSignIn = async (
      credentials: { email: string; password: string } | { phone: string; password: string },
      chosenType: AccountType,
    ): Promise<{ error: string | null }> => {
      setAccountType(chosenType);
      const { error } = await supabase.auth.signInWithPassword(credentials);
      if (error) return { error: error.message };

      const { data } = await supabase.auth.getSession();
      if (!data.session) return { error: 'No signed-in customer session was created' };
      const prepared = await ensureCustomerSession(data.session);
      if (prepared.error) return { error: prepared.error };
      setSession(prepared.session);
      await AsyncStorage.setItem(ACCOUNT_TYPE_KEY, chosenType);
      return { error: null };
    };

    return {
      session,
      accountType,
      initializing,
      signIn: (email, password, type) => runSignIn({ email, password }, type),
      signInWithPhone: (phone, password, type) => runSignIn({ phone, password }, type),
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
