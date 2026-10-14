import { useState } from 'react';
import { View } from 'react-native';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { SignUpScreen } from '@/screens/auth/SignUpScreen';
import { SignUpOtpScreen } from '@/screens/auth/SignUpOtpScreen';
import {
  ForgotPasswordScreen,
  ForgotCheckScreen,
  SetPasswordScreen,
  SuccessScreen,
} from '@/screens/auth/ForgotFlow';
import { useAuth } from '@/contexts/AuthContext';
import type { AccountType, AuthScreen, SignupDraft } from '@/navigation/types';

/**
 * Signed-out customer flow. Registration goes through NestJS and email
 * confirmation is handled by Supabase Auth before opening the customer app.
 */
export function AuthFlow() {
  const {
    requestPasswordReset,
    verifyPasswordResetOtp,
    completePasswordReset,
    signUp,
  } = useAuth();
  const [screen, setScreen] = useState<AuthScreen>('login');
  const [account, setAccount] = useState<AccountType>('household');
  const [signupDraft, setSignupDraft] = useState<SignupDraft | null>(null);
  const [signupEmail, setSignupEmail] = useState('');
  const [notice, setNotice] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');

  const render = () => {
    switch (screen) {
      case 'signup':
        return (
          <SignUpScreen
            account={account}
            initialDraft={signupDraft}
            onAccountChange={setAccount}
            onBack={() => {
              setSignupDraft(null);
              setScreen('login');
            }}
            onNext={async (signupDraft) => {
              const result = await signUp({
                email: signupDraft.email,
                contactNumber: signupDraft.mobileNumber,
                password: signupDraft.password,
                firstName: signupDraft.firstName,
                lastName: signupDraft.lastName,
                address: signupDraft.address,
                accountType: signupDraft.accountType,
              });
              if (result.error) return result.error;
              if (result.needsConfirmation) {
                setSignupDraft(signupDraft);
                setSignupEmail(signupDraft.email);
                setScreen('signup-otp');
              }
              return null;
            }}
          />
        );
      case 'signup-otp':
        return (
          <SignUpOtpScreen
            email={signupEmail}
            onBack={() => setScreen('signup')}
          />
        );
      case 'forgot':
        return (
          <ForgotPasswordScreen
            onBack={() => setScreen('login')}
            onNext={async (email) => {
              const { error } = await requestPasswordReset(email);
              if (error) return error;
              setRecoveryEmail(email);
              setScreen('forgot-check');
              return null;
            }}
          />
        );
      case 'forgot-check':
        return (
          <ForgotCheckScreen
            onBack={() => setScreen('forgot')}
            onNext={async (token) => {
              const { error } = await verifyPasswordResetOtp(recoveryEmail, token);
              if (error) return error;
              setScreen('set-password');
              return null;
            }}
            onResend={async () => {
              const { error } = await requestPasswordReset(recoveryEmail);
              return error;
            }}
          />
        );
      case 'set-password':
        return (
          <SetPasswordScreen
            onBack={() => setScreen('forgot-check')}
            onNext={async (password) => {
              const { error } = await completePasswordReset(password);
              if (error) return error;
              setScreen('success');
              return null;
            }}
          />
        );
      case 'success':
        return <SuccessScreen onDone={() => setScreen('login')} />;
      case 'login':
      default:
        return (
          <LoginScreen
            notice={notice}
            onSignUp={() => {
              setNotice('');
              setSignupDraft(null);
              setScreen('signup');
            }}
            onForgot={() => {
              setNotice('');
              setScreen('forgot');
            }}
          />
        );
    }
  };

  return <View style={{ flex: 1 }}>{render()}</View>;
}
