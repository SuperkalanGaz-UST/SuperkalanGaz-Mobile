import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { cardShadow, radii } from '@/theme/metrics';
import { cylinderFor, images } from '@/lib/assets';
import { PrimaryButton } from '@/components/ui/controls';
import { Toast } from '@/components/ui/overlays';
import { CylinderSize, formatPeso, usePricing } from '@/contexts/PricingContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiErrorMessage, apiFetch } from '@/lib/api';
import { normalizePhMobile } from '@/lib/phMobile';
import { PH_ADDRESS_AREAS, PH_LOCATION_DATA_VERSION, type PhAddressArea } from '@/lib/phLocations';
import type { MainScreen, MainTab } from '@/navigation/types';
import { AddressMap } from '@/components/maps/AddressMap';
import {
  createCustomerAddress,
  listCustomerAddresses,
  updateCustomerAddress,
  type CustomerAddressRow,
  type SaveCustomerAddressInput,
} from '@/lib/customerAddresses';
import { CYLINDER_POINTS } from '@/lib/cylinderPoints';

/**
 * Order flow (Figma "OrderProcess"): delivery address + branch → product select
 * → delivery timing → review → track. Includes address / schedule / payment
 * sheets, the confirm dialog, and post-delivery feedback. Maps to the SRD
 * module; `order_source = Mobile App` is implied.
 *
 * Pricing comes from the shared SRD catalog. ETA and tracking remain Figma mock
 * data until their SRD endpoints are wired. Never show live rider GPS.
 */
type Step = 'location' | 'select' | 'schedule' | 'summary' | 'track';
type ModalKind = 'none' | 'selectAddress' | 'editAddress' | 'confirmed' | 'sched' | 'payment';
type Payment = 'paymongo' | 'cash';
type PaymentStatus = 'Unpaid' | 'Pending' | 'Paid';
type FeedbackStep = 'none' | 'rider' | 'store' | 'xfeedback';
type DeliverySchedule = 'now' | 'later';
type AddressSelectField = 'province' | 'city' | 'barangay';
type AddressEntryMode = 'choice' | 'current' | 'map' | 'manual';

type Coordinate = {
  latitude: number;
  longitude: number;
};

type NominatimReverseResponse = {
  display_name?: string;
  address?: Record<string, string | undefined>;
};

type SavedAddress = {
  id: string;
  label: string;
  address: string;
  province: string;
  city: string;
  barangay: string;
  street: string;
  landmark?: string;
  contact: string;
  coordinate?: Coordinate;
  persisted: boolean;
};

type BranchOption = {
  id: string;
  name: string;
  distance: string;
  hours: string;
  nearest: boolean;
};

type OrderRow = {
  id: string;
  branch_id: string;
  status: 'Pending' | 'Dispatched' | 'En Route' | 'Delivered' | 'Cancelled' | 'Under Review';
  customer_name: string;
  customer_contact: string;
  delivery_address: string;
  cylinder_size: string;
  quantity: number;
  special_instructions: string | null;
  requested_at: string;
  dispatched_at: string | null;
  delivered_at: string | null;
  rider_id?: string | null;
  payment_method: 'Cash on Delivery' | 'PayMongo';
  payment_status: PaymentStatus;
  payment_paid_at: string | null;
};

type PaymentResponse = {
  method: OrderRow['payment_method'];
  status: PaymentStatus;
  paidAt: string | null;
  checkoutUrl?: string | null;
};

WebBrowser.maybeCompleteAuthSession();

const PRODUCT_DETAILS: Array<{ id: CylinderSize; label: string; eta: string; use: string }> = [
  { id: '2.7kg', label: '2.7 KG', eta: '12:00 - 12:05 PM', use: 'Portable • Outdoor use' },
  { id: '5kg', label: '5 KG', eta: '12:00 - 12:10 PM', use: 'Compact • Small households' },
  { id: '11kg', label: '11 KG', eta: '12:00 - 12:05 PM', use: 'Standard • Everyday home use' },
  { id: '22kg', label: '22 KG', eta: '12:15 - 12:30 PM', use: 'Commercial • Food businesses' },
  { id: '50kg', label: '50 KG', eta: '12:30 - 1:00 PM', use: 'Heavy-duty • Large establishments' },
];
function cleanAddressPart(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, ' ') ?? '';
}

function addressPartKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(province|city|municipality|district|barangay|brgy|of)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function matchAddressOption(candidate: string, options: string[]) {
  const candidateKey = addressPartKey(candidate);
  if (!candidateKey) return '';

  return options.find((option) => addressPartKey(option) === candidateKey)
    ?? options.find((option) => {
      const optionKey = addressPartKey(option);
      return candidateKey.length > 3
        && optionKey.length > 3
        && (candidateKey.includes(optionKey) || optionKey.includes(candidateKey));
    })
    ?? '';
}

function normalizeBranchMatchText(value: string | null | undefined) {
  return cleanAddressPart(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function trimAfterCavite(value: string) {
  const match = value.match(/^(.*?\bCavite\b)/i);
  return match ? match[1].trim() : value.trim();
}

function branchMatchesCustomerLocation(
  branch: { name?: string | null; province: string | null; city: string | null; address: string | null },
  location: SavedAddress | null,
) {
  if (!location) return true;

  const locationValues = [location.province, location.city, location.barangay, location.street]
    .map(normalizeBranchMatchText)
    .filter(Boolean);
  const branchValues = [branch.name, branch.province, branch.city, branch.address]
    .map(normalizeBranchMatchText)
    .filter(Boolean);

  if (!locationValues.length || !branchValues.length) return true;

  const matched = locationValues.some((candidate) => branchValues.some((branchValue) => {
    if (!candidate || !branchValue) return false;
    if (candidate === branchValue) return true;
    if (branchValue.includes(candidate) || candidate.includes(branchValue)) return true;

    const candidateWords = candidate.split(' ').filter((word) => word.length > 2);
    return candidateWords.some((word) => branchValue.includes(word));
  }));

  return matched;
}

function findAreaAndCity(candidates: string[], areas: Record<string, PhAddressArea>) {
  for (const candidate of candidates.map(cleanAddressPart).filter(Boolean)) {
    for (const [area, details] of Object.entries(areas)) {
      const city = matchAddressOption(candidate, Object.keys(details.cities));
      if (city) return { area, city };
    }
  }
  return null;
}

const DEFAULT_ADDRESS_CENTER: Coordinate = {
  latitude: 14.6507,
  longitude: 121.0489,
};
const STEP_LABELS = ['Order\nConfirmed', 'Preparing', 'Out for Delivery', 'Delivered'];
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

function getMaximumScheduleDate() {
  const maximumDate = startOfDay(new Date());
  maximumDate.setDate(maximumDate.getDate() + 3);
  return maximumDate;
}

function isWithinScheduleWindow(date: Date, minimumDate: Date, maximumDate: Date) {
  const dateTime = startOfDay(date).getTime();
  return dateTime >= minimumDate.getTime() && dateTime <= maximumDate.getTime();
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

function metadataText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function savedAddressFromRow(row: CustomerAddressRow): SavedAddress {
  return {
    id: row.id,
    label: row.label,
    address: row.full_address,
    province: row.province,
    city: row.city,
    barangay: row.barangay,
    street: row.street,
    landmark: row.landmark ?? undefined,
    contact: row.contact_number,
    coordinate: row.latitude !== null && row.longitude !== null
      ? { latitude: row.latitude, longitude: row.longitude }
      : undefined,
    persisted: true,
  };
}

export function OrderProcessScreen({ onNavigate }: { onNavigate: (screen: MainScreen, opts?: { tab?: MainTab }) => void }) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { prices, loading: pricesLoading, error: pricesError, refresh: refreshPrices } = usePricing();
  const customerName = [
    metadataText(session?.user.user_metadata?.first_name),
    metadataText(session?.user.user_metadata?.last_name),
  ].filter(Boolean).join(' ').trim() || metadataText(session?.user.user_metadata?.display_name) || 'Customer';
  const profileAddress = metadataText(session?.user.user_metadata?.address);
  const profileContact = metadataText(session?.user.user_metadata?.contact_number)
    || session?.user.phone
    || '';
  const customerContact = normalizePhMobile(profileContact) ?? profileContact;
  const initialAddress: SavedAddress | null = useMemo(() => profileAddress
    ? {
        id: `profile-${session?.user.id ?? 'customer'}`,
        label: 'Home',
        address: profileAddress,
        province: '',
        city: '',
        barangay: '',
        street: profileAddress,
        contact: normalizePhMobile(profileContact) ?? '',
        persisted: false,
      }
    : null, [session?.user.id, profileAddress, profileContact]);
  const products = useMemo(
    () => PRODUCT_DETAILS.flatMap((product) => {
      const price = prices[product.id];
      return price === undefined ? [] : [{ ...product, price }];
    }),
    [prices],
  );
  const [step, setStep] = useState<Step>('location');
  const [modal, setModal] = useState<ModalKind>('none');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(() => initialAddress ? [initialAddress] : []);
  const [addressesLoading, setAddressesLoading] = useState(Boolean(session?.user.id));
  const [addressSaving, setAddressSaving] = useState(false);
  const addressAreas = PH_ADDRESS_AREAS;
  const [address, setAddress] = useState<SavedAddress | null>(initialAddress);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<BranchOption | null>(null);
  const [payment, setPayment] = useState<Payment>('cash');
  const [tempPayment, setTempPayment] = useState<Payment>('cash');
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
  const [eaProvince, setEaProvince] = useState('');
  const [eaCity, setEaCity] = useState('');
  const [eaBarangay, setEaBarangay] = useState('');
  const [eaStreet, setEaStreet] = useState('');
  const [eaLandmark, setEaLandmark] = useState('');
  const [eaContact, setEaContact] = useState('');
  const [eaPhoneError, setEaPhoneError] = useState('');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressSelectField, setAddressSelectField] = useState<AddressSelectField | null>(null);
  const [addressOptionQuery, setAddressOptionQuery] = useState('');
  const [addressEntryMode, setAddressEntryMode] = useState<AddressEntryMode>('choice');
  const [addressPin, setAddressPin] = useState<Coordinate | null>(null);
  const [addressMapCenter, setAddressMapCenter] = useState<Coordinate>(DEFAULT_ADDRESS_CENTER);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapGeocodeLoading, setMapGeocodeLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState('Move the pin or tap the map to adjust it.');
  const mapGeocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapGeocodeRequest = useRef(0);
  const lastMapGeocodeAt = useRef(0);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<OrderRow | null>(null);
  const [orderPlacedAt, setOrderPlacedAt] = useState<Date | null>(null);
  const [riderName, setRiderName] = useState<string | null>(null);

  useEffect(() => {
    if (currentOrder?.rider_id) {
      apiFetch(`/riders/${currentOrder.rider_id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.rider?.name) setRiderName(data.rider.name);
        })
        .catch(() => {});
    }
  }, [currentOrder?.rider_id]);

  useEffect(() => {
    if (step !== 'track' || !currentOrder) return;
    const poll = async () => {
      try {
        // Bust React Native's aggressive GET cache by appending a timestamp
        const res = await apiFetch(`/service-requests/me?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        });
        if (res.ok) {
          const data = await res.json();
          const updated = data.serviceRequests?.find((r: OrderRow) => r.id === currentOrder.id);
          if (updated) setCurrentOrder(updated);
        }
      } catch (e) {
        // ignore
      }
    };
    // Fetch immediately on entering track, then poll every 2s
    void poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [step, currentOrder?.id]);

  const loadBranchesForAddress = async (nextAddress: SavedAddress | null) => {
    try {
      const res = await apiFetch('/branches/public');
      const data = await res.json();

      if (!res.ok) {
        setBranches([]);
        setSelectedBranch(null);
        return;
      }

      const rows = Array.isArray(data.branches)
        ? (data.branches as Array<{ id: string; name: string; province: string | null; city: string | null; address: string | null; }>)
        : [];

      const matchingRows = nextAddress
        ? rows.filter((branch) => {
            return branchMatchesCustomerLocation(branch, nextAddress);
          })
        : rows;

      const nextBranches = matchingRows.map((branch, index) => ({
        id: branch.id,
        name: branch.name,
        distance: branch.city || branch.province || branch.address || 'Nearby branch',
        hours: branch.address ? branch.address : 'Open daily',
        nearest: index === 0,
      }));

      setBranches(nextBranches);
      setSelectedBranch((current) => {
        if (nextBranches.length === 0) return null;
        if (current && nextBranches.some((branch) => branch.id === current.id)) {
          return current;
        }
        return nextBranches[0];
      });
    } catch {
      setBranches([]);
      setSelectedBranch(null);
    }
  };

  useEffect(() => {
    void loadBranchesForAddress(address);
  }, [address]);

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

  // ETA: anchored to the time the order was placed (or dispatched_at from backend).
  // On summary screen (before placing), shows now+15..30.
  // On track screen, uses the stored placement time so it never shifts.
  const etaBase = step === 'track'
    ? (currentOrder?.requested_at ? new Date(currentOrder.requested_at) : (orderPlacedAt ?? new Date()))
    : new Date();
  const minEta = new Date(etaBase.getTime() + 15 * 60000);
  const maxEta = new Date(etaBase.getTime() + 30 * 60000);
  const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const estimatedEtaLabel = `${formatTime(minEta)} – ${formatTime(maxEta)}`;
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const refreshPaymentStatus = async (orderId: string): Promise<PaymentResponse | null> => {
    try {
      const response = await apiFetch(`/service-requests/${orderId}/payment?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      const data = await response.json();
      if (!response.ok || !data.payment) return null;
      const next = data.payment as PaymentResponse;
      setCurrentOrder((order) => order?.id === orderId
        ? {
            ...order,
            payment_method: next.method,
            payment_status: next.status,
            payment_paid_at: next.paidAt,
          }
        : order);
      return next;
    } catch {
      return null;
    }
  };

  const waitForPaymentConfirmation = async (orderId: string): Promise<PaymentResponse | null> => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const paymentState = await refreshPaymentStatus(orderId);
      if (paymentState?.status === 'Paid') return paymentState;
      if (attempt < 5) {
        await new Promise<void>((resolve) => setTimeout(resolve, 1_000));
      }
    }
    return null;
  };

  const launchPayMongoCheckout = async (order: OrderRow): Promise<void> => {
    setPlacingOrder(true);
    try {
      const response = await apiFetch(`/service-requests/${order.id}/payment/checkout`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(apiErrorMessage(data, 'Could not start online payment'));
      }
      const paymentState = data.payment as PaymentResponse;
      if (paymentState.status === 'Paid') {
        await refreshPaymentStatus(order.id);
        setModal('confirmed');
        return;
      }
      if (!paymentState.checkoutUrl) {
        throw new Error('PayMongo did not return a checkout link');
      }

      await WebBrowser.openAuthSessionAsync(
        paymentState.checkoutUrl,
        'superkalan://payments/return',
      );
      const confirmed = await waitForPaymentConfirmation(order.id);
      if (confirmed?.status === 'Paid') {
        setModal('confirmed');
      } else {
        showToast('Payment is still awaiting confirmation. You can retry safely.');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not start online payment');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handlePlaceOrder = async (): Promise<void> => {
    if (currentOrder) {
      if (
        currentOrder.payment_method === 'PayMongo' &&
        currentOrder.payment_status !== 'Paid'
      ) {
        await launchPayMongoCheckout(currentOrder);
      } else {
        setModal('confirmed');
      }
      return;
    }
    if (deliverySchedule === 'later') {
      const minimumDate = getMinimumScheduleDate();
      const maximumDate = getMaximumScheduleDate();
      if (!scheduledDate
        || !scheduledTime
        || !isWithinScheduleWindow(scheduledDate, minimumDate, maximumDate)) {
        showToast('Choose a delivery date within the next 3 days.');
        setStep('schedule');
        return;
      }
    }
    if (!selectedBranch || !address || !selectedProducts[0] || !session?.user) {
      showToast('Select a branch, address, and cylinder first.');
      return;
    }
    const normalizedContact = normalizePhMobile(customerContact);
    if (!normalizedContact) {
      showToast('Missing a valid mobile number in your profile.');
      return;
    }

    setPlacingOrder(true);
    try {
      const payload = {
        branchId: selectedBranch.id,
        customerName,
        customerContact: normalizedContact,
        deliveryAddress: address.address,
        cylinderSize: selectedProducts[0].product.id,
        quantity: selectedProducts[0].quantity,
        paymentMethod: payment === 'paymongo' ? 'PayMongo' : 'Cash on Delivery',
      };
      const response = await apiFetch('/service-requests/customer', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(apiErrorMessage(data, 'Failed to create order'));

      const order = data.serviceRequest as OrderRow;
      setCurrentOrder(order);
      setOrderPlacedAt(new Date(order.requested_at));
      if (order.payment_method === 'PayMongo') {
        await launchPayMongoCheckout(order);
      } else {
        setModal('confirmed');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to create order');
    } finally {
      setPlacingOrder(false);
    }
  };

  useEffect(() => {
    if (
      !currentOrder ||
      currentOrder.payment_method !== 'PayMongo' ||
      currentOrder.payment_status === 'Paid'
    ) {
      return;
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void refreshPaymentStatus(currentOrder.id).then((paymentState) => {
        if (paymentState?.status === 'Paid') setModal('confirmed');
      });
    });
    return () => subscription.remove();
  }, [currentOrder?.id, currentOrder?.payment_method, currentOrder?.payment_status]);

  const headerTitle = step === 'track' ? 'Track my Order' : 'Request an Order';
  const scheduledLabel = scheduledDate && scheduledTime
    ? `${formatScheduleDate(scheduledDate)} • ${scheduledTime}`
    : '';
  const minimumScheduleDate = getMinimumScheduleDate();
  const maximumScheduleDate = getMaximumScheduleDate();
  const minimumScheduleMonth = startOfMonth(minimumScheduleDate);
  const maximumScheduleMonth = startOfMonth(maximumScheduleDate);
  const calendarDays = buildCalendarDays(visibleScheduleMonth);
  const canViewPreviousMonth = visibleScheduleMonth.getTime() > minimumScheduleMonth.getTime();
  const canViewNextMonth = visibleScheduleMonth.getTime() < maximumScheduleMonth.getTime();
  const hasValidScheduledDate = scheduledDate
    ? isWithinScheduleWindow(scheduledDate, minimumScheduleDate, maximumScheduleDate)
    : false;
  const hasValidDraftScheduleDate = draftScheduleDate
    ? isWithinScheduleWindow(draftScheduleDate, minimumScheduleDate, maximumScheduleDate)
    : false;
  const canContinueFromSchedule = deliverySchedule === 'now'
    || (deliverySchedule === 'later' && Boolean(scheduledTime) && hasValidScheduledDate);
  const canPlaceOrder = Boolean(currentOrder) || canContinueFromSchedule;
  const canContinueFromLocation = Boolean(address && selectedBranch);

  useEffect(() => {
    let active = true;
    if (!session?.user.id) {
      setAddressesLoading(false);
      return () => { active = false; };
    }
    if (session.user.app_metadata.role !== 'customer') {
      setAddressesLoading(false);
      return () => { active = false; };
    }

    setAddressesLoading(true);
    void listCustomerAddresses()
      .then((rows) => {
        if (!active || rows.length === 0) return;
        const loaded = rows.map(savedAddressFromRow);
        setSavedAddresses(loaded);
        setAddress((current) => loaded.find((item) => item.id === current?.id) ?? loaded[0]);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setToast(loadError instanceof Error ? loadError.message : 'Could not load saved addresses.');
        setTimeout(() => { if (active) setToast(''); }, 2500);
      })
      .finally(() => { if (active) setAddressesLoading(false); });

    return () => { active = false; };
  }, [
    session?.user.id,
    session?.user.app_metadata.role,
    session?.user.app_metadata.status,
  ]);

  const changeProductQuantity = (productId: string, amount: number) => {
    setQuantities((current) => ({
      ...current,
      [productId]: Math.max(0, (current[productId] ?? 0) + amount),
    }));
  };

  const requestDeviceLocation = async () => {
    setLocationLoading(true);
    setLocationMessage('Finding your current location…');

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setLocationMessage('Location access is off. You can still adjust the pin manually.');
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const nextCoordinate = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
      setAddressPin(nextCoordinate);
      setAddressMapCenter(nextCoordinate);
      setLocationMessage('Location found. Filling address details…');

      const [geocoded] = await Location.reverseGeocodeAsync(nextCoordinate);
      if (!geocoded) {
        setLocationMessage('Pin placed. Enter the address details that could not be detected.');
        return;
      }

      const rawRegion = cleanAddressPart(geocoded.region);
      const regionKey = addressPartKey(rawRegion);
      const provinceCandidate = ['national capital region', 'ncr', 'metropolitan manila', 'metro manila']
        .includes(regionKey)
        ? 'National Capital Region (NCR)'
        : rawRegion;
      const subregion = cleanAddressPart(geocoded.subregion);
      const rawCity = cleanAddressPart(geocoded.city)
        || (addressPartKey(subregion) !== addressPartKey(provinceCandidate) ? subregion : '');
      const inferredLocation = findAreaAndCity(
        [rawCity, subregion, cleanAddressPart(geocoded.district)],
        addressAreas,
      );
      const province = matchAddressOption(provinceCandidate, Object.keys(addressAreas))
        || inferredLocation?.area
        || '';
      const cityOptions = Object.keys(addressAreas[province]?.cities ?? {});
      const city = matchAddressOption(rawCity, cityOptions)
        || (inferredLocation?.area === province ? inferredLocation.city : '')
        || '';

      const rawBarangay = cleanAddressPart(geocoded.district)
        || (subregion
          && ![province, city].some((part) => part && addressPartKey(part) === addressPartKey(subregion))
          ? subregion
          : '');
      const barangayOptions = addressAreas[province]?.cities[city] ?? [];
      const barangay = matchAddressOption(rawBarangay, [...barangayOptions]);

      const formattedStreet = cleanAddressPart(geocoded.formattedAddress).split(',')[0] ?? '';
      const explicitStreet = [cleanAddressPart(geocoded.streetNumber), cleanAddressPart(geocoded.street)]
        .filter(Boolean)
        .join(' ');
      const street = explicitStreet
        || (![barangay, city, province].some((part) => (
          part && addressPartKey(part) === addressPartKey(formattedStreet)
        )) ? formattedStreet : '');
      const placemark = cleanAddressPart(geocoded.name);
      const landmark = placemark
        && ![street, barangay, city, province].some((part) => part && addressPartKey(part) === addressPartKey(placemark))
        ? placemark
        : '';

      setEaProvince(province);
      setEaCity(city);
      setEaBarangay(barangay);
      if (street) setEaStreet(street);
      if (landmark) setEaLandmark(landmark);

      const missingDetails = [
        !province ? 'province' : '',
        !city ? 'city/municipality' : '',
        !barangay ? 'barangay' : '',
        !street ? 'street/unit' : '',
      ].filter(Boolean);
      setLocationMessage(missingDetails.length
        ? `Location found. Add or verify ${missingDetails.join(', ')}.`
        : 'Address details filled. Add your unit number if applicable.');
    } catch {
      setLocationMessage('We could not get your location. You can adjust the pin manually.');
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => () => {
    if (mapGeocodeTimer.current) clearTimeout(mapGeocodeTimer.current);
    mapGeocodeRequest.current += 1;
  }, []);

  const reverseGeocodeMapPin = async (coordinate: Coordinate, requestId: number) => {
    lastMapGeocodeAt.current = Date.now();

    try {
      const query = new URLSearchParams({
        format: 'jsonv2',
        addressdetails: '1',
        zoom: '18',
        lat: String(coordinate.latitude),
        lon: String(coordinate.longitude),
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query.toString()}`, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'en',
          'User-Agent': 'SuperkalanGazMobile/1.0 (delivery-address-picker)',
        },
      });
      if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);

      const result = await response.json() as NominatimReverseResponse;
      if (requestId !== mapGeocodeRequest.current) return;

      const geocoded = result.address ?? {};
      const rawRegion = cleanAddressPart(geocoded.state || geocoded.region || geocoded.province);
      const regionKey = addressPartKey(rawRegion);
      const provinceCandidate = ['national capital region', 'ncr', 'metropolitan manila', 'metro manila']
        .includes(regionKey)
        ? 'National Capital Region (NCR)'
        : rawRegion;
      const rawCity = cleanAddressPart(
        geocoded.city || geocoded.town || geocoded.municipality || geocoded.village || geocoded.county,
      );
      const inferredLocation = findAreaAndCity(
        [rawCity, cleanAddressPart(geocoded.suburb), cleanAddressPart(geocoded.neighbourhood)],
        addressAreas,
      );
      const province = matchAddressOption(provinceCandidate, Object.keys(addressAreas))
        || inferredLocation?.area
        || '';
      const cityOptions = Object.keys(addressAreas[province]?.cities ?? {});
      const city = matchAddressOption(rawCity, cityOptions)
        || (inferredLocation?.area === province ? inferredLocation.city : '')
        || '';
      const rawBarangay = cleanAddressPart(
        geocoded.suburb || geocoded.neighbourhood || geocoded.quarter || geocoded.hamlet,
      );
      const barangayOptions = addressAreas[province]?.cities[city] ?? [];
      const barangay = matchAddressOption(rawBarangay, [...barangayOptions]);
      const explicitStreet = [cleanAddressPart(geocoded.house_number), cleanAddressPart(geocoded.road)]
        .filter(Boolean)
        .join(' ');
      const displayStreet = cleanAddressPart(result.display_name).split(',')[0] ?? '';
      const street = explicitStreet || displayStreet;
      const landmark = cleanAddressPart(geocoded.amenity || geocoded.shop || geocoded.building || geocoded.tourism);

      if (province) setEaProvince(province);
      if (city) setEaCity(city);
      if (barangay) setEaBarangay(barangay);
      if (street) setEaStreet(street);
      if (landmark) setEaLandmark(landmark);

      const missingDetails = [
        !province ? 'province' : '',
        !city ? 'city/municipality' : '',
        !barangay ? 'barangay' : '',
        !street ? 'street/unit' : '',
      ].filter(Boolean);
      setLocationMessage(missingDetails.length
        ? `Location found. Add or verify ${missingDetails.join(', ')}.`
        : 'Address details filled. Add your unit number if applicable.');
    } catch {
      if (requestId === mapGeocodeRequest.current) {
        setLocationMessage('Pin placed. Enter or verify the address details below.');
      }
    } finally {
      if (requestId === mapGeocodeRequest.current) setMapGeocodeLoading(false);
    }
  };

  const queueMapReverseGeocode = (coordinate: Coordinate) => {
    // The public Nominatim instance is shared infrastructure, so reverse-geocode
    // only the latest settled pin and keep requests at least one second apart.
    if (mapGeocodeTimer.current) clearTimeout(mapGeocodeTimer.current);
    const requestId = mapGeocodeRequest.current + 1;
    mapGeocodeRequest.current = requestId;
    setMapGeocodeLoading(true);
    setLocationMessage('Looking up this pinned location…');

    const elapsed = Date.now() - lastMapGeocodeAt.current;
    const delay = Math.max(1000 - elapsed, 0);
    mapGeocodeTimer.current = setTimeout(() => {
      mapGeocodeTimer.current = null;
      void reverseGeocodeMapPin(coordinate, requestId);
    }, delay);
  };

  const openMapPicker = () => {
    setAddressEntryMode('map');
    setMapFullscreen(true);
    setLocationMessage(addressPin
      ? 'Drag the pin to adjust it, then confirm this location.'
      : 'Drag the pin to the delivery point, then confirm this location.');
  };

  const confirmMapLocation = () => {
    setMapFullscreen(false);
    setLocationMessage(mapGeocodeLoading
      ? 'Location selected. Review the address details while the lookup finishes.'
      : 'Location pinned. Review the address details below before saving.');
  };

  const selectAddressEntryMode = (mode: Exclude<AddressEntryMode, 'choice'>) => {
    setAddressEntryMode(mode);
    setAddressSelectField(null);
    setAddressOptionQuery('');

    if (mode === 'manual') {
      setAddressPin(null);
      setLocationMessage('Enter the delivery details below. You can add a map pin later.');
      return;
    }

    if (mode === 'map') {
      openMapPicker();
      return;
    }

    setLocationMessage('Finding your current location…');
    void requestDeviceLocation();
  };

  const openAddressEditor = (existing?: SavedAddress) => {
    const inferredLocation = existing && (!existing.province || !existing.city)
      ? findAreaAndCity(existing.address.split(',').reverse(), addressAreas)
      : null;
    setEditingAddressId(existing?.id ?? null);
    setEaLabel(existing?.label ?? 'Home');
    setEaProvince(existing?.province || inferredLocation?.area || '');
    setEaCity(existing?.city || inferredLocation?.city || '');
    setEaBarangay(existing?.barangay ?? '');
    setEaStreet(existing?.street ?? '');
    setEaLandmark(existing?.landmark ?? '');
    setEaContact(existing?.contact.slice(3) ?? '');
    setEaPhoneError('');
    setAddressSelectField(null);
    setAddressOptionQuery('');
    setAddressEntryMode(existing ? (existing.coordinate ? 'map' : 'manual') : 'choice');
    setMapFullscreen(false);
    setMapGeocodeLoading(false);
    if (mapGeocodeTimer.current) clearTimeout(mapGeocodeTimer.current);
    mapGeocodeRequest.current += 1;
    setLocationLoading(false);

    if (existing?.coordinate) {
      setAddressPin(existing.coordinate);
      setAddressMapCenter(existing.coordinate);
      setLocationMessage('Pin placed at this saved address.');
    } else {
      setAddressPin(null);
      setAddressMapCenter(DEFAULT_ADDRESS_CENTER);
      setLocationMessage(existing
        ? 'Enter the delivery details below. You can add a map pin later.'
        : 'Choose how you want to add this delivery address.');
    }

    setModal('editAddress');
  };

  const updateAddressPin = (coordinate: Coordinate) => {
    setAddressPin(coordinate);
    if (addressEntryMode === 'map') queueMapReverseGeocode(coordinate);
  };

  const addressSelectOptions = addressSelectField === 'province'
    ? Object.keys(addressAreas)
    : addressSelectField === 'city'
      ? Object.keys(addressAreas[eaProvince]?.cities ?? {})
      : addressAreas[eaProvince]?.cities[eaCity] ?? [];
  const normalizedAddressQuery = addressPartKey(addressOptionQuery);
  const filteredAddressSelectOptions = normalizedAddressQuery
    ? addressSelectOptions.filter((option) => addressPartKey(option).includes(normalizedAddressQuery))
    : addressSelectOptions;

  const openAddressPicker = (field: AddressSelectField) => {
    if (field === 'city' && !eaProvince) return;
    if (field === 'barangay' && !eaCity) return;
    setAddressOptionQuery('');
    setAddressSelectField(field);
  };

  const closeAddressPicker = () => {
    setAddressOptionQuery('');
    setAddressSelectField(null);
  };

  const selectAddressOption = (value: string) => {
    if (addressSelectField === 'province') {
      setEaProvince(value);
      setEaCity('');
      setEaBarangay('');
    } else if (addressSelectField === 'city') {
      setEaCity(value);
      setEaBarangay('');
    } else if (addressSelectField === 'barangay') {
      setEaBarangay(value);
    }
    setAddressOptionQuery('');
    setAddressSelectField(null);
  };

  const saveAddress = async () => {
    const label = eaLabel.trim();
    const street = eaStreet.trim();
    const normalizedContact = normalizePhMobile(eaContact);

    if (!label || !street || !eaProvince || !eaCity || !eaBarangay) {
      showToast('Complete all required address fields.');
      return;
    }
    if (!normalizedContact) {
      setEaPhoneError('Enter a valid PH mobile number');
      return;
    }

    const input: SaveCustomerAddressInput = {
      label,
      province: eaProvince,
      city: eaCity,
      barangay: eaBarangay,
      street,
      landmark: eaLandmark.trim() || undefined,
      contactNumber: normalizedContact,
      ...(addressPin ? { latitude: addressPin.latitude, longitude: addressPin.longitude } : {}),
    };

    setAddressSaving(true);
    try {
      const existing = savedAddresses.find((savedAddress) => savedAddress.id === editingAddressId);
      const row = existing?.persisted
        ? await updateCustomerAddress(existing.id, input)
        : await createCustomerAddress(input);
      const nextAddress = savedAddressFromRow(row);

      setSavedAddresses((current) => existing?.persisted
        ? current.map((savedAddress) => savedAddress.id === existing.id ? nextAddress : savedAddress)
        : [...current.filter((savedAddress) => savedAddress.id !== editingAddressId), nextAddress]);
      setAddress(nextAddress);
      setModal('none');
      showToast(existing?.persisted ? 'Address updated and saved.' : 'Address saved to your account.');
    } catch (saveError) {
      showToast(saveError instanceof Error ? saveError.message : 'Could not save this address.');
    } finally {
      setAddressSaving(false);
    }
  };

  const openScheduleModal = () => {
    const initialDate = scheduledDate
      && isWithinScheduleWindow(scheduledDate, minimumScheduleDate, maximumScheduleDate)
      ? startOfDay(scheduledDate)
      : null;
    setDeliverySchedule('later');
    setDraftScheduleDate(initialDate);
    setDraftScheduleTime(scheduledTime || DELIVERY_TIME_OPTIONS[1]);
    setVisibleScheduleMonth(startOfMonth(initialDate ?? minimumScheduleDate));
    setModal('sched');
  };

  const changeScheduleMonth = (offset: number) => {
    setVisibleScheduleMonth((current) => {
      const next = new Date(current.getFullYear(), current.getMonth() + offset, 1);
      const nextTime = next.getTime();
      return nextTime < minimumScheduleMonth.getTime() || nextTime > maximumScheduleMonth.getTime()
        ? current
        : next;
    });
  };

  const confirmSchedule = () => {
    if (!draftScheduleDate
      || !isWithinScheduleWindow(draftScheduleDate, minimumScheduleDate, maximumScheduleDate)) {
      setDraftScheduleDate(null);
      showToast('Choose a delivery date within the next 3 days.');
      return;
    }
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
            {/* Row 1: circle + connecting line */}
            <View style={styles.stepRow}>
              <View style={[styles.stepNode, { backgroundColor: bg, borderColor: border }]}>
                {isDone ? <Feather name="check" size={16} color="#fff" /> : <View style={[styles.stepDot, { backgroundColor: isActive ? colors.primary : colors.stepIdle }]} />}
              </View>
              {!isLast && <View style={[styles.stepLine, { backgroundColor: isDone ? colors.greenBright : colors.stepIdle }]} />}
            </View>
            {/* Row 2: label anchored under the circle only */}
            <View style={styles.stepLabelRow}>
              <View style={styles.stepLabelAnchor}>
                <Text
                  numberOfLines={i === 0 ? 2 : 1}
                  style={[
                    styles.stepLabel,
                    { color: isActive ? '#143263' : '#8a8f99' },
                    i === 0 && { width: 92 },
                    i !== 0 && { width: 112 }
                  ]}
                >
                  {label}
                </Text>
              </View>
              {!isLast && <View style={styles.stepLabelSpacer} />}
            </View>
          </View>
        );
      })}
    </View>
  );

  const paymentLabel = payment === 'paymongo'
    ? 'Online payment — GCash, Maya, or QR Ph'
    : 'Cash on Delivery';
  const paymentIcon = (p: Payment, size = 24) =>
    p === 'paymongo' ? (
      <Feather name="smartphone" size={size} color={colors.primary} />
    ) : (
      <Feather name="dollar-sign" size={size} color={colors.primary} />
    );

  /* ── Steps ── */
  const renderLocation = () => (
    <View style={styles.locationScreen}>
      <ScrollView
        style={styles.selectScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.locationContent}
      >
        <Text style={styles.stepCounter}>STEP 1 OF 4</Text>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: '25%' }]} /></View>

        <Text style={styles.locationTitle}>Where should we deliver?</Text>
        <Text style={styles.locationSubtitle}>Choose your address and nearest branch.</Text>

        <Text style={styles.locationSectionLabel}>DELIVERY ADDRESS</Text>
        {address ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Selected delivery address: ${address.label}, ${address.address}`}
            accessibilityHint="Opens your saved addresses"
            onPress={() => setModal('selectAddress')}
            style={({ pressed }) => [styles.locationAddressCard, pressed ? styles.controlPressed : null]}
          >
            <View style={styles.locationIconWrap}>
              <Feather name="map-pin" size={24} color={colors.heading} />
            </View>
            <View style={styles.locationAddressCopy}>
              <Text style={styles.locationAddressLabel}>{address.label}</Text>
              <Text style={styles.locationAddressText}>{address.address}</Text>
            </View>
            <Feather name="check-circle" size={22} color={colors.primary} />
            <Feather name="chevron-right" size={22} color={colors.heading} />
          </Pressable>
        ) : (
          <View style={styles.locationEmptyCard}>
            <Feather name="map-pin" size={24} color={colors.muted} />
            <View style={styles.locationAddressCopy}>
              <Text style={styles.locationEmptyTitle}>No delivery address saved</Text>
              <Text style={styles.locationEmptyText}>Add an address to continue with your order.</Text>
            </View>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => openAddressEditor()}
          style={({ pressed }) => [styles.addAddressButton, pressed ? styles.controlPressed : null]}
        >
          <Feather name="plus" size={20} color={colors.primary} />
          <Text style={styles.addAddressText}>{address ? 'Add another address' : 'Add delivery address'}</Text>
        </Pressable>

        <View style={styles.locationDivider} />
        <Text style={styles.locationSectionLabel}>SELECT A BRANCH</Text>
        {branches.map((branch) => {
          const selected = selectedBranch?.id === branch.id;
          return (
            <Pressable
              key={branch.id}
              accessibilityRole="radio"
              accessibilityLabel={`${branch.name}, ${branch.distance}, ${branch.hours}`}
              accessibilityState={{ checked: selected }}
              onPress={() => setSelectedBranch(branch)}
              style={({ pressed }) => [
                styles.branchCard,
                selected ? styles.branchCardSelected : null,
                pressed ? styles.controlPressed : null,
              ]}
            >
              <View style={styles.branchIconWrap}>
                <Feather name="home" size={24} color={colors.heading} />
              </View>
              <View style={styles.branchCopy}>
                {branch.nearest ? (
                  <View style={styles.nearestBadge}>
                    <Text style={styles.nearestBadgeText}>NEAREST BRANCH</Text>
                  </View>
                ) : null}
                <Text style={styles.branchName}>{branch.name}</Text>
                <Text style={styles.branchMeta}>{branch.distance} • {branch.hours}</Text>
                {branch.nearest ? (
                  <View style={styles.branchAvailability}>
                    <Feather name="check-circle" size={14} color={colors.primary} />
                    <Text style={styles.branchAvailabilityText}>Available for delivery</Text>
                  </View>
                ) : null}
              </View>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={24}
                color={selected ? colors.primary : colors.muted}
              />
            </Pressable>
          );
        })}
        {(() => {
          const shouldShowEmptyState = branches.length === 0;
          return shouldShowEmptyState ? (
            <View style={styles.locationEmptyCard}>
              <Feather name="home" size={24} color={colors.muted} />
              <View style={styles.locationAddressCopy}>
                <Text style={styles.locationEmptyTitle}>No nearby branches available</Text>
                <Text style={styles.locationEmptyText}>Branch availability will appear here once it is provided by the service.</Text>
              </View>
            </View>
          ) : null;
        })()}
      </ScrollView>

      <View style={[styles.locationFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <PrimaryButton
          label="Choose cylinders"
          disabled={!canContinueFromLocation}
          onPress={() => setStep('select')}
        />
        <Text style={styles.locationReassurance}>
          {canContinueFromLocation ? 'You can change this before checkout.' : 'Select an address and an available branch to continue.'}
        </Text>
      </View>
    </View>
  );

  const renderSelect = () => (
    <View style={styles.selectScreen}>
      <ScrollView
        style={styles.selectScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.selectContent}
      >
        <Text style={styles.stepCounter}>STEP 2 OF 4</Text>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: '50%' }]} /></View>
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
      <Text style={styles.stepCounter}>STEP 3 OF 4</Text>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: '75%' }]} /></View>

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
      <Text style={styles.stepCounter}>STEP 4 OF 4</Text>
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
      {summaryRow('Name:', customerName)}
      {summaryRow('Address:', address?.address ?? 'Not selected')}
      {summaryRow('Branch:', selectedBranch?.name ?? 'Not selected')}
      <Pressable style={{ alignSelf: 'flex-end' }} onPress={() => setStep('location')}>
        <Text style={styles.miniLink}>Change delivery details</Text>
      </Pressable>
      {summaryRow('Contact:', customerContact || 'Not provided')}
      <View style={styles.hair} />

      <Text style={styles.sumSection}>Payment Details</Text>
      <View style={styles.payRow}>
        <View style={styles.payLeft}>{paymentIcon(payment)}<Text style={styles.sumValue}>{paymentLabel}</Text></View>
        <Pressable onPress={() => { setTempPayment(payment); setModal('payment'); }}><Text style={styles.miniLink}>See all</Text></Pressable>
      </View>
      {currentOrder ? summaryRow(
        'Payment status:',
        currentOrder.payment_method === 'Cash on Delivery'
          ? 'Cash on Delivery'
          : currentOrder.payment_status === 'Paid'
            ? 'Paid'
            : currentOrder.payment_status === 'Pending'
              ? 'Awaiting payment'
              : 'Retry payment',
        currentOrder.payment_status === 'Paid' ? colors.greenBright : undefined,
      ) : null}
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
      {summaryRow('Loyalty Points:', `+${(CYLINDER_POINTS[selectedProducts[0]?.product.id ?? ''] ?? 0) * (selectedProducts[0]?.quantity ?? 1)} pts`, colors.greenBright)}
      <View style={styles.hair} />

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: placingOrder || !canPlaceOrder }}
        style={[styles.cta, placingOrder || !canPlaceOrder ? styles.ctaDisabled : null]}
        disabled={placingOrder || !canPlaceOrder}
        onPress={() => void handlePlaceOrder()}
      >
        <Text style={styles.ctaText}>
          {placingOrder
            ? 'PROCESSING…'
            : currentOrder?.payment_method === 'PayMongo' && currentOrder.payment_status !== 'Paid'
              ? 'RETRY PAYMENT'
              : 'PLACE ORDER'}
        </Text>
      </Pressable>
    </View>
  );

  const renderTrack = () => {
    if (delivered || currentOrder?.status === 'Delivered') {
      return (
        <View style={{ paddingHorizontal: 24 }}>
          <View style={{ paddingVertical: 20 }}>{stepper(4)}</View>
          <Text style={styles.trackDone}>Delivery Complete!</Text>
          {summaryRow('Order Number:', currentOrder?.id?.slice(0, 8).toUpperCase() ?? 'PENDING')}
          {summaryRow('Time of Delivery:', currentOrder?.delivered_at ? new Date(currentOrder.delivered_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Just now')}
          {summaryRow('Driver:', riderName || 'Assigned Driver')}
          <Pressable style={[styles.cta, { marginTop: 12 }]} onPress={() => setFeedback('rider')}><Text style={styles.ctaText}>SUBMIT FEEDBACK</Text></Pressable>
        </View>
      );
    }

    if (
      currentOrder?.payment_method === 'PayMongo' &&
      currentOrder.payment_status !== 'Paid'
    ) {
      return (
        <View style={{ paddingHorizontal: 24 }}>
          <View style={styles.orderPillWrap}>
            <View style={styles.orderPill}>
              <Text style={styles.orderPillText}>
                ORDER# {currentOrder.id.slice(0, 8).toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.confirmCircle}>
            <Feather name="clock" size={46} color="#fff" />
          </View>
          <Text style={styles.trackDone}>Awaiting payment</Text>
          <Text style={[styles.trackNotify, { textAlign: 'center', marginBottom: 18 }]}>
            Your Service Request is saved, but it cannot be dispatched until PayMongo confirms payment.
          </Text>
          <Pressable
            style={[styles.cta, placingOrder ? styles.ctaDisabled : null]}
            disabled={placingOrder}
            onPress={() => void launchPayMongoCheckout(currentOrder)}
          >
            <Text style={styles.ctaText}>{placingOrder ? 'CHECKING…' : 'RETRY PAYMENT'}</Text>
          </Pressable>
        </View>
      );
    }

    // Pending → 1 (Order Confirmed immediately green, Preparing active)
    // Dispatched/En Route → 3 (Out for Delivery checked, Delivered active)
    // Backend dispatch is the customer-visible "out for delivery" milestone.
    let stepIndex = 1;
    if (currentOrder?.status === 'Dispatched' || currentOrder?.status === 'En Route') {
      stepIndex = 3;
    }

    const isOutForDelivery = currentOrder?.status === 'Dispatched' || currentOrder?.status === 'En Route';
    const isPending = currentOrder?.status === 'Pending';

    // Build branch label: "Superkalan Gaz Amadeo, Cavite" — use name + city only
    // distance holds city || province || full-address; take only the first comma-separated part
    const cityPart = selectedBranch?.distance?.split(',')[0]?.trim() || '';
    const branchName = selectedBranch?.name?.trim() || '';
    const namePart = branchName.toLowerCase().includes('superkalan gaz')
      ? branchName
      : `Superkalan Gaz ${branchName}`.trim();
    const branchLabel = trimAfterCavite([namePart, cityPart]
      .filter(Boolean)
      .join(', ') || 'Superkalan Gaz branch');

    return (
      <View style={{ paddingHorizontal: 24 }}>
        <View style={styles.orderPillWrap}>
          <View style={styles.orderPill}><Text style={styles.orderPillText}>ORDER# {currentOrder?.id?.slice(0, 8).toUpperCase() ?? 'PENDING'}</Text></View>
        </View>
        <Text style={styles.etaBig}>{estimatedEtaLabel}</Text>
        <Text style={styles.trackStatus}>
          {isOutForDelivery
            ? `Your rider is on the way with your order!`
            : `${branchLabel} has confirmed your order and is preparing it.`}
        </Text>
        <Text style={styles.trackNotify}>
          {isOutForDelivery ? 'Your rider has been dispatched and is heading your way.' : "We'll notify you when your order is out for delivery."}
        </Text>
        <View style={styles.stepperWrap}>{stepper(stepIndex)}</View>
        {isOutForDelivery && currentOrder?.rider_id ? (
          <View style={styles.riderRow}>
            <View style={styles.riderAvatar}><Feather name="user" size={16} color="#fff" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.riderName}>{riderName || 'Your Rider'}</Text>
              <Text style={styles.riderMeta}>Your delivery is on the way</Text>
            </View>
            <View style={styles.riderRating}>
              <Ionicons name="star" size={15} color={colors.starYellow} />
              <Text style={styles.riderMeta}>4.8</Text>
            </View>
          </View>
        ) : isPending ? (
          <View style={styles.riderRow}>
            <View style={{ flex: 1, paddingVertical: 8 }}>
              <Text style={styles.riderName}>Assigning Driver...</Text>
              <Text style={styles.riderMeta}>We are matching you with a driver.</Text>
            </View>
          </View>
        ) : null}
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
            if (step === 'location') onNavigate('home', { tab: 'home' });
            else if (step === 'select') setStep('location');
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

      {step === 'location' ? (
        renderLocation()
      ) : step === 'select' ? (
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
            {savedAddresses.length === 0 ? (
              <Text style={styles.metaText}>You do not have a saved delivery address yet.</Text>
            ) : null}
            {addressesLoading ? <ActivityIndicator color={colors.primary} /> : null}
            {savedAddresses.map((a) => {
              const sel = address?.id === a.id;
              return (
                <View key={a.id} style={styles.addrRow}>
                  <Pressable style={styles.addrLeft} onPress={() => { setAddress(a); setModal('none'); }}>
                    <Ionicons name={sel ? 'radio-button-on' : 'radio-button-off'} size={18} color={sel ? colors.primary : colors.gray} />
                    <View>
                      <Text style={styles.addrLabel}>{a.label}</Text>
                      <Text style={styles.addrText}>{a.address}</Text>
                    </View>
                  </Pressable>
                  <Pressable onPress={() => openAddressEditor(a)}>
                    <Text style={styles.miniLink}>Change</Text>
                  </Pressable>
                </View>
              );
            })}
            <Pressable onPress={() => openAddressEditor()}>
              <Text style={styles.addNew}>+  Add New Address</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Add / edit delivery address */}
      <Modal
        visible={modal === 'editAddress'}
        transparent
        animationType="fade"
        onRequestClose={() => (mapFullscreen ? setMapFullscreen(false) : setModal('none'))}
      >
        <View style={mapFullscreen ? styles.addressMapFullscreenBackdrop : styles.addressModalBackdrop}>
          {mapFullscreen ? (
            <View style={styles.addressMapFullscreen}>
              <AddressMap
                center={addressMapCenter}
                pin={addressPin ?? addressMapCenter}
                onPinChange={updateAddressPin}
              />
              <View style={styles.addressMapTopBar}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back to address form"
                  onPress={() => setMapFullscreen(false)}
                  style={styles.addressMapTopButton}
                >
                  <Feather name="arrow-left" size={20} color={colors.heading} />
                </Pressable>
                <Text style={styles.addressMapTopTitle}>Choose delivery location</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close address picker"
                  onPress={() => { setMapFullscreen(false); setModal('none'); }}
                  style={styles.addressMapTopButton}
                >
                  <Feather name="x" size={20} color={colors.heading} />
                </Pressable>
              </View>
              <View style={styles.addressMapBottomCard}>
                <Text style={styles.addressMapBottomTitle}>Move the pin to your delivery point</Text>
                <Text style={styles.addressMapBottomText}>
                  {mapGeocodeLoading ? 'Looking up the address…' : locationMessage}
                </Text>
                <Text style={styles.addressMapAttribution}>© OpenStreetMap contributors • Nominatim</Text>
                <PrimaryButton
                  label={mapGeocodeLoading ? 'Looking up address…' : 'Use this location'}
                  disabled={!addressPin || mapGeocodeLoading}
                  onPress={confirmMapLocation}
                  style={styles.addressMapConfirmButton}
                />
              </View>
            </View>
          ) : (
          <>
          <View style={styles.addressDialog}>
            <View style={styles.addressDialogHead}>
              <Text style={styles.addressDialogTitle}>
                {editingAddressId ? 'Edit delivery address' : 'Add delivery address'}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close address form" onPress={() => setModal('none')} hitSlop={8}>
                <Feather name="x" size={22} color={colors.muted} />
              </Pressable>
            </View>

            {addressEntryMode === 'choice' ? (
              <View style={styles.addressMethodContent}>
                <Text style={styles.addressMethodIntroTitle}>How would you like to add it?</Text>
                <Text style={styles.addressMethodIntroText}>
                  Choose an option below. You can review and edit the address before saving.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Use my current location"
                  onPress={() => selectAddressEntryMode('current')}
                  style={({ pressed }) => [styles.addressMethodOption, pressed ? styles.controlPressed : null]}
                >
                  <View style={styles.addressMethodIcon}>
                    <Feather name="navigation" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.addressMethodCopy}>
                    <Text style={styles.addressMethodTitle}>Use my location</Text>
                    <Text style={styles.addressMethodText}>Fill in nearby address details using your device location.</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={colors.heading} />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Choose address on map"
                  onPress={() => selectAddressEntryMode('map')}
                  style={({ pressed }) => [styles.addressMethodOption, pressed ? styles.controlPressed : null]}
                >
                  <View style={styles.addressMethodIcon}>
                    <Feather name="map-pin" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.addressMethodCopy}>
                    <Text style={styles.addressMethodTitle}>Choose on map</Text>
                    <Text style={styles.addressMethodText}>Tap or drag a pin, then confirm the address details.</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={colors.heading} />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Enter address manually"
                  onPress={() => selectAddressEntryMode('manual')}
                  style={({ pressed }) => [styles.addressMethodOption, pressed ? styles.controlPressed : null]}
                >
                  <View style={styles.addressMethodIcon}>
                    <Feather name="edit-3" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.addressMethodCopy}>
                    <Text style={styles.addressMethodTitle}>Enter manually</Text>
                    <Text style={styles.addressMethodText}>Type the delivery address without sharing your location.</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={colors.heading} />
                </Pressable>

                <View style={styles.addressMethodPrivacyRow}>
                  <Feather name="shield" size={17} color={colors.primary} />
                  <Text style={styles.addressMethodPrivacyText}>Location permission is requested only when you choose it.</Text>
                </View>
              </View>
            ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.addressDialogContent}
            >
              {addressEntryMode !== 'manual' ? (
              <View style={styles.addressMapWrap}>
                <AddressMap
                  center={addressMapCenter}
                  pin={addressPin ?? addressMapCenter}
                  onPinChange={updateAddressPin}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={locationLoading}
                  onPress={() => selectAddressEntryMode('current')}
                  style={({ pressed }) => [
                    styles.useLocationButton,
                    pressed && !locationLoading ? styles.controlPressed : null,
                  ]}
                >
                  {locationLoading
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <Feather name="navigation" size={16} color={colors.primary} />}
                  <Text style={styles.useLocationText}>
                    {locationLoading ? 'Locating…' : 'Use my location'}
                  </Text>
                </Pressable>
              </View>
              ) : null}

              <View style={styles.pinStatusRow}>
                <Feather name={addressEntryMode === 'manual' ? 'edit-3' : 'map-pin'} size={16} color={colors.primary} />
                <Text style={styles.pinStatusText}>{locationMessage}</Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: locationLoading }}
                accessibilityLabel="Change address entry method"
                disabled={locationLoading}
                onPress={() => setAddressEntryMode('choice')}
                style={[styles.changeAddressMethod, locationLoading ? styles.changeAddressMethodDisabled : null]}
              >
                <Feather name="arrow-left" size={14} color={colors.primary} />
                <Text style={styles.changeAddressMethodText}>Change method</Text>
              </Pressable>

              <View style={styles.addressFormRow}>
                <View style={styles.addressFormColumn}>
                  <Text style={styles.addressFieldLabel}>Address label</Text>
                  <TextInput
                    style={styles.addressField}
                    value={eaLabel}
                    onChangeText={setEaLabel}
                    placeholder="Home"
                    placeholderTextColor={colors.muted}
                  />
                </View>
                <View style={styles.addressFormColumn}>
                  <Text style={styles.addressFieldLabel}>Contact number</Text>
                  <View style={[styles.addressPhoneField, eaPhoneError ? styles.addressFieldError : null]}>
                    <Text style={styles.addressPhonePrefix}>+63</Text>
                    <TextInput
                      style={styles.addressPhoneInput}
                      value={eaContact}
                      onChangeText={(value) => {
                        setEaContact(value.replace(/\D/g, '').slice(0, 10));
                        if (eaPhoneError) setEaPhoneError('');
                      }}
                      keyboardType="phone-pad"
                      placeholder="9XX XXX XXXX"
                      placeholderTextColor={colors.muted}
                    />
                  </View>
                  {eaPhoneError ? <Text style={styles.addressErrorText}>{eaPhoneError}</Text> : null}
                </View>
              </View>

              <View style={styles.addressFormRow}>
                <View style={styles.addressFormColumn}>
                  <Text style={styles.addressFieldLabel}>Province / HUC / NCR</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Select province, highly urbanized city, or NCR"
                    onPress={() => openAddressPicker('province')}
                    style={styles.addressSelect}
                  >
                    <Text
                      style={[styles.addressSelectText, !eaProvince ? styles.addressSelectPlaceholder : null]}
                      numberOfLines={1}
                    >
                      {eaProvince || 'Select area'}
                    </Text>
                    <Feather name="chevron-down" size={18} color={colors.gray} />
                  </Pressable>
                </View>
                <View style={styles.addressFormColumn}>
                  <Text style={styles.addressFieldLabel}>City / Municipality</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !eaProvince }}
                    disabled={!eaProvince}
                    onPress={() => openAddressPicker('city')}
                    style={[styles.addressSelect, !eaProvince ? styles.addressSelectDisabled : null]}
                  >
                    <Text
                      style={[styles.addressSelectText, !eaCity ? styles.addressSelectPlaceholder : null]}
                      numberOfLines={1}
                    >
                      {eaCity || 'Select city'}
                    </Text>
                    <Feather name="chevron-down" size={18} color={colors.gray} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.addressFormRow}>
                <View style={styles.addressFormColumn}>
                  <Text style={styles.addressFieldLabel}>Barangay</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !eaCity }}
                    disabled={!eaCity}
                    onPress={() => openAddressPicker('barangay')}
                    style={[styles.addressSelect, !eaCity ? styles.addressSelectDisabled : null]}
                  >
                    <Text
                      style={[styles.addressSelectText, !eaBarangay ? styles.addressSelectPlaceholder : null]}
                      numberOfLines={1}
                    >
                      {eaBarangay || 'Select barangay'}
                    </Text>
                    <Feather name="chevron-down" size={18} color={colors.gray} />
                  </Pressable>
                </View>
                <View style={styles.addressFormColumn}>
                  <Text style={styles.addressFieldLabel}>Street / Unit</Text>
                  <TextInput
                    style={styles.addressField}
                    value={eaStreet}
                    onChangeText={setEaStreet}
                    placeholder="123 Mabini Street"
                    placeholderTextColor={colors.muted}
                  />
                </View>
              </View>

              <Text style={styles.addressFieldLabel}>Landmark (optional)</Text>
              <TextInput
                style={styles.addressField}
                value={eaLandmark}
                onChangeText={setEaLandmark}
                placeholder="Near school, store, or subdivision"
                placeholderTextColor={colors.muted}
              />

              <View style={styles.addressPrivacyRow}>
                <Feather name="shield" size={18} color={colors.primary} />
                <Text style={styles.addressPrivacyText}>Used only to confirm this delivery address.</Text>
              </View>

              <PrimaryButton
                label={addressSaving ? 'Saving address…' : 'Save address'}
                disabled={addressSaving}
                onPress={() => void saveAddress()}
                style={styles.addressSaveButton}
              />
            </ScrollView>
            )}
          </View>

          {addressSelectField ? (
            <View style={styles.addressPickerLayer}>
              <Pressable style={StyleSheet.absoluteFill} onPress={closeAddressPicker} />
              <View style={styles.addressPickerCard}>
                <View style={styles.addressPickerHead}>
                  <Text style={styles.addressPickerTitle}>
                    {addressSelectField === 'province'
                      ? 'Select Province / HUC'
                      : addressSelectField === 'city'
                        ? 'Select City / Municipality'
                        : 'Select Barangay'}
                  </Text>
                  <Pressable onPress={closeAddressPicker} hitSlop={8}>
                    <Feather name="x" size={20} color={colors.gray} />
                  </Pressable>
                </View>
                <View style={styles.addressPickerSearchRow}>
                  <Feather name="search" size={17} color={colors.muted} />
                  <TextInput
                    autoCorrect={false}
                    clearButtonMode="while-editing"
                    value={addressOptionQuery}
                    onChangeText={setAddressOptionQuery}
                    placeholder={`Search ${addressSelectField === 'barangay' ? 'barangay' : 'location'}`}
                    placeholderTextColor={colors.muted}
                    style={styles.addressPickerSearchInput}
                  />
                </View>
                <FlatList
                  data={filteredAddressSelectOptions}
                  keyExtractor={(option) => option}
                  keyboardShouldPersistTaps="handled"
                  initialNumToRender={20}
                  style={styles.addressPickerList}
                  ListEmptyComponent={(
                    <Text style={styles.addressPickerEmpty}>No matching Philippine location found.</Text>
                  )}
                  renderItem={({ item: option }) => (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => selectAddressOption(option)}
                      style={styles.addressPickerOption}
                    >
                      <Text style={styles.addressPickerOptionText}>{option}</Text>
                      {(addressSelectField === 'province' && option === eaProvince)
                        || (addressSelectField === 'city' && option === eaCity)
                        || (addressSelectField === 'barangay' && option === eaBarangay)
                        ? <Feather name="check" size={18} color={colors.primary} />
                        : null}
                    </Pressable>
                  )}
                />
                <Text style={styles.addressPickerSource}>{PH_LOCATION_DATA_VERSION} • Philippine Statistics Authority</Text>
              </View>
            </View>
          ) : null}
          </>
          )}
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
          {(['paymongo', 'cash'] as Payment[]).map((p) => (
            <Pressable key={p} style={styles.payOption} onPress={() => setTempPayment(p)}>
              <View style={styles.payOptionIcon}>{paymentIcon(p)}</View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sumValue}>
                  {p === 'paymongo' ? 'Online payment' : 'Cash on Delivery'}
                </Text>
                {p === 'paymongo' ? (
                  <Text style={styles.metaText}>Pay securely with GCash, Maya, or QR Ph</Text>
                ) : null}
              </View>
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
            <Text style={styles.metaText}>Choose a delivery date within the next 3 days.</Text>
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
                  accessibilityState={{ disabled: !canViewNextMonth }}
                  disabled={!canViewNextMonth}
                  hitSlop={6}
                  onPress={() => changeScheduleMonth(1)}
                  style={[styles.calNavButton, !canViewNextMonth ? styles.calNavButtonDisabled : null]}
                >
                  <Feather name="chevron-right" size={18} color={canViewNextMonth ? colors.heading : colors.muted} />
                </Pressable>
              </View>
              <View style={styles.calGrid}>
                {CALENDAR_WEEKDAYS.map((d, i) => (
                  <Text key={i} style={styles.calDayHead}>{d}</Text>
                ))}
                {calendarDays.map((date, index) => {
                  if (!date) return <View key={`empty-${index}`} style={styles.calCell} />;

                  const disabled = !isWithinScheduleWindow(date, minimumScheduleDate, maximumScheduleDate);
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
              accessibilityState={{ disabled: !hasValidDraftScheduleDate }}
              disabled={!hasValidDraftScheduleDate}
              style={[styles.cta, styles.scheduleConfirm, !hasValidDraftScheduleDate ? styles.ctaDisabled : null]}
              onPress={confirmSchedule}
            >
              <Text style={styles.ctaText}>{hasValidDraftScheduleDate ? 'CONFIRM SCHEDULE' : 'SELECT A DATE'}</Text>
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
              Order# {currentOrder?.id?.slice(0, 8).toUpperCase() ?? 'PENDING'} is confirmed{'\n'}Branch: {selectedBranch?.name ?? 'Not selected'}{'\n'}Contact Number: {customerContact}
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
                  else {
                    showToast(`Feedback submitted successfully. +${CYLINDER_POINTS[currentOrder?.cylinder_size ?? ''] ?? 0} pts!`);
                    setFeedback('none');
                    onNavigate('home');
                  }
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

  locationScreen: { flex: 1, backgroundColor: colors.surface },
  locationContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  locationTitle: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 32, color: colors.heading, marginTop: 24 },
  locationSubtitle: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.grayText, marginTop: 2 },
  locationSectionLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gray, marginTop: 24, marginBottom: 10 },
  locationAddressCard: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.card,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
  },
  locationIconWrap: { width: 34, alignItems: 'center', justifyContent: 'center' },
  locationAddressCopy: { flex: 1 },
  locationAddressLabel: { fontFamily: fonts.semibold, fontSize: 16, color: colors.heading, marginBottom: 2 },
  locationAddressText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.grayText },
  locationEmptyCard: {
    minHeight: 86,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.cardBorder,
    borderRadius: radii.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceMuted,
  },
  locationEmptyTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.heading, marginBottom: 2 },
  locationEmptyText: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, color: colors.grayText },
  addAddressButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: 10 },
  addAddressText: { fontFamily: fonts.medium, fontSize: 13, color: colors.primary },
  locationDivider: { height: 1, backgroundColor: colors.border, marginTop: 14 },
  branchCard: {
    minHeight: 104,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.card,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
  },
  branchCardSelected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: 'rgba(0,123,193,0.03)' },
  branchIconWrap: { width: 36, alignItems: 'center', justifyContent: 'center' },
  branchCopy: { flex: 1 },
  nearestBadge: { alignSelf: 'flex-start', borderRadius: radii.chip, backgroundColor: colors.primaryTint, paddingHorizontal: 7, paddingVertical: 3, marginBottom: 6 },
  nearestBadgeText: { fontFamily: fonts.semibold, fontSize: 9, color: colors.primary },
  branchName: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.heading },
  branchMeta: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, color: colors.grayText, marginTop: 2 },
  branchAvailability: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  branchAvailabilityText: { fontFamily: fonts.medium, fontSize: 11, color: colors.primary },
  locationFooter: {
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  locationReassurance: { fontFamily: fonts.regular, fontSize: 11, color: colors.grayText, textAlign: 'center', marginTop: 10 },

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
  stepperWrap: { marginBottom: 16, paddingBottom: 8 },
  simBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: radii.button, height: 32, alignItems: 'center', justifyContent: 'center' },
  simBtnText: { fontFamily: fonts.medium, fontSize: 11, color: colors.primary },

  stepper: { flexDirection: 'row', alignItems: 'flex-start' },
  stepCol: {},
  stepRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  stepNode: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepDot: { width: 12, height: 12, borderRadius: 6 },
  stepLine: { flex: 1, height: 2 },
  // Label row mirrors the top row: a 36px anchor sits under the circle, a flex:1 spacer mirrors the line
  stepLabelRow: { flexDirection: 'row', width: '100%', minHeight: 34 },
  stepLabelAnchor: { width: 36, overflow: 'visible', alignItems: 'center' },
  stepLabelSpacer: { flex: 1 },
  stepLabel: {
    marginTop: 6,
    fontFamily: fonts.semibold,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
    includeFontPadding: false,
  },

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

  addressModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(24,36,46,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 24,
  },
  addressMapFullscreenBackdrop: { flex: 1, backgroundColor: colors.surface },
  addressMapFullscreen: { flex: 1, backgroundColor: colors.redeemPale },
  addressMapTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 48,
    paddingHorizontal: 14,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  addressMapTopButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  addressMapTopTitle: { flex: 1, marginHorizontal: 10, fontFamily: fonts.semibold, fontSize: 16, color: colors.heading, textAlign: 'center' },
  addressMapBottomCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 18,
    padding: 16,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  addressMapBottomTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.heading, marginBottom: 4 },
  addressMapBottomText: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.grayText, marginBottom: 6 },
  addressMapAttribution: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted, marginBottom: 10 },
  addressMapConfirmButton: { marginTop: 2 },
  addressDialog: {
    width: '100%',
    maxWidth: 430,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    ...cardShadow,
  },
  addressDialogHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  addressDialogTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.heading },
  addressMethodContent: { paddingHorizontal: 14, paddingBottom: 18 },
  addressMethodIntroTitle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.heading, marginTop: 4 },
  addressMethodIntroText: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.gray, marginTop: 5, marginBottom: 16 },
  addressMethodOption: {
    minHeight: 76,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    backgroundColor: colors.surface,
  },
  addressMethodIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.redeemPale },
  addressMethodCopy: { flex: 1, minWidth: 0 },
  addressMethodTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.heading, marginBottom: 2 },
  addressMethodText: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 14, color: colors.gray },
  addressMethodPrivacyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8 },
  addressMethodPrivacyText: { flex: 1, fontFamily: fonts.regular, fontSize: 10, lineHeight: 15, color: colors.grayText },
  addressDialogContent: { paddingHorizontal: 14, paddingBottom: 16 },
  addressMapWrap: { height: 154, borderRadius: radii.card, overflow: 'hidden', backgroundColor: colors.redeemPale },
  useLocationButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: radii.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  useLocationText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primary },
  pinStatusRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7 },
  pinStatusText: { flex: 1, fontFamily: fonts.medium, fontSize: 11, lineHeight: 16, color: colors.primary },
  changeAddressMethod: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', minHeight: 30, marginBottom: 4 },
  changeAddressMethodDisabled: { opacity: 0.5 },
  changeAddressMethodText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.primary },
  addressFormRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  addressFormColumn: { flex: 1, minWidth: 0 },
  addressFieldLabel: { fontFamily: fonts.medium, fontSize: 10, color: colors.primary, marginBottom: 4 },
  addressField: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.button,
    paddingHorizontal: 10,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.grayText,
    backgroundColor: colors.surface,
  },
  addressFieldError: { borderColor: colors.danger },
  addressErrorText: { marginTop: 3, fontFamily: fonts.regular, fontSize: 9, lineHeight: 12, color: colors.danger },
  addressPhoneField: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.button,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  addressPhonePrefix: {
    height: '100%',
    paddingHorizontal: 9,
    textAlignVertical: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.cardBorder,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 42,
    color: colors.heading,
  },
  addressPhoneInput: { flex: 1, height: '100%', paddingHorizontal: 8, fontFamily: fonts.regular, fontSize: 11, color: colors.grayText },
  addressSelect: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.button,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    backgroundColor: colors.surface,
  },
  addressSelectDisabled: { opacity: 0.5, backgroundColor: colors.surfaceMuted },
  addressSelectText: { flex: 1, fontFamily: fonts.regular, fontSize: 11, color: colors.grayText },
  addressSelectPlaceholder: { color: colors.muted },
  addressPrivacyRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8 },
  addressPrivacyText: { flex: 1, fontFamily: fonts.regular, fontSize: 10, lineHeight: 15, color: colors.grayText },
  addressSaveButton: { marginTop: 2 },
  addressPickerLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 30,
    elevation: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: 'rgba(24,36,46,0.34)',
  },
  addressPickerCard: { width: '100%', maxWidth: 350, height: '62%', maxHeight: 520, borderRadius: radii.card, backgroundColor: colors.surface, padding: 16, ...cardShadow },
  addressPickerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  addressPickerTitle: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.heading },
  addressPickerSearchRow: {
    height: 42,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.button,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  addressPickerSearchInput: { flex: 1, height: '100%', fontFamily: fonts.regular, fontSize: 12, color: colors.heading },
  addressPickerList: { flex: 1, minHeight: 46 },
  addressPickerOption: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border },
  addressPickerOptionText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.grayText },
  addressPickerEmpty: { paddingVertical: 24, textAlign: 'center', fontFamily: fonts.regular, fontSize: 12, color: colors.grayText },
  addressPickerSource: { paddingTop: 8, fontFamily: fonts.regular, fontSize: 9, color: colors.muted, textAlign: 'center' },

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
