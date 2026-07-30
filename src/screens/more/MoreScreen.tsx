import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/ui/AppHeader';
import { BottomNav } from '@/components/ui/BottomNav';
import { LogoutConfirmModal } from '@/components/ui/overlays';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import type { MainNavigateOptions, MainScreen } from '@/navigation/types';

type FeatherName = keyof typeof Feather.glyphMap;

interface MoreItem {
  label: string;
  description: string;
  icon: FeatherName;
  onPress?: () => void;
  danger?: boolean;
}

/**
 * Dedicated fourth-tab destination for secondary account and support actions.
 * Profile remains a separate screen, opened from the avatar in the app header.
 */
export function MoreScreen({
  onNavigate,
}: {
  onNavigate: (screen: MainScreen, opts?: MainNavigateOptions) => void;
}) {
  const { signOut } = useAuth();
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const sections: { title: string; items: MoreItem[] }[] = [
    {
      title: 'Account',
      items: [
        {
          label: 'My Profile',
          description: 'View and update your personal details',
          icon: 'user',
          onPress: () => onNavigate('profile', { profileSection: 'personal' }),
        },
        {
          label: 'My Orders',
          description: 'Track active orders and view order history',
          icon: 'shopping-bag',
          onPress: () => onNavigate('orders', { tab: 'orders' }),
        },
        {
          label: 'Settings',
          description: 'Manage notifications and account security',
          icon: 'settings',
          onPress: () => onNavigate('profile', { profileSection: 'preferences' }),
        },
      ],
    },
    {
      title: 'Help & Support',
      items: [
        {
          label: 'App Guide',
          description: 'Review how to use the customer app',
          icon: 'book-open',
          onPress: () => onNavigate('home', { tab: 'home', showGuide: true }),
        },
        {
          label: 'Contact Us',
          description: 'Customer support details coming soon',
          icon: 'phone',
        },
        {
          label: 'FAQs',
          description: 'Find answers to common questions',
          icon: 'help-circle',
          onPress: () => onNavigate('faqs'),
        },
      ],
    },
  ];

  const renderItem = (item: MoreItem, isLast = false) => (
    <Pressable
      key={item.label}
      accessibilityRole="button"
      accessibilityState={{ disabled: !item.onPress }}
      disabled={!item.onPress}
      onPress={item.onPress}
      style={({ pressed }) => [
        styles.item,
        !isLast && styles.itemDivider,
        pressed && styles.itemPressed,
      ]}
    >
      <View style={styles.iconWrap}>
        <Feather
          name={item.icon}
          size={22}
          color={item.danger ? colors.danger : colors.primary}
        />
      </View>
      <View style={styles.itemCopy}>
        <Text style={[styles.itemLabel, item.danger && styles.dangerText]}>{item.label}</Text>
        <Text style={styles.itemDescription}>{item.description}</Text>
      </View>
      {item.onPress
        ? <Feather name="chevron-right" size={20} color={item.danger ? colors.danger : colors.muted} />
        : <Text style={styles.soon}>Soon</Text>}
    </Pressable>
  );

  return (
    <View style={styles.flex}>
      <AppHeader onProfile={() => onNavigate('profile', { profileSection: 'personal' })} />

      <ScrollView
        style={styles.sheet}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Manage your account and get help.</Text>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View>
              {section.items.map((item, index) =>
                renderItem(item, index === section.items.length - 1),
              )}
            </View>
          </View>
        ))}

        <View style={styles.logoutGroup}>
          {renderItem({
            label: 'Log Out',
            description: 'Sign out of this device',
            icon: 'log-out',
            danger: true,
            onPress: () => setLogoutConfirm(true),
          })}
        </View>
      </ScrollView>

      <BottomNav active="more" onNavigate={onNavigate} />
      <LogoutConfirmModal
        visible={logoutConfirm}
        onConfirm={() => {
          setLogoutConfirm(false);
          signOut();
        }}
        onCancel={() => setLogoutConfirm(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  sheet: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },
  content: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 130 },
  title: { fontFamily: fonts.bold, fontSize: 26, color: colors.heading },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.grayText, marginTop: 4 },
  section: { marginTop: 30 },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.primary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  item: {
    minHeight: 68,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  itemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dividerStrong,
  },
  itemPressed: { opacity: 0.55 },
  iconWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCopy: { flex: 1 },
  itemLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.heading },
  itemDescription: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    color: colors.grayText,
    marginTop: 2,
  },
  dangerText: { color: colors.danger },
  soon: { fontFamily: fonts.medium, fontSize: 10, color: colors.muted },
  logoutGroup: {
    marginTop: 24,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dividerStrong,
  },
});
