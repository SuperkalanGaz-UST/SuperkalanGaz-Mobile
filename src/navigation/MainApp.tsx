import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { OrdersScreen } from '@/screens/orders/OrdersScreen';
import { MoreScreen } from '@/screens/more/MoreScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { OrderProcessScreen } from '@/screens/order/OrderProcessScreen';
import { FaqScreen } from '@/screens/faqs/FaqScreen';
import type { MainNavigateOptions, MainScreen, MainTab, ProfileSection } from '@/navigation/types';

/**
 * Signed-in state machine (Figma main prototype). Mirrors the web mock's single
 * `onNavigate` reducer across Home / Orders / More / Profile / Order flow / FAQs. The
 * first-run app guide shows once on the initial Home after sign-in.
 */
export function MainApp() {
  const [screen, setScreen] = useState<MainScreen>('home');
  const [homeTab, setHomeTab] = useState<MainTab>('home');
  const [firstGuide, setFirstGuide] = useState(true);
  const [guideRequested, setGuideRequested] = useState(false);
  const [profileSection, setProfileSection] = useState<ProfileSection>('personal');

  const navigate = useCallback((next: MainScreen, opts?: MainNavigateOptions) => {
    setScreen(next);
    if (opts?.tab) setHomeTab(opts.tab);
    if (next === 'profile') setProfileSection(opts?.profileSection ?? 'personal');
    setGuideRequested(Boolean(opts?.showGuide));
    setFirstGuide(false);
  }, []);

  const render = () => {
    switch (screen) {
      case 'orders':
        return <OrdersScreen onNavigate={navigate} />;
      case 'more':
        return <MoreScreen onNavigate={navigate} />;
      case 'profile':
        return <ProfileScreen initialSection={profileSection} onNavigate={navigate} />;
      case 'order-process':
        return <OrderProcessScreen onNavigate={navigate} />;
      case 'faqs':
        return <FaqScreen onNavigate={navigate} />;
      case 'home':
      default:
        return <HomeScreen initialTab={homeTab} showGuide={firstGuide || guideRequested} onNavigate={navigate} />;
    }
  };

  return <View style={{ flex: 1 }}>{render()}</View>;
}
