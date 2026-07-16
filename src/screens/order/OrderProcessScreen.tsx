import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { cardShadow, radii } from '@/theme/metrics';
import { cylinderFor, images } from '@/lib/assets';
import { Toast } from '@/components/ui/overlays';
import type { MainScreen, MainTab } from '@/navigation/types';

/**
 * Order flow (Figma "OrderProcess"): product select → review → track. Includes
 * address / schedule / payment sheets, the confirm dialog, and post-delivery
 * feedback. Maps to the SRD module; `order_source = Mobile App` is implied.
 *
 * SCAFFOLD: catalog, pricing, ETA and tracking are Figma mock. Wire to the SRD
 * endpoints; the four-timestamp SLA chain + status milestones live server-side
 * (AGENTS.md §8). Never show live rider GPS — status milestones only.
 */
type Step = 'select' | 'summary' | 'track';
type ModalKind = 'none' | 'selectAddress' | 'editAddress' | 'confirmed' | 'sched' | 'payment';
type Payment = 'gcash' | 'maya' | 'cash';
type FeedbackStep = 'none' | 'rider' | 'store' | 'xfeedback';

const PRODUCTS = [
  { id: '2.7kg', label: '2.7 KG', price: 350, eta: '12:00 - 12:05 PM', desc: 'Our most portable variant and ideal for outdoor use. The most affordable, easy to use product for those shifting to clean-burning LPG.' },
  { id: '5kg', label: '5 KG', price: 620, eta: '12:00 - 12:10 PM', desc: 'Lighter weight, lower priced alternative to our 11kg variant for smaller families.' },
  { id: '11kg', label: '11 KG', price: 1000, eta: '12:00 - 12:05 PM', desc: 'The standard size for the average Filipino home.' },
  { id: '22kg', label: '22 KG', price: 1800, eta: '12:15 - 12:30 PM', desc: 'Typically used in bakeries and small-medium restaurants/food outlets.' },
  { id: '50kg', label: '50 KG', price: 3500, eta: '12:30 - 1:00 PM', desc: 'Ideal for large restaurants, laundry business, hotels, factories and other commercial establishments.' },
];
const ADDRESSES = [
  { id: 'house1', label: 'House 1', address: '123 Main St, Metro Manila' },
  { id: 'office', label: 'Office', address: '246 Main Road, Salcedo Makati' },
  { id: 'house2', label: 'House 2', address: '810 Main Alley, Las Pinas' },
];
const STEP_LABELS = ['Order Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];

export function OrderProcessScreen({ onNavigate }: { onNavigate: (screen: MainScreen, opts?: { tab?: MainTab }) => void }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('select');
  const [modal, setModal] = useState<ModalKind>('none');
  const [product, setProduct] = useState(PRODUCTS[2]);
  const [qty, setQty] = useState(1);
  const [address, setAddress] = useState(ADDRESSES[0]);
  const [payment, setPayment] = useState<Payment>('gcash');
  const [tempPayment, setTempPayment] = useState<Payment>('gcash');
  const [delivered, setDelivered] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackStep>('none');
  const [riderRating, setRiderRating] = useState(0);
  const [storeRating, setStoreRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [toast, setToast] = useState('');

  // edit-address form
  const [eaLabel, setEaLabel] = useState('');
  const [eaAddress, setEaAddress] = useState('');
  const [eaContact, setEaContact] = useState('');

  const total = product.price * qty;
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };
  const headerTitle = step === 'track' ? 'Track my Order' : 'Request an Order';

  /* ── Stepper ── */
  const stepper = (done: number) => (
    <View style={styles.stepper}>
      {STEP_LABELS.map((label, i) => {
        const isDone = i < done;
        const isActive = i === done;
        const isLast = i === STEP_LABELS.length - 1;
        const bg = isDone ? colors.greenBright : isActive ? '#fff' : colors.stepActiveBg;
        const border = isDone ? colors.greenBright : isActive ? '#8db5f6' : colors.stepIdle;
        return (
          <View key={label} style={[styles.stepCol, isLast ? { flex: 0 } : { flex: 1 }]}>
            <View style={styles.stepRow}>
              <View style={[styles.stepNode, { backgroundColor: bg, borderColor: border }]}>
                {isDone ? <Feather name="check" size={16} color="#fff" /> : <View style={[styles.stepDot, { backgroundColor: isActive ? colors.primary : colors.stepIdle }]} />}
              </View>
              {!isLast && <View style={[styles.stepLine, { backgroundColor: isDone ? colors.greenBright : colors.stepIdle }]} />}
            </View>
            <Text style={[styles.stepLabel, { color: isActive ? '#143263' : '#3a3e44' }]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );

  const paymentLabel = payment === 'gcash' ? 'GCash  ••••6789' : payment === 'maya' ? 'Maya' : 'Cash';
  const paymentIcon = (p: Payment, size = 24) =>
    p === 'gcash' ? (
      <Image source={images.gcash} style={{ width: 29, height: size }} resizeMode="contain" />
    ) : p === 'maya' ? (
      <Image source={images.maya} style={{ width: 56, height: 15 }} resizeMode="contain" />
    ) : (
      <Feather name="credit-card" size={size} color={colors.primary} />
    );

  /* ── Steps ── */
  const renderSelect = () => (
    <View style={styles.selectWrap}>
      <Text style={styles.stepCounter}>STEP 1 OF 2</Text>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: '52%' }]} /></View>
      <Text style={styles.selectHint}>Please Select One</Text>
      {PRODUCTS.map((p) => {
        const sel = product.id === p.id;
        return (
          <Pressable
            key={p.id}
            onPress={() => setProduct(p)}
            style={[styles.productRow, { backgroundColor: sel ? '#bee1f7' : '#fff', borderColor: sel ? colors.label : colors.primary }]}
          >
            <View style={styles.productRowLeft}>
              <Text style={styles.productRowSize}>{p.label}</Text>
              <Image source={cylinderFor(p.label)} style={{ width: 48, height: 60 }} resizeMode="contain" />
            </View>
            <Text style={styles.productRowDesc}>{p.desc}</Text>
          </Pressable>
        );
      })}
      <View style={styles.hair} />
      <View style={styles.qtyRow}>
        <Text style={styles.qtyLabel}>QUANTITY</Text>
        <View style={styles.qtyStepper}>
          <Pressable style={styles.qtyBtn} onPress={() => setQty(Math.max(1, qty - 1))}><Text style={styles.qtyBtnText}>−</Text></Pressable>
          <Text style={styles.qtyValue}>{qty}</Text>
          <Pressable style={styles.qtyBtn} onPress={() => setQty(qty + 1)}><Text style={styles.qtyBtnText}>+</Text></Pressable>
        </View>
      </View>
      <View style={styles.hair} />
      <View style={styles.costRow}><Text style={styles.costLabel}>ESTIMATED COST:</Text><Text style={styles.costValue}>₱{total.toLocaleString()}</Text></View>
      <View style={styles.costRow}><Text style={styles.costLabelSm}>ESTIMATED DELIVERY TIME:</Text><Text style={styles.costValueSm}>{product.eta}</Text></View>
      <View style={styles.hair} />
      <Pressable style={styles.cta} onPress={() => setStep('summary')}><Text style={styles.ctaText}>REVIEW ORDER</Text></Pressable>
    </View>
  );

  const summaryRow = (label: string, value: string, valueColor: string = colors.heading) => (
    <View style={styles.sumRow}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={[styles.sumValue, { color: valueColor }]}>{value}</Text>
    </View>
  );

  const renderSummary = () => (
    <View style={styles.summaryWrap}>
      <Text style={styles.stepCounter}>STEP 2 OF 2</Text>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: '100%' }]} /></View>

      <Text style={styles.sumSection}>Order Summary</Text>
      <View style={styles.sumProduct}>
        <Image source={cylinderFor(product.label)} style={{ width: 54, height: 81 }} resizeMode="contain" />
        <View>
          <Text style={styles.sumValue}>Selected Type: {product.label} - LPG</Text>
          <Text style={styles.sumValue}>Quantity: {qty}</Text>
        </View>
      </View>
      <View style={styles.hair} />

      <Text style={styles.sumSection}>Delivery Details</Text>
      {summaryRow('Name:', 'Juan Dela Cruz')}
      {summaryRow('Address:', address.address)}
      <Pressable style={{ alignSelf: 'flex-end' }} onPress={() => setModal('selectAddress')}>
        <Text style={styles.miniLink}>Select Address</Text>
      </Pressable>
      {summaryRow('Contact:', '09123456789')}
      <View style={styles.hair} />

      <Text style={styles.sumSection}>Payment Details</Text>
      <View style={styles.payRow}>
        <View style={styles.payLeft}>{paymentIcon(payment)}<Text style={styles.sumValue}>{paymentLabel}</Text></View>
        <Pressable onPress={() => { setTempPayment(payment); setModal('payment'); }}><Text style={styles.miniLink}>See all</Text></Pressable>
      </View>
      <View style={styles.hair} />

      <Text style={styles.sumSection}>Delivery Time</Text>
      {summaryRow('Estimated Delivery Time:', product.eta)}
      <View style={styles.hair} />

      <Text style={styles.sumSection}>Cost & Loyalty Rewards</Text>
      {summaryRow('Estimated Cost:', `₱ ${total.toLocaleString()}`)}
      {summaryRow('Loyalty Points:', '+50 pts', colors.greenBright)}
      <View style={styles.hair} />

      <Text style={styles.sumSection}>Schedule for Later</Text>
      <Pressable style={styles.schedInput} onPress={() => setModal('sched')}>
        <Text style={styles.schedPlaceholder}>Select date and time</Text>
        <Feather name="calendar" size={20} color={colors.muted} />
      </Pressable>
      <View style={styles.hair} />

      <Pressable style={styles.cta} onPress={() => setModal('confirmed')}><Text style={styles.ctaText}>PLACE ORDER</Text></Pressable>
    </View>
  );

  const renderTrack = () => {
    if (delivered) {
      return (
        <View style={{ paddingHorizontal: 24 }}>
          <View style={{ paddingVertical: 20 }}>{stepper(4)}</View>
          <Text style={styles.trackDone}>Delivery Complete!</Text>
          {summaryRow('Order Number:', 'LPG-12345')}
          {summaryRow('Time of Delivery:', '10:00 AM')}
          {summaryRow('Driver:', 'Mario')}
          <Pressable style={[styles.cta, { marginTop: 12 }]} onPress={() => setFeedback('rider')}><Text style={styles.ctaText}>SUBMIT FEEDBACK</Text></Pressable>
        </View>
      );
    }
    return (
      <View style={{ paddingHorizontal: 24 }}>
        <View style={styles.orderPillWrap}>
          <View style={styles.orderPill}><Text style={styles.orderPillText}>ORDER# 12345</Text></View>
        </View>
        <Text style={styles.etaBig}>{product.eta}</Text>
        <Text style={styles.trackStatus}>Superkalan Gaz - Metro Manila Branch is preparing your order.</Text>
        <View style={{ marginBottom: 12 }}>{stepper(2)}</View>
        <Text style={styles.trackNotify}>We'll notify you if your order is out for delivery.</Text>
        <View style={styles.riderRow}>
          <View style={styles.riderAvatar}><Feather name="user" size={16} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.riderName}>Mario Perez</Text>
            <Text style={styles.riderMeta}>Honda Click • ABC 1234</Text>
          </View>
          <View style={styles.riderRating}>
            <Ionicons name="star" size={15} color={colors.starYellow} />
            <Text style={styles.riderMeta}>4.8</Text>
          </View>
        </View>
        <Pressable style={styles.simBtn} onPress={() => setDelivered(true)}><Text style={styles.simBtnText}>Simulate Delivery</Text></Pressable>
      </View>
    );
  };

  /* ── Feedback ── */
  const stars = (value: number, onRate: (n: number) => void, color = colors.starYellow) => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onRate(n)} hitSlop={4}>
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={52} color={n <= value ? color : colors.cardBorder} />
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => (step === 'select' ? onNavigate('home', { tab: 'home' }) : step === 'summary' ? setStep('select') : setStep('summary'))}
          hitSlop={8}
        >
          <Feather name="chevron-left" size={24} color={colors.heading} />
        </Pressable>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {step === 'select' && renderSelect()}
        {step === 'summary' && renderSummary()}
        {step === 'track' && renderTrack()}
      </ScrollView>

      <Toast message={toast} />

      {/* Select Address */}
      <Modal visible={modal === 'selectAddress'} transparent animationType="fade" onRequestClose={() => setModal('none')}>
        <View style={styles.centerBackdrop}>
          <View style={styles.dialog}>
            <View style={styles.dialogHead}>
              <Text style={styles.dialogTitle}>Select Address</Text>
              <Pressable onPress={() => setModal('none')} hitSlop={8}><Feather name="x" size={20} color={colors.cardBorder} /></Pressable>
            </View>
            {ADDRESSES.map((a) => {
              const sel = address.id === a.id;
              return (
                <View key={a.id} style={styles.addrRow}>
                  <Pressable style={styles.addrLeft} onPress={() => setAddress(a)}>
                    <Ionicons name={sel ? 'radio-button-on' : 'radio-button-off'} size={18} color={sel ? colors.primary : colors.gray} />
                    <View>
                      <Text style={styles.addrLabel}>{a.label}</Text>
                      <Text style={styles.addrText}>{a.address}</Text>
                    </View>
                  </Pressable>
                  <Pressable onPress={() => { setEaLabel(a.label); setEaAddress(a.address); setEaContact('09123456789'); setModal('editAddress'); }}>
                    <Text style={styles.miniLink}>Change</Text>
                  </Pressable>
                </View>
              );
            })}
            <Pressable onPress={() => { setEaLabel(''); setEaAddress(''); setEaContact(''); setModal('editAddress'); }}>
              <Text style={styles.addNew}>+  Add New Address</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Edit Address */}
      <Modal visible={modal === 'editAddress'} transparent animationType="fade" onRequestClose={() => setModal('selectAddress')}>
        <View style={styles.centerBackdrop}>
          <View style={styles.dialog}>
            <View style={styles.dialogHead}>
              <Text style={styles.dialogTitle}>Edit Address</Text>
              <Pressable onPress={() => setModal('selectAddress')} hitSlop={8}><Feather name="x" size={20} color={colors.cardBorder} /></Pressable>
            </View>
            {[
              { label: 'Label Address', value: eaLabel, set: setEaLabel, ph: 'House 1' },
              { label: 'Address', value: eaAddress, set: setEaAddress, ph: '123 Main St., Metro Manila' },
              { label: 'Contact Number', value: eaContact, set: setEaContact, ph: '09123456789' },
            ].map((f) => (
              <View key={f.label} style={{ marginBottom: 12 }}>
                <Text style={styles.eaLabel}>{f.label}</Text>
                <TextInput style={styles.eaInput} value={f.value} onChangeText={f.set} placeholder={f.ph} placeholderTextColor={colors.muted} />
              </View>
            ))}
            <Pressable style={[styles.cta, { alignSelf: 'center', width: '90%', marginTop: 4 }]} onPress={() => { setModal('none'); showToast('All changes are saved!'); }}>
              <Text style={styles.ctaText}>SAVE CHANGES</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Payment Method */}
      <Modal visible={modal === 'payment'} transparent animationType="slide" onRequestClose={() => setModal('none')}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setModal('none')} />
        <View style={styles.bottomSheet}>
          <View style={styles.dialogHead}>
            <Text style={styles.sheetTitle}>Select Payment Method</Text>
            <Pressable onPress={() => setModal('none')} hitSlop={8}><Feather name="x" size={16} color={colors.gray} /></Pressable>
          </View>
          {(['gcash', 'maya', 'cash'] as Payment[]).map((p) => (
            <Pressable key={p} style={styles.payOption} onPress={() => setTempPayment(p)}>
              <View style={styles.payOptionIcon}>{paymentIcon(p)}</View>
              <Text style={[styles.sumValue, { flex: 1 }]}>{p === 'gcash' ? 'GCash •••• 6789' : p === 'maya' ? 'Maya' : 'Cash'}</Text>
              <Ionicons name={tempPayment === p ? 'radio-button-on' : 'radio-button-off'} size={18} color={tempPayment === p ? colors.primary : colors.gray} />
            </Pressable>
          ))}
          <Pressable style={[styles.cta, { marginTop: 16 }]} onPress={() => { setPayment(tempPayment); setModal('none'); showToast('Payment Method Successfully Changed'); }}>
            <Text style={styles.ctaText}>SAVE CHANGES</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Schedule (simplified) */}
      <Modal visible={modal === 'sched'} transparent animationType="fade" onRequestClose={() => setModal('none')}>
        <View style={styles.centerBackdrop}>
          <View style={styles.dialog}>
            <View style={styles.dialogHead}>
              <Text style={styles.dialogTitle}>Schedule for Later</Text>
              <Pressable onPress={() => setModal('none')} hitSlop={8}><Feather name="x" size={20} color={colors.gray} /></Pressable>
            </View>
            <Text style={styles.metaText}>When do you want your order to be delivered?</Text>
            <View style={styles.calendarBox}>
              <Text style={styles.calMonth}>March 2024</Text>
              <View style={styles.calGrid}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <Text key={i} style={styles.calDayHead}>{d}</Text>
                ))}
                {Array.from({ length: 31 }).map((_, i) => (
                  <View key={i} style={styles.calCell}><Text style={styles.calDay}>{i + 1}</Text></View>
                ))}
              </View>
            </View>
            <Pressable style={[styles.cta, { marginTop: 12 }]} onPress={() => { setModal('none'); showToast('Scheduled for later'); }}>
              <Text style={styles.ctaText}>CONFIRM</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Order Confirmed */}
      <Modal visible={modal === 'confirmed'} transparent animationType="fade" onRequestClose={() => setModal('none')}>
        <View style={styles.centerBackdrop}>
          <View style={styles.confirmDialog}>
            <Pressable style={styles.confirmClose} onPress={() => setModal('none')} hitSlop={8}><Feather name="x" size={22} color={colors.grayText} /></Pressable>
            <View style={styles.confirmCircle}><Feather name="check" size={56} color="#fff" /></View>
            <Text style={styles.confirmTitle}>Order Confirmed!</Text>
            <Text style={styles.confirmBody}>
              Order# 12345 is confirmed at 11:30 AM{'\n'}Branch: Superkalan Gaz - Metro Manila{'\n'}Contact Number: 09171234567
            </Text>
            <Pressable style={[styles.cta, { width: '80%' }]} onPress={() => { setModal('none'); setStep('track'); }}>
              <Text style={styles.ctaText}>SEE ORDER RECEIPT</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Feedback */}
      <Modal visible={feedback !== 'none'} transparent animationType={feedback === 'xfeedback' ? 'fade' : 'slide'} onRequestClose={() => setFeedback('none')}>
        {feedback === 'xfeedback' ? (
          <View style={styles.centerBackdrop}>
            <View style={styles.xfeedbackCard}>
              <Image source={images.mascotSad} style={styles.xfeedbackMascot} resizeMode="contain" />
              <Pressable style={styles.confirmClose} onPress={() => setFeedback('none')} hitSlop={8}><Feather name="x" size={22} color={colors.grayText} /></Pressable>
              <Text style={styles.xfeedbackTitle}>Not in the mood?</Text>
              <Text style={styles.xfeedbackBody}>
                You can still rate our services and rider within 24 hours since your last order.{'\n\n'}If the time is reached, your reward points won't be added to your account.
              </Text>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.sheetBackdrop} />
            <View style={styles.feedbackSheet}>
              <Pressable style={styles.confirmClose} onPress={() => setFeedback('xfeedback')} hitSlop={8}><Feather name="x" size={16} color={colors.gray} /></Pressable>
              <View style={styles.progressRow}>
                <View style={styles.pdot} />
                <View style={styles.pdash} />
                <View style={[styles.pdot, feedback === 'rider' && { backgroundColor: colors.cardBorder }]} />
              </View>
              {feedback === 'rider' && (
                <View style={styles.fbAvatarWrap}><View style={styles.fbAvatar}><Feather name="user" size={52} color="#fff" /></View></View>
              )}
              <Text style={styles.fbTitle}>How was your experience?</Text>
              <Text style={styles.fbSub}>
                {feedback === 'rider' ? 'Help us improve your delivery experience by rating your rider.' : 'Help us improve your delivery experience by rating our branch.'}
              </Text>
              {feedback === 'rider' ? stars(riderRating, setRiderRating) : stars(storeRating, setStoreRating)}
              {feedback === 'store' && (
                <TextInput style={styles.commentBox} placeholder="Write your thoughts..." placeholderTextColor={colors.muted} multiline value={feedbackText} onChangeText={setFeedbackText} />
              )}
              <Pressable
                style={[styles.cta, { marginTop: 16 }]}
                onPress={() => {
                  if (feedback === 'rider') setFeedback('store');
                  else { setFeedback('none'); showToast('Thank you for your feedback!'); }
                }}
              >
                <Text style={styles.ctaText}>{feedback === 'rider' ? 'Next' : 'Submit Feedback'}</Text>
              </Pressable>
            </View>
          </>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.bold, fontSize: 24, color: colors.heading },

  stepCounter: { fontFamily: fonts.semibold, fontSize: 9, color: colors.gray, marginBottom: 4 },
  progressTrack: { height: 11, borderRadius: radii.card, backgroundColor: colors.cardBorder, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radii.card, backgroundColor: colors.primary },

  selectWrap: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  selectHint: { fontFamily: fonts.medium, fontSize: 13, color: colors.heading },
  productRow: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.card, borderWidth: 2, overflow: 'hidden', minHeight: 74, ...cardShadow },
  productRowLeft: { width: 104, paddingLeft: 10, paddingVertical: 6, alignSelf: 'stretch', justifyContent: 'space-between' },
  productRowSize: { fontFamily: fonts.semibold, fontSize: 13, color: colors.heading },
  productRowDesc: { flex: 1, paddingRight: 8, fontFamily: fonts.light, fontSize: 8, color: colors.heading, textAlign: 'center', lineHeight: 12 },
  hair: { height: 1, backgroundColor: colors.cardBorder, marginVertical: 8 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.heading },
  qtyStepper: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.card, backgroundColor: colors.primary, height: 29, width: 95 },
  qtyBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { color: '#fff', fontFamily: fonts.semibold, fontSize: 18 },
  qtyValue: { flex: 1, textAlign: 'center', color: '#fff', fontFamily: fonts.semibold, fontSize: 16 },
  costRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  costLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.heading },
  costValue: { fontFamily: fonts.medium, fontSize: 15, color: colors.heading },
  costLabelSm: { fontFamily: fonts.semibold, fontSize: 13, color: colors.heading },
  costValueSm: { fontFamily: fonts.medium, fontSize: 12, color: colors.heading },
  cta: { backgroundColor: colors.primary, borderRadius: radii.button, height: 40, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: fonts.bold, fontSize: 12, color: '#fff' },

  summaryWrap: { paddingHorizontal: 16, paddingTop: 8 },
  sumSection: { fontFamily: fonts.semibold, fontSize: 16, color: colors.label, marginBottom: 12, marginTop: 4 },
  sumProduct: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sumLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.heading },
  sumValue: { fontFamily: fonts.medium, fontSize: 13, color: colors.heading, flexShrink: 1, textAlign: 'right' },
  miniLink: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary, textDecorationLine: 'underline' },
  payRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  payLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  schedInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 32, borderRadius: radii.chip, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 12 },
  schedPlaceholder: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },

  orderPillWrap: { alignItems: 'center', paddingTop: 8, marginBottom: 12 },
  orderPill: { backgroundColor: 'rgba(0,123,193,0.2)', borderRadius: radii.card, paddingHorizontal: 12, paddingVertical: 4 },
  orderPillText: { fontFamily: fonts.medium, fontSize: 14, color: colors.primary },
  etaBig: { fontFamily: fonts.bold, fontSize: 24, color: colors.primary, marginBottom: 8 },
  trackStatus: { fontFamily: fonts.medium, fontSize: 14, color: colors.grayText, marginBottom: 20 },
  trackNotify: { fontFamily: fonts.regular, fontSize: 14, color: colors.grayText, marginBottom: 12 },
  trackDone: { fontFamily: fonts.semibold, fontSize: 20, color: colors.heading, textAlign: 'center', marginBottom: 16 },
  riderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  riderAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.avatarGray, alignItems: 'center', justifyContent: 'center' },
  riderName: { fontFamily: fonts.medium, fontSize: 14, color: colors.label },
  riderMeta: { fontFamily: fonts.regular, fontSize: 14, color: colors.grayText },
  riderRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  simBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: radii.button, height: 32, alignItems: 'center', justifyContent: 'center' },
  simBtnText: { fontFamily: fonts.medium, fontSize: 11, color: colors.primary },

  stepper: { flexDirection: 'row', alignItems: 'flex-start' },
  stepCol: {},
  stepRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  stepNode: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepDot: { width: 12, height: 12, borderRadius: 6 },
  stepLine: { flex: 1, height: 1 },
  stepLabel: { paddingTop: 6, fontFamily: fonts.semibold, fontSize: 11 },

  centerBackdrop: { flex: 1, backgroundColor: 'rgba(30,30,30,0.3)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  dialog: { width: '100%', maxWidth: 358, backgroundColor: '#fff', borderRadius: radii.card, padding: 20, ...cardShadow },
  dialogHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  dialogTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.label },
  metaText: { fontFamily: fonts.regular, fontSize: 11, color: colors.gray, marginBottom: 12 },
  addrRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  addrLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  addrLabel: { fontFamily: fonts.regular, fontSize: 15, color: '#1e1e1e' },
  addrText: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray },
  addNew: { fontFamily: fonts.semibold, fontSize: 11, color: colors.primary, textAlign: 'center', paddingTop: 4 },
  eaLabel: { fontFamily: fonts.medium, fontSize: 10, color: colors.primary, marginBottom: 4 },
  eaInput: { height: 30, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.chip, paddingHorizontal: 8, fontFamily: fonts.regular, fontSize: 12, color: colors.grayText },

  calendarBox: { backgroundColor: colors.redeemPale, borderRadius: 8, padding: 12, marginBottom: 4 },
  calMonth: { fontFamily: fonts.semibold, fontSize: 13, color: colors.heading, textAlign: 'center', marginBottom: 8 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDayHead: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 10, color: colors.muted, marginBottom: 4 },
  calCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  calDay: { fontFamily: fonts.regular, fontSize: 12, color: colors.heading },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  bottomSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
  sheetTitle: { fontFamily: fonts.semibold, fontSize: 20, color: colors.heading },
  payOption: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12 },
  payOptionIcon: { width: 56, alignItems: 'center' },

  confirmDialog: { width: '100%', maxWidth: 338, backgroundColor: '#fff', borderRadius: radii.card, paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center', gap: 8 },
  confirmClose: { position: 'absolute', top: 12, right: 12, zIndex: 2 },
  confirmCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  confirmTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.primary },
  confirmBody: { fontFamily: fonts.regular, fontSize: 11, color: colors.primary, textAlign: 'center', lineHeight: 18, marginBottom: 8 },

  xfeedbackCard: { width: '100%', maxWidth: 338, backgroundColor: '#fff', borderRadius: radii.card, paddingBottom: 24, paddingTop: 60, paddingHorizontal: 16, alignItems: 'center' },
  xfeedbackMascot: { position: 'absolute', top: -60, width: 119, height: 120 },
  xfeedbackTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.primary, marginBottom: 8 },
  xfeedbackBody: { fontFamily: fonts.semibold, fontSize: 10, color: colors.primary, textAlign: 'center', lineHeight: 16 },

  feedbackSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16, paddingRight: 40 },
  pdot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.muted },
  pdash: { flex: 1, height: 1, backgroundColor: colors.muted },
  fbAvatarWrap: { alignItems: 'center', marginBottom: 12 },
  fbAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.avatarGray, alignItems: 'center', justifyContent: 'center' },
  fbTitle: { fontFamily: fonts.semibold, fontSize: 20, color: colors.heading, marginBottom: 4 },
  fbSub: { fontFamily: fonts.regular, fontSize: 15, color: colors.grayText, marginBottom: 16 },
  starsRow: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: 8 },
  commentBox: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.chip, padding: 12, height: 100, fontFamily: fonts.regular, fontSize: 15, color: colors.label, textAlignVertical: 'top', marginTop: 16 },
});
