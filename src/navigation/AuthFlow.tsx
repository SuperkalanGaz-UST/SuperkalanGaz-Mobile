import { useState } from 'react';
import { View } from 'react-native';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { SignUpScreen } from '@/screens/auth/SignUpScreen';
import { OtpScreen } from '@/screens/auth/OtpScreen';
import {
  ForgotPasswordScreen,
  ForgotCheckScreen,
  SetPasswordScreen,
  SuccessScreen,
} from '@/screens/auth/ForgotFlow';
import { useAuth } from '@/contexts/AuthContext';
import type { AccountType, AuthScreen, InputMode, OtpVariant, SignupDraft } from '@/navigation/types';

/**
 * Signed-out state machine (Figma auth prototype). Drives login → signup → OTP
 * and the forgot-password steps with a lightweight screen enum. A successful
 * sign-in/up flips the Supabase session; RootNavigator then swaps in the app.
 */
export function AuthFlow() {
  const { signUp } = useAuth();
  const [screen, setScreen] = useState<AuthScreen>('login');
  const [account, setAccount] = useState<AccountType>('household');
  const [input, setInput] = useState<InputMode>('email');
  const [draft, setDraft] = useState<SignupDraft | null>(null);
  const [otpVariant, setOtpVariant] = useState<OtpVariant>('email');
  const [notice, setNotice] = useState('');

  const render = () => {
    switch (screen) {
      case 'signup':
        return (
          <SignUpScreen
            account={account}
            input={input}
            initialDraft={draft}
            onInputChange={setInput}
            onBack={() => {
              setDraft(null);
              setScreen('login');
            }}
            onNext={async (d) => {
              const { error, needsConfirmation } = await signUp({
                method: d.input,
                identifier: d.contact,
                password: d.password,
                firstName: d.firstName,
                lastName: d.lastName,
                address: d.address,
                accountType: d.accountType,
              });
              if (error) return error;

              // When confirmation is disabled Supabase returns a session and the
              // root navigator replaces this flow. Otherwise, show the code UI.
              if (!needsConfirmation) return null;

              setDraft(d);
              setOtpVariant(
                d.input === 'phone' ? (d.accountType === 'commercial' ? 'sms' : 'phone') : 'email',
              );
              setScreen('otp');
              return null;
            }}
          />
        );
      case 'otp':
        return (
          <OtpScreen
            variant={otpVariant}
            draft={draft}
            onBack={() => setScreen('signup')}
          />
        );
      case 'forgot':
        return <ForgotPasswordScreen onBack={() => setScreen('login')} onNext={() => setScreen('forgot-check')} />;
      case 'forgot-check':
        return <ForgotCheckScreen onBack={() => setScreen('forgot')} onNext={() => setScreen('set-password')} />;
      case 'set-password':
        return <SetPasswordScreen onBack={() => setScreen('forgot-check')} onNext={() => setScreen('success')} />;
      case 'success':
        return <SuccessScreen onDone={() => setScreen('login')} />;
      case 'login':
      default:
        return (
          <LoginScreen
            account={account}
            input={input}
            notice={notice}
            onAccountChange={setAccount}
            onInputChange={setInput}
            onForgot={() => {
              setNotice('');
              setScreen('forgot');
            }}
            onSignUp={() => {
              setNotice('');
              setDraft(null);
              setScreen('signup');
            }}
          />
        );
    }
  };

  return <View style={{ flex: 1 }}>{render()}</View>;
}
