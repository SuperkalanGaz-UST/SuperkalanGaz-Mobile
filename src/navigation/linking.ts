import { Linking } from 'react-native';
import { getStateFromPath, type LinkingOptions } from '@react-navigation/native';
import type { RootStack } from '@/navigation/types';

// Expo Go appends a route after /--/. Installed builds use the existing custom
// scheme; browser builds use React Navigation's History API integration.
function appLink(url: string | null): string | null {
  if (url && /^exps?:\/\//.test(url) && url.includes('/--/')) {
    return `superkalan://${url.split('/--/')[1]}`;
  }
  return url;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const mobileLinking: LinkingOptions<RootStack> = {
  prefixes: ['superkalan://'],
  getInitialURL: async () => appLink(await Linking.getInitialURL()),
  subscribe(listener) {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const target = appLink(url);
      if (target) listener(target);
    });
    return () => subscription.remove();
  },
  config: {
    screens: {
      Auth: {
        screens: {
          login: { path: 'login', alias: [''] },
          signup: 'signup',
          forgot: 'forgot-password',
        },
      },
      Customer: {
        path: 'customer',
        initialRouteName: 'home',
        screens: {
          home: { path: 'home', alias: [''], parse: { showGuide: (value) => value === 'true' } },
          rewards: {
            path: 'rewards',
            parse: { rewardsSection: (value) => value === 'all' ? 'all' : 'my' },
          },
          orders: 'orders',
          more: 'more',
          profile: {
            path: 'profile',
            parse: { profileSection: (value) => value === 'preferences' ? 'preferences' : 'personal' },
          },
          'order-process': 'order/:orderId?',
          faqs: 'faqs',
        },
      },
      DeliveryRider: {
        path: 'delivery-rider',
        initialRouteName: 'home',
        screens: {
          home: { path: 'home', alias: [''] },
          delivery: 'delivery',
          profile: 'profile',
          proof: 'delivery/proof',
          complete: 'delivery/complete',
        },
      },
      VerifyMobile: 'delivery-rider/verify-mobile',
      Unavailable: 'access-unavailable',
      NotFound: '*',
    },
  },
  getStateFromPath(path, options) {
    const state = getStateFromPath<RootStack>(path, options);
    const root = state?.routes[state.index ?? state.routes.length - 1];
    const child = root?.state?.routes.at(-1);
    // An order UUID only selects a customer-owned request fetched through the
    // API. Invalid identifiers must not turn a tracking link into a new order.
    if (child?.name === 'order-process') {
      const orderId = (child.params as { orderId?: unknown } | undefined)?.orderId;
      if (orderId !== undefined && (typeof orderId !== 'string' || !uuid.test(orderId))) {
        return { routes: [{ name: 'NotFound', path }] };
      }
    }
    return state;
  },
};
