import { useCallback, useState } from 'react';
import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { OrdersScreen } from '@/screens/orders/OrdersScreen';
import { MoreScreen } from '@/screens/more/MoreScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { OrderProcessScreen } from '@/screens/order/OrderProcessScreen';
import { FaqScreen } from '@/screens/faqs/FaqScreen';
import type { CustomerStack, MainNavigateOptions, MainScreen } from '@/navigation/types';

const Stack = createNativeStackNavigator<CustomerStack>();

function CustomerScreen({ navigation, route, firstGuide, dismissGuide }: NativeStackScreenProps<CustomerStack, MainScreen> & {
  firstGuide: boolean;
  dismissGuide: () => void;
}) {
  const navigate = useCallback((next: MainScreen, opts?: MainNavigateOptions) => {
    dismissGuide();
    const screen = next === 'home' && opts?.tab === 'rewards' ? 'rewards' : next;
    // Normal navigation creates real browser/native history. Temporary ordering
    // steps remain inside their screen and never serialize form data into URLs.
    navigation.navigate(screen, opts);
  }, [navigation, dismissGuide]);

  const orderPlaced = useCallback((orderId: string) => {
    dismissGuide();
    navigation.reset({ index: 1, routes: [
      { name: 'home', params: { tab: 'home' } },
      // Preserve the instance while payment/confirmation finishes, but remove
      // every ordering step from the native back stack.
      { name: 'order-process', key: route.key, params: { orderId } },
    ] });
  }, [navigation, route.key, dismissGuide]);

  switch (route.name) {
    case 'home':
    case 'rewards':
      return <HomeScreen
        initialTab={route.name === 'rewards' ? 'rewards' : 'home'}
        initialRewardsSection={route.params?.rewardsSection}
        showGuide={(route.name === 'home' && firstGuide) || Boolean(route.params?.showGuide)}
        onNavigate={navigate}
      />;
    case 'orders': return <OrdersScreen onNavigate={navigate} />;
    case 'more': return <MoreScreen onNavigate={navigate} />;
    case 'profile': return <ProfileScreen initialSection={route.params?.profileSection ?? 'personal'} onNavigate={navigate} />;
    case 'order-process': return <OrderProcessScreen initialOrderId={route.params?.orderId} onOrderPlaced={orderPlaced} onNavigate={navigate} />;
    case 'faqs': return <FaqScreen onNavigate={navigate} />;
  }
}

export function MainApp() {
  const [firstGuide, setFirstGuide] = useState(true);
  const dismissGuide = useCallback(() => setFirstGuide(false), []);

  return (
    <Stack.Navigator initialRouteName="home" screenOptions={{ headerShown: false, animation: 'none' }}>
      {(['home', 'rewards', 'orders', 'more', 'profile', 'order-process', 'faqs'] as const).map((screen) => (
        <Stack.Screen key={screen} name={screen} getId={screen === 'order-process' ? ({ params }) => params?.orderId ?? 'new' : undefined} options={({ route }) => ({
          gestureEnabled: screen !== 'order-process' || Boolean(route.params?.orderId),
          animation: screen === 'order-process' && route.params?.orderId ? 'slide_from_right' : 'none',
        })}>
          {(props) => <CustomerScreen {...props} firstGuide={firstGuide} dismissGuide={dismissGuide} />}
        </Stack.Screen>
      ))}
    </Stack.Navigator>
  );
}
