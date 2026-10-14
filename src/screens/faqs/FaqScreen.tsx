import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import type { MainScreen, MainTab } from '@/navigation/types';

/**
 * FAQs (Figma "FaQs"): searchable category → question accordion. Copy is fixed
 * product content; it explicitly states the app shows delivery status only, not
 * the rider's live location (AGENTS.md §7).
 */
const FAQ_DATA = [
  {
    id: 'general',
    category: 'General Questions',
    questions: [
      { q: 'What is the Superkalan Gaz app?', a: 'The app allows customers to order LPG, track delivery updates, view purchase history, and submit feedback digitally.' },
      { q: 'Can I use the app anytime?', a: 'Yes, but deliveries are only processed during branch operating hours.' },
      { q: 'Do I need internet access to use the app?', a: 'Yes. An internet connection is required to place orders and receive updates.' },
      { q: 'Can I use my account on another phone?', a: 'Yes. You can log in using your registered account credentials.' },
    ],
  },
  {
    id: 'ordering',
    category: 'Ordering & Delivery',
    questions: [
      { q: 'How do I place an LPG order?', a: 'Open the app, choose your LPG product, confirm your address, and submit the order.' },
      { q: 'How will I know if my order has been confirmed?', a: 'You will receive an in-app order status update once the branch accepts your order.' },
      { q: 'Can I track my delivery?', a: 'Yes. You can monitor delivery updates such as Order Confirmed, Out for Delivery, and Delivered.' },
      { q: "Can I see the rider's live location?", a: 'No. The app only provides delivery status updates.' },
      { q: 'What should I do if my order is delayed?', a: 'You may check the app for updates or contact the branch for assistance.' },
    ],
  },
  {
    id: 'account',
    category: 'Account & Profile',
    questions: [
      { q: 'Can I save multiple delivery addresses?', a: 'Yes. Multiple addresses can be saved in your profile for easier ordering.' },
      { q: 'Can I view my previous orders?', a: 'Yes. Your purchase history is available in the app.' },
      { q: 'Is my personal information secure?', a: 'Yes. Customer information is protected and only accessible to authorized personnel.' },
    ],
  },
  {
    id: 'loyalty',
    category: 'Loyalty & Rewards',
    questions: [
      { q: 'Does the app include a loyalty rewards program?', a: 'Yes. The system automatically tracks your completed LPG purchases.' },
      { q: 'How do I qualify for a loyalty reward?', a: 'The app counts your purchases and notifies the branch once you reach the required number of orders.' },
      { q: 'How will I know if I earned a reward?', a: 'The branch will be notified by the system and will process the reward approval.' },
    ],
  },
  {
    id: 'feedback',
    category: 'Feedback & Support',
    questions: [
      { q: 'How can I rate my delivery experience?', a: 'After delivery completion, the app will ask you to submit a star rating and feedback.' },
      { q: 'What is the purpose of the customer rating system?', a: 'Ratings help improve delivery service quality and customer satisfaction.' },
      { q: 'Who can I contact if I experience problems with the app or delivery?', a: 'You may contact the branch support team for assistance with technical or delivery concerns.' },
    ],
  },
];

export function FaqScreen({ onNavigate }: { onNavigate: (screen: MainScreen, opts?: { tab?: MainTab }) => void }) {
  const insets = useSafeAreaInsets();
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = FAQ_DATA.map((cat) => ({
    ...cat,
    questions: cat.questions.filter(
      (item) =>
        search === '' ||
        item.q.toLowerCase().includes(search.toLowerCase()) ||
        item.a.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter((cat) => search === '' || cat.questions.length > 0);

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => onNavigate('home', { tab: 'home' })} hitSlop={8}>
          <Feather name="chevron-left" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Frequently Asked Questions</Text>
      </View>

      <View style={styles.sheet}>
        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color="#9aa8b2" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search questions..."
              placeholderTextColor="#9aa8b2"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {filtered.map((cat) => {
            const catOpen = openCategory === cat.id;
            return (
              <View key={cat.id}>
                <Pressable
                  style={styles.catHead}
                  onPress={() => {
                    setOpenCategory(catOpen ? null : cat.id);
                    setOpenQuestion(null);
                  }}
                >
                  <Text style={styles.catText}>{cat.category}</Text>
                  <Feather name={catOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#fff" />
                </Pressable>
                {catOpen &&
                  cat.questions.map((item) => {
                    const qKey = `${cat.id}-${item.q}`;
                    const qOpen = openQuestion === qKey;
                    return (
                      <View key={qKey} style={styles.qCard}>
                        <Pressable style={styles.qHead} onPress={() => setOpenQuestion(qOpen ? null : qKey)}>
                          <Text style={styles.qText}>{item.q}</Text>
                          <Feather name={qOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
                        </Pressable>
                        {qOpen && (
                          <View style={styles.aWrap}>
                            <Text style={styles.aText}>{item.a}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
              </View>
            );
          })}
          {filtered.length === 0 && <Text style={styles.noResults}>No results found.</Text>}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.primary },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 20, color: '#fff' },
  sheet: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.searchBg },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.label, padding: 0 },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 8 },
  catHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primary, borderRadius: 7, paddingHorizontal: 16, minHeight: 46, marginTop: 8 },
  catText: { fontFamily: fonts.bold, fontSize: 13, color: '#fff', flex: 1 },
  qCard: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 7, overflow: 'hidden', marginTop: 4 },
  qHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, minHeight: 46 },
  qText: { flex: 1, paddingRight: 8, fontFamily: fonts.medium, fontSize: 13, color: colors.label },
  aWrap: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#ededed', backgroundColor: '#fafafa' },
  aText: { fontFamily: fonts.regular, fontSize: 12, color: '#2a2f3b', lineHeight: 18 },
  noResults: { fontFamily: fonts.regular, fontSize: 14, color: '#9aa8b2', textAlign: 'center', paddingVertical: 48 },
});
