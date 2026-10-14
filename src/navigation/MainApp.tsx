import { useCallback, useState } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { OrdersScreen } from '@/screens/orders/OrdersScreen';
import { MoreScreen } from '@/screens/more/MoreScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { OrderProcessScreen } from '@/screens/order/OrderProcessScreen';
import { FaqScreen } from '@/screens/faqs/FaqScreen';
import type { MainNavigateOptions, MainScreen } from '@/navigation/types';

type CustomerStack = { [Screen in MainScreen]: MainNavigateOptions | undefined };
const Stack = createNativeStackNavigator<CustomerStack>();

export function MainApp() {
  const navigation = useNavigationContainerRef<CustomerStack>();
  const [firstGuide, setFirstGuide] = useState(true);

  const navigate = useCallback((next: MainScreen, opts?: MainNavigateOptions) => {
    setFirstGuide(false);
    if (next === 'order-process' && opts?.orderId) {
      navigation.resetRoot({ index: 1, routes: [
        { name: 'home', params: { tab: 'home' } },
        { name: 'order-process', params: opts },
      ] });
    } else {
      // Preserve the original screen-replacement behavior for tabs and menus.
      navigation.resetRoot({ index: 0, routes: [{ name: next, params: opts }] });
    }
  }, [navigation]);

  const orderPlaced = useCallback((orderId: string) => {
    setFirstGuide(false);
    navigation.resetRoot({ index: 1, routes: [
      { name: 'home', params: { tab: 'home' } },
      // Preserve the instance while payment/confirmation finishes, but remove
      // every ordering step from the native back stack.
      { name: 'order-process', key: navigation.getCurrentRoute()?.key, params: { orderId } },
    ] });
  }, [navigation]);

  return (
    <NavigationContainer ref={navigation}>
      <Stack.Navigator initialRouteName="home" screenOptions={{ headerShown: false, animation: 'none' }}>
        <Stack.Screen name="home">
          {({ route }) => <HomeScreen initialTab={route.params?.tab ?? 'home'} showGuide={firstGuide || Boolean(route.params?.showGuide)} onNavigate={navigate} />}
        </Stack.Screen>
        <Stack.Screen name="orders">{() => <OrdersScreen onNavigate={navigate} />}</Stack.Screen>
        <Stack.Screen name="more">{() => <MoreScreen onNavigate={navigate} />}</Stack.Screen>
        <Stack.Screen name="profile">
          {({ route }) => <ProfileScreen initialSection={route.params?.profileSection ?? 'personal'} onNavigate={navigate} />}
        </Stack.Screen>
        <Stack.Screen name="order-process" options={({ route }) => ({
          gestureEnabled: Boolean(route.params?.orderId),
          animation: route.params?.orderId ? 'slide_from_right' : 'none',
        })}>
          {({ route }) => <OrderProcessScreen initialOrderId={route.params?.orderId} onOrderPlaced={orderPlaced} onNavigate={navigate} />}
        </Stack.Screen>
        <Stack.Screen name="faqs">{() => <FaqScreen onNavigate={navigate} />}</Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
