import { useState } from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import type { AccountType, AuthScreen, AuthStack, PublicAuthScreen, SignupDraft } from '@/navigation/types';

const Stack = createNativeStackNavigator<AuthStack>();

function publicScreen(screen: AuthScreen): PublicAuthScreen {
  if (screen === 'signup' || screen === 'signup-otp') return 'signup';
  if (screen === 'login') return 'login';
  return 'forgot';
}

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
  const [step, setStep] = useState<AuthScreen>('login');
  const [account, setAccount] = useState<AccountType>('household');
  const [signupDraft, setSignupDraft] = useState<SignupDraft | null>(null);
  const [signupEmail, setSignupEmail] = useState('');
  const [notice, setNotice] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');

  const render = (base: PublicAuthScreen, navigate: (screen: PublicAuthScreen) => void) => {
    // Verification/reset steps depend on in-memory identity and proof. Keep
    // passwords, OTPs and signup drafts out of link params and browser history.
    const screen = publicScreen(step) === base ? step : base;
    const setScreen = (next: AuthScreen) => {
      setStep(next);
      if (publicScreen(next) !== base) navigate(publicScreen(next));
    };
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

  return (
    <Stack.Navigator initialRouteName="login" screenOptions={{ headerShown: false, animation: 'none' }}>
      {(['login', 'signup', 'forgot'] as const).map((screen) => (
        <Stack.Screen key={screen} name={screen}>
          {({ route, navigation }) => <View style={{ flex: 1 }}>{render(route.name, (next) => navigation.navigate(next))}</View>}
        </Stack.Screen>
      ))}
    </Stack.Navigator>
  );
}
