import { useState } from 'react';
import type { AccountType } from '@/contexts/AuthContext';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { SignUpSheet } from '@/screens/auth/SignUpSheet';

/**
 * Signed-out flow: the Login screen with the Sign Up bottom sheet layered on top.
 * Login stays mounted underneath so it shows (dimmed) behind the sheet as it
 * slides up. The Household/Commercial choice selected on Login carries into the
 * sheet so it builds the right account type. On a successful sign-in/up the auth
 * listener flips the session and RootNavigator swaps this whole flow out.
 */
export function AuthFlow() {
  const [signUpVisible, setSignUpVisible] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('household');

  return (
    <>
      <LoginScreen
        onSignUp={(type) => {
          setAccountType(type);
          setSignUpVisible(true);
        }}
      />
      <SignUpSheet
        visible={signUpVisible}
        accountType={accountType}
        onClose={() => setSignUpVisible(false)}
      />
    </>
  );
}
