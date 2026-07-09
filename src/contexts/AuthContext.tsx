import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
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

/** AsyncStorage key for the persisted account type (survives app restarts). */
const ACCOUNT_TYPE_KEY = 'superkalan.accountType';

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
   * Register a new customer via Supabase Auth. `needsConfirmation` is true when
   * the project requires email/SMS verification (no session yet) — the caller
   * should tell the user to verify, then sign in.
   */
  signUp: (input: SignUpInput) => Promise<{ error: string | null; needsConfirmation: boolean }>;
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
      ([{ data }, storedType]) => {
        setSession(data.session);
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
      if (!error) await AsyncStorage.setItem(ACCOUNT_TYPE_KEY, chosenType);
      return { error: error?.message ?? null };
    };

    return {
      session,
      accountType,
      initializing,
      signIn: (email, password, type) => runSignIn({ email, password }, type),
      signInWithPhone: (phone, password, type) => runSignIn({ phone, password }, type),
      signUp: async (input) => {
        setAccountType(input.accountType);
        const credentials =
          input.method === 'email'
            ? { email: input.identifier, password: input.password }
            : { phone: input.identifier, password: input.password };
        // Name/address/type ride along as user metadata for now. Once the API
        // exposes a customer-profile endpoint, POST them there too (AGENTS.md §4).
        const { data, error } = await supabase.auth.signUp({
          ...credentials,
          options: {
            data: {
              first_name: input.firstName,
              last_name: input.lastName,
              address: input.address,
              account_type: input.accountType,
            },
          },
        });
        if (error) return { error: error.message, needsConfirmation: false };
        await AsyncStorage.setItem(ACCOUNT_TYPE_KEY, input.accountType);
        // No session back means the project requires email/SMS confirmation first.
        return { error: null, needsConfirmation: !data.session };
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
