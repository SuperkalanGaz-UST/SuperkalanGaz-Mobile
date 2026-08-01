import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { cardShadow, radii } from '@/theme/metrics';
import { cylinderFor, images } from '@/lib/assets';
import { PrimaryButton } from '@/components/ui/controls';
import { Toast } from '@/components/ui/overlays';
import { CylinderSize, formatPeso, usePricing } from '@/contexts/PricingContext';
import type { MainScreen, MainTab } from '@/navigation/types';

/**
 * Order flow (Figma "OrderProcess"): product select → delivery timing → review
 * → track. Includes address / schedule / payment sheets, the confirm dialog,
 * and post-delivery feedback. Maps to the SRD module; `order_source = Mobile App`
 * is implied.
 *
 * Pricing comes from the shared SRD catalog. ETA and tracking remain Figma mock
 * data until their SRD endpoints are wired. Never show live rider GPS.
 */
type Step = 'select' | 'schedule' | 'summary' | 'track';
type ModalKind = 'none' | 'selectAddress' | 'editAddress' | 'confirmed' | 'sched' | 'payment';
type Payment = 'gcash' | 'maya' | 'cash';
type FeedbackStep = 'none' | 'rider' | 'store' | 'xfeedback';
type DeliverySchedule = 'now' | 'later';

const PRODUCT_DETAILS: Array<{ id: CylinderSize; label: string; eta: string; use: string }> = [
  { id: '2.7kg', label: '2.7 KG', eta: '12:00 - 12:05 PM', use: 'Portable • Outdoor use' },
  { id: '5kg', label: '5 KG', eta: '12:00 - 12:10 PM', use: 'Compact • Small households' },
  { id: '11kg', label: '11 KG', eta: '12:00 - 12:05 PM', use: 'Standard • Everyday home use' },
  { id: '22kg', label: '22 KG', eta: '12:15 - 12:30 PM', use: 'Commercial • Food businesses' },
  { id: '50kg', label: '50 KG', eta: '12:30 - 1:00 PM', use: 'Heavy-duty • Large establishments' },
];
const ADDRESSES = [
  { id: 'house1', label: 'House 1', address: '123 Main St, Metro Manila' },
  { id: 'office', label: 'Office', address: '246 Main Road, Salcedo Makati' },
  { id: 'house2', label: 'House 2', address: '810 Main Alley, Las Pinas' },
];
const STEP_LABELS = ['Order Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];
const CALENDAR_WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CALENDAR_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DELIVERY_TIME_OPTIONS = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM'];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getMinimumScheduleDate() {
  const tomorrow = startOfDay(new Date());
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function buildCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = Array.from({ length: firstDay }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatScheduleDate(date: Date) {
  return `${CALENDAR_MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function OrderProcessScreen({ onNavigate }: { onNavigate: (screen: MainScreen, opts?: { tab?: MainTab }) => void }) {
  const insets = useSafeAreaInsets();
  const { prices, loading: pricesLoading, error: pricesError, refresh: refreshPrices } = usePricing();
  const products = useMemo(
    () => PRODUCT_DETAILS.flatMap((product) => {
      const price = prices[product.id];
      return price === undefined ? [] : [{ ...product, price }];
    }),
    [prices],
  );
  const [step, setStep] = useState<Step>('select');
  const [modal, setModal] = useState<ModalKind>('none');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [address, setAddress] = useState(ADDRESSES[0]);
  const [payment, setPayment] = useState<Payment>('gcash');
  const [tempPayment, setTempPayment] = useState<Payment>('gcash');
  const [delivered, setDelivered] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackStep>('none');
  const [riderRating, setRiderRating] = useState(0);
  const [storeRating, setStoreRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [toast, setToast] = useState('');
  const [deliverySchedule, setDeliverySchedule] = useState<DeliverySchedule | null>(null);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [scheduledTime, setScheduledTime] = useState('');
  const [draftScheduleDate, setDraftScheduleDate] = useState<Date | null>(null);
  const [draftScheduleTime, setDraftScheduleTime] = useState(DELIVERY_TIME_OPTIONS[1]);
  const [visibleScheduleMonth, setVisibleScheduleMonth] = useState(() => startOfMonth(getMinimumScheduleDate()));

  // edit-address form
  const [eaLabel, setEaLabel] = useState('');
  const [eaAddress, setEaAddress] = useState('');
  const [eaContact, setEaContact] = useState('');

  const selectedProducts = products
    .map((selectedProduct) => ({
      product: selectedProduct,
      quantity: quantities[selectedProduct.id] ?? 0,
    }))
    .filter(({ quantity }) => quantity > 0);
  const total = selectedProducts.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const totalQty = selectedProducts.reduce((sum, item) => sum + item.quantity, 0);
  const typeCount = selectedProducts.length;
  const estimatedEta = selectedProducts[selectedProducts.length - 1]?.product.eta;
  const estimatedEtaLabel = estimatedEta ?? '—';
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };
  const headerTitle = step === 'track' ? 'Track my Order' : 'Request an Order';
  const scheduledLabel = scheduledDate && scheduledTime
    ? `${formatScheduleDate(scheduledDate)} • ${scheduledTime}`
    : '';
  const minimumScheduleDate = getMinimumScheduleDate();
  const minimumScheduleMonth = startOfMonth(minimumScheduleDate);
  const calendarDays = buildCalendarDays(visibleScheduleMonth);
  const canViewPreviousMonth = visibleScheduleMonth.getTime() > minimumScheduleMonth.getTime();
  const canContinueFromSchedule = deliverySchedule === 'now'
    || (deliverySchedule === 'later' && Boolean(scheduledLabel));

  const changeProductQuantity = (productId: string, amount: number) => {
    setQuantities((current) => ({
      ...current,
      [productId]: Math.max(0, (current[productId] ?? 0) + amount),
    }));
  };

  const openScheduleModal = () => {
    const initialDate = scheduledDate ? startOfDay(scheduledDate) : null;
    setDeliverySchedule('later');
    setDraftScheduleDate(initialDate);
    setDraftScheduleTime(scheduledTime || DELIVERY_TIME_OPTIONS[1]);
    setVisibleScheduleMonth(startOfMonth(initialDate ?? minimumScheduleDate));
    setModal('sched');
  };

  const changeScheduleMonth = (offset: number) => {
    setVisibleScheduleMonth((current) => {
      const next = new Date(current.getFullYear(), current.getMonth() + offset, 1);
      return next.getTime() < minimumScheduleMonth.getTime() ? current : next;
    });
  };

  const confirmSchedule = () => {
    if (!draftScheduleDate) return;
    setDeliverySchedule('later');
    setScheduledDate(draftScheduleDate);
    setScheduledTime(draftScheduleTime);
    setModal('none');
    showToast(`Scheduled for ${formatScheduleDate(draftScheduleDate)} at ${draftScheduleTime}`);
  };

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
    <View style={styles.selectScreen}>
      <ScrollView
        style={styles.selectScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.selectContent}
      >
        <Text style={styles.stepCounter}>STEP 1 OF 3</Text>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: '34%' }]} /></View>
        <Text style={styles.selectTitle}>Build your order</Text>
        <Text style={styles.selectSubtitle}>Add one or more cylinder sizes.</Text>

        <View style={styles.productList}>
          {pricesLoading && <ActivityIndicator color={colors.primary} style={styles.catalogLoading} />}
          {!pricesLoading && pricesError && (
            <Pressable accessibilityRole="button" onPress={() => void refreshPrices()} style={styles.catalogError}>
              <Text style={styles.catalogErrorText}>{pricesError}</Text>
              <Text style={styles.catalogRetry}>Tap to try again</Text>
            </Pressable>
          )}
          {products.map((product) => {
            const quantity = quantities[product.id] ?? 0;
            const selected = quantity > 0;
            const rowContent = (
              <>
                <View style={styles.productArtWrap}>
                  <Image
                    source={cylinderFor(product.label)}
                    style={styles.productArt}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.productCopy}>
                  <Text style={styles.productRowSize}>{product.label}</Text>
                  <Text style={styles.productRowDesc}>{product.use}</Text>
                  <Text style={styles.productRowPrice}>{formatPeso(product.price)}</Text>
                </View>

                {selected ? (
                  <View style={styles.productStepper}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove one ${product.label} cylinder`}
                      hitSlop={4}
                      onPress={() => changeProductQuantity(product.id, -1)}
                      style={({ pressed }) => [
                        styles.productQtyButton,
                        pressed ? styles.controlPressed : null,
                      ]}
                    >
                      <Feather name="minus" size={18} color={colors.heading} />
                    </Pressable>
                    <Text style={styles.productQtyValue}>{quantity}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Add one ${product.label} cylinder`}
                      hitSlop={4}
                      onPress={() => changeProductQuantity(product.id, 1)}
                      style={({ pressed }) => [
                        styles.productQtyButton,
                        pressed ? styles.controlPressed : null,
                      ]}
                    >
                      <Feather name="plus" size={18} color={colors.heading} />
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.addProductButton} pointerEvents="none">
                    <Feather name="plus" size={20} color={colors.primary} />
                    <Text style={styles.addProductText}>Add</Text>
                  </View>
                )}
              </>
            );

            if (selected) {
              return (
                <View
                  key={product.id}
                  style={[styles.productRow, styles.productRowSelected]}
                >
                  {rowContent}
                </View>
              );
            }

            return (
              <Pressable
                key={product.id}
                accessibilityRole="button"
                accessibilityLabel={`Select ${product.label} cylinder`}
                accessibilityHint="Adds one cylinder to your order"
                onPress={() => changeProductQuantity(product.id, 1)}
                style={({ pressed }) => [
                  styles.productRow,
                  pressed ? styles.controlPressed : null,
                ]}
              >
                {rowContent}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.selectSummary, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.selectSummaryCount}>
          <Text style={styles.selectSummaryTotal}>
            {totalQty} {totalQty === 1 ? 'cylinder' : 'cylinders'}
          </Text>
          <Text style={styles.selectSummaryTypes}>
            {typeCount} {typeCount === 1 ? 'type' : 'types'}
          </Text>
        </View>
        <View style={styles.selectSummaryDivider} />
        <View style={styles.selectSummaryCost}>
          <Text style={styles.selectSummaryLabel}>Estimated cost</Text>
          <Text style={styles.selectSummaryValue}>₱{total.toLocaleString()}</Text>
        </View>
        <PrimaryButton
          label="Review order"
          disabled={totalQty === 0 || pricesLoading || Boolean(pricesError)}
          onPress={() => setStep('schedule')}
        />
      </View>
    </View>
  );

  const summaryRow = (label: string, value: string, valueColor: string = colors.heading) => (
    <View style={styles.sumRow}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={[styles.sumValue, { color: valueColor }]}>{value}</Text>
    </View>
  );

  const renderSchedule = () => (
    <View style={styles.scheduleStepWrap}>
      <Text style={styles.stepCounter}>STEP 2 OF 3</Text>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: '67%' }]} /></View>

      <Text style={styles.scheduleStepTitle}>When should we deliver?</Text>
      <Text style={styles.scheduleStepSubtitle}>Choose a delivery option before reviewing your order.</Text>

      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: deliverySchedule === 'now' }}
        onPress={() => setDeliverySchedule('now')}
        style={[styles.deliveryChoice, deliverySchedule === 'now' ? styles.deliveryChoiceSelected : null]}
      >
        <View style={styles.deliveryChoiceTop}>
          <View style={[styles.deliveryChoiceIcon, deliverySchedule === 'now' ? styles.deliveryChoiceIconSelected : null]}>
            <Feather name="zap" size={22} color={deliverySchedule === 'now' ? '#fff' : colors.primary} />
          </View>
          <View style={styles.deliveryChoiceCopy}>
            <Text style={styles.deliveryChoiceTitle}>Deliver now</Text>
            <Text style={styles.deliveryChoiceDescription}>Same-day delivery from your selected branch.</Text>
          </View>
          <Ionicons
            name={deliverySchedule === 'now' ? 'radio-button-on' : 'radio-button-off'}
            size={21}
            color={deliverySchedule === 'now' ? colors.primary : colors.muted}
          />
        </View>
        <View style={styles.deliveryChoiceMeta}>
          <Feather name="clock" size={15} color={colors.primary} />
          <Text style={styles.deliveryChoiceMetaText}>Estimated arrival: {estimatedEtaLabel}</Text>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: deliverySchedule === 'later' }}
        onPress={openScheduleModal}
        style={[styles.deliveryChoice, deliverySchedule === 'later' ? styles.deliveryChoiceSelected : null]}
      >
        <View style={styles.deliveryChoiceTop}>
          <View style={[styles.deliveryChoiceIcon, deliverySchedule === 'later' ? styles.deliveryChoiceIconSelected : null]}>
            <Feather name="calendar" size={21} color={deliverySchedule === 'later' ? '#fff' : colors.primary} />
          </View>
          <View style={styles.deliveryChoiceCopy}>
            <Text style={styles.deliveryChoiceTitle}>Schedule for later</Text>
            <Text style={styles.deliveryChoiceDescription}>Choose a future delivery date and time.</Text>
          </View>
          <Ionicons
            name={deliverySchedule === 'later' ? 'radio-button-on' : 'radio-button-off'}
            size={21}
            color={deliverySchedule === 'later' ? colors.primary : colors.muted}
          />
        </View>
        <View style={styles.deliveryChoiceMeta}>
          <Feather name={scheduledLabel ? 'check-circle' : 'calendar'} size={15} color={scheduledLabel ? colors.greenBright : colors.primary} />
          <Text style={[styles.deliveryChoiceMetaText, scheduledLabel ? styles.deliveryChoiceScheduledText : null]}>
            {scheduledLabel || 'Tap to select date and time'}
          </Text>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canContinueFromSchedule }}
        disabled={!canContinueFromSchedule}
        style={[styles.cta, styles.scheduleStepCta, !canContinueFromSchedule ? styles.ctaDisabled : null]}
        onPress={() => setStep('summary')}
      >
        <Text style={styles.ctaText}>REVIEW ORDER</Text>
      </Pressable>
    </View>
  );

  const renderSummary = () => (
    <View style={styles.summaryWrap}>
      <Text style={styles.stepCounter}>STEP 3 OF 3</Text>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: '100%' }]} /></View>

      <Text style={styles.sumSection}>Order Summary</Text>
      <View style={styles.sumProducts}>
        {selectedProducts.map(({ product: selectedProduct, quantity }) => (
          <View key={selectedProduct.id} style={styles.sumProduct}>
            <Image
              source={cylinderFor(selectedProduct.label)}
              style={styles.sumProductImage}
              resizeMode="contain"
            />
            <View style={styles.sumProductCopy}>
              <Text style={styles.sumProductName}>{selectedProduct.label} LPG</Text>
              <Text style={styles.sumProductMeta}>
                Quantity: {quantity} • ₱{(selectedProduct.price * quantity).toLocaleString()}
              </Text>
            </View>
          </View>
        ))}
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

      <View style={styles.sumSectionRow}>
        <Text style={[styles.sumSection, styles.sumSectionInRow]}>Delivery Time</Text>
        <Pressable accessibilityRole="button" onPress={() => setStep('schedule')}>
          <Text style={styles.miniLink}>Edit</Text>
        </Pressable>
      </View>
      {deliverySchedule === 'later'
        ? (
          <>
            {summaryRow('Delivery option:', 'Schedule for later')}
            {summaryRow('Scheduled delivery:', scheduledLabel)}
          </>
        )
        : (
          <>
            {summaryRow('Delivery option:', 'Deliver now')}
            {summaryRow('Estimated delivery time:', estimatedEtaLabel)}
          </>
        )}
      <View style={styles.hair} />

      <Text style={styles.sumSection}>Cost & Loyalty Rewards</Text>
      {summaryRow('Estimated Cost:', `₱ ${total.toLocaleString()}`)}
      {summaryRow('Loyalty Points:', '+50 pts', colors.greenBright)}
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
        <Text style={styles.etaBig}>{estimatedEtaLabel}</Text>
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
          onPress={() => {
            if (step === 'select') onNavigate('home', { tab: 'home' });
            else if (step === 'schedule') setStep('select');
            else if (step === 'summary') setStep('schedule');
            else setStep('summary');
          }}
          hitSlop={8}
        >
          <Feather name="chevron-left" size={24} color={colors.heading} />
        </Pressable>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={{ width: 24 }} />
      </View>

      {step === 'select' ? (
        renderSelect()
      ) : (
        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {step === 'schedule' && renderSchedule()}
          {step === 'summary' && renderSummary()}
          {step === 'track' && renderTrack()}
        </ScrollView>
      )}

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

      {/* Schedule */}
      <Modal visible={modal === 'sched'} transparent animationType="fade" onRequestClose={() => setModal('none')}>
        <View style={styles.centerBackdrop}>
          <View style={[styles.dialog, styles.scheduleDialog]}>
            <View style={styles.dialogHead}>
              <Text style={styles.dialogTitle}>Schedule for Later</Text>
              <Pressable onPress={() => setModal('none')} hitSlop={8}><Feather name="x" size={20} color={colors.gray} /></Pressable>
            </View>
            <Text style={styles.metaText}>When do you want your order to be delivered?</Text>
            <View style={styles.calendarBox}>
              <View style={styles.calHeader}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                  accessibilityState={{ disabled: !canViewPreviousMonth }}
                  disabled={!canViewPreviousMonth}
                  hitSlop={6}
                  onPress={() => changeScheduleMonth(-1)}
                  style={[styles.calNavButton, !canViewPreviousMonth ? styles.calNavButtonDisabled : null]}
                >
                  <Feather name="chevron-left" size={18} color={canViewPreviousMonth ? colors.heading : colors.muted} />
                </Pressable>
                <Text style={styles.calMonth}>
                  {CALENDAR_MONTHS[visibleScheduleMonth.getMonth()]} {visibleScheduleMonth.getFullYear()}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                  hitSlop={6}
                  onPress={() => changeScheduleMonth(1)}
                  style={styles.calNavButton}
                >
                  <Feather name="chevron-right" size={18} color={colors.heading} />
                </Pressable>
              </View>
              <View style={styles.calGrid}>
                {CALENDAR_WEEKDAYS.map((d, i) => (
                  <Text key={i} style={styles.calDayHead}>{d}</Text>
                ))}
                {calendarDays.map((date, index) => {
                  if (!date) return <View key={`empty-${index}`} style={styles.calCell} />;

                  const disabled = date.getTime() < minimumScheduleDate.getTime();
                  const selected = draftScheduleDate ? isSameDay(date, draftScheduleDate) : false;
                  return (
                    <Pressable
                      key={date.toISOString()}
                      accessibilityRole="button"
                      accessibilityLabel={formatScheduleDate(date)}
                      accessibilityState={{ disabled, selected }}
                      disabled={disabled}
                      onPress={() => setDraftScheduleDate(date)}
                      style={styles.calCell}
                    >
                      <View style={[styles.calDayCircle, selected ? styles.calDayCircleSelected : null]}>
                        <Text
                          style={[
                            styles.calDay,
                            disabled ? styles.calDayDisabled : null,
                            selected ? styles.calDaySelected : null,
                          ]}
                        >
                          {date.getDate()}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Text style={styles.scheduleTimeLabel}>Delivery time</Text>
            <View style={styles.scheduleTimeGrid}>
              {DELIVERY_TIME_OPTIONS.map((time) => {
                const selected = draftScheduleTime === time;
                return (
                  <Pressable
                    key={time}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setDraftScheduleTime(time)}
                    style={[styles.scheduleTimeOption, selected ? styles.scheduleTimeOptionSelected : null]}
                  >
                    <Text style={[styles.scheduleTimeText, selected ? styles.scheduleTimeTextSelected : null]}>
                      {time}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !draftScheduleDate }}
              disabled={!draftScheduleDate}
              style={[styles.cta, styles.scheduleConfirm, !draftScheduleDate ? styles.ctaDisabled : null]}
              onPress={confirmSchedule}
            >
              <Text style={styles.ctaText}>{draftScheduleDate ? 'CONFIRM SCHEDULE' : 'SELECT A DATE'}</Text>
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
              {deliverySchedule === 'later' && scheduledLabel
                ? `\nScheduled Delivery: ${scheduledLabel}`
                : `\nEstimated Delivery: ${estimatedEtaLabel}`}
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
  progressTrack: { height: 4, borderRadius: radii.card, backgroundColor: colors.cardBorder, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radii.card, backgroundColor: colors.primary },

  selectScreen: { flex: 1, backgroundColor: colors.surface },
  selectScroll: { flex: 1 },
  selectContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  selectTitle: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 32, color: colors.heading, marginTop: 24 },
  selectSubtitle: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.grayText, marginTop: 2 },
  productList: { marginTop: 18 },
  productRow: {
    minHeight: 104,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  productRowSelected: { backgroundColor: colors.primaryTint },
  productArtWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  productArt: { width: 76, height: 88 },
  productCopy: { flex: 1, paddingRight: 8 },
  productRowSize: { fontFamily: fonts.semibold, fontSize: 20, color: colors.heading },
  productRowDesc: { marginTop: 2, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.grayText },
  productRowPrice: { marginTop: 3, fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  catalogLoading: { paddingVertical: 28 },
  catalogError: { alignItems: 'center', borderRadius: radii.card, backgroundColor: '#FEF2F2', padding: 20 },
  catalogErrorText: { textAlign: 'center', fontFamily: fonts.medium, fontSize: 13, color: '#B42318' },
  catalogRetry: { marginTop: 6, fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  addProductButton: { minWidth: 66, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  addProductText: { fontFamily: fonts.medium, fontSize: 14, color: colors.primary },
  productStepper: { width: 136, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productQtyButton: { width: 44, height: 44, borderRadius: radii.card, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  productQtyValue: { minWidth: 32, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 16, color: colors.heading },
  controlPressed: { opacity: 0.7 },
  selectSummary: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
  },
  selectSummaryCount: { flexDirection: 'row', alignItems: 'baseline', gap: 16 },
  selectSummaryTotal: { fontFamily: fonts.semibold, fontSize: 20, color: colors.heading },
  selectSummaryTypes: { fontFamily: fonts.regular, fontSize: 13, color: colors.grayText },
  selectSummaryDivider: { height: 1, backgroundColor: colors.border },
  selectSummaryCost: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectSummaryLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.heading },
  selectSummaryValue: { fontFamily: fonts.semibold, fontSize: 20, color: colors.heading },
  hair: { height: 1, backgroundColor: colors.cardBorder, marginVertical: 8 },
  cta: { backgroundColor: colors.primary, borderRadius: radii.button, height: 40, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: fonts.bold, fontSize: 12, color: '#fff' },

  scheduleStepWrap: { paddingHorizontal: 16, paddingTop: 8 },
  scheduleStepTitle: { fontFamily: fonts.semibold, fontSize: 20, color: colors.heading, marginTop: 24, marginBottom: 4 },
  scheduleStepSubtitle: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.grayText, marginBottom: 20 },
  deliveryChoice: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, padding: 16, marginBottom: 12, backgroundColor: '#fff' },
  deliveryChoiceSelected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: 'rgba(0,123,193,0.04)' },
  deliveryChoiceTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  deliveryChoiceIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,123,193,0.1)' },
  deliveryChoiceIconSelected: { backgroundColor: colors.primary },
  deliveryChoiceCopy: { flex: 1 },
  deliveryChoiceTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.heading, marginBottom: 2 },
  deliveryChoiceDescription: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.grayText },
  deliveryChoiceMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  deliveryChoiceMetaText: { flex: 1, fontFamily: fonts.medium, fontSize: 11, color: colors.primary },
  deliveryChoiceScheduledText: { color: colors.greenBright },
  scheduleStepCta: { marginTop: 12 },

  summaryWrap: { paddingHorizontal: 16, paddingTop: 8 },
  sumSection: { fontFamily: fonts.semibold, fontSize: 16, color: colors.label, marginBottom: 12, marginTop: 4 },
  sumSectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sumSectionInRow: { marginBottom: 12 },
  sumProducts: { marginBottom: 4 },
  sumProduct: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  sumProductImage: { width: 48, height: 64 },
  sumProductCopy: { flex: 1 },
  sumProductName: { fontFamily: fonts.semibold, fontSize: 13, color: colors.heading },
  sumProductMeta: { marginTop: 2, fontFamily: fonts.regular, fontSize: 11, color: colors.grayText },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sumLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.heading },
  sumValue: { fontFamily: fonts.medium, fontSize: 13, color: colors.heading, flexShrink: 1, textAlign: 'right' },
  miniLink: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary, textDecorationLine: 'underline' },
  payRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  payLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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

  scheduleDialog: { maxWidth: 380 },
  calendarBox: { backgroundColor: colors.redeemPale, borderRadius: 8, padding: 12, marginBottom: 12 },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  calNavButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  calNavButtonDisabled: { opacity: 0.45 },
  calMonth: { fontFamily: fonts.semibold, fontSize: 13, color: colors.heading, textAlign: 'center' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDayHead: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 10, color: colors.muted, marginBottom: 4 },
  calCell: { width: `${100 / 7}%`, height: 34, alignItems: 'center', justifyContent: 'center' },
  calDayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  calDayCircleSelected: { backgroundColor: colors.primary },
  calDay: { fontFamily: fonts.regular, fontSize: 12, color: colors.heading },
  calDayDisabled: { color: colors.muted, opacity: 0.55 },
  calDaySelected: { color: '#fff', fontFamily: fonts.semibold },
  scheduleTimeLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.heading, marginBottom: 8 },
  scheduleTimeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scheduleTimeOption: { width: '31%', height: 34, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.chip, alignItems: 'center', justifyContent: 'center' },
  scheduleTimeOptionSelected: { borderColor: colors.primary, backgroundColor: 'rgba(0,123,193,0.08)' },
  scheduleTimeText: { fontFamily: fonts.regular, fontSize: 11, color: colors.grayText },
  scheduleTimeTextSelected: { color: colors.primary, fontFamily: fonts.semibold },
  scheduleConfirm: { marginTop: 16 },
  ctaDisabled: { backgroundColor: colors.muted, opacity: 0.7 },

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
