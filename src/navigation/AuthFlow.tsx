import { useState } from 'react';
import { View } from 'react-native';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import {
  ForgotPasswordScreen,
  ForgotCheckScreen,
  SetPasswordScreen,
  SuccessScreen,
} from '@/screens/auth/ForgotFlow';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthScreen } from '@/navigation/types';

/**
 * Signed-out state machine for existing mobile accounts. Customer accounts are
 * provisioned outside the mobile app; this flow only handles sign-in and
 * password recovery.
 */
export function AuthFlow() {
  const {
    requestPasswordReset,
    verifyPasswordResetOtp,
    completePasswordReset,
  } = useAuth();
  const [screen, setScreen] = useState<AuthScreen>('login');
  const [notice, setNotice] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');

  const render = () => {
    switch (screen) {
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
