import { apiErrorMessage, apiFetch } from '@/lib/api';

export type DeliveryRiderAvailability =
  | 'Offline'
  | 'Available'
  | 'On Delivery'
  | 'Maintenance Due';

export interface DeliveryRiderInvitation {
  invitationId: string;
  recipientName: string;
  email: string;
  mobile: string;
  branchName: string;
  expiresAt: string;
  emailVerified: boolean;
  accountCreated: boolean;
  mobileVerified: boolean;
}

export interface DeliveryRiderMobileVerification extends DeliveryRiderInvitation {
  verificationMode: 'sms' | 'placeholder';
}

export interface DeliveryVehicle {
  id: string;
  label: string;
  model: string | null;
  healthy: boolean;
}

export interface DeliveryAssignment {
  serviceRequestId: string;
  srCode: string;
  customerName: string;
  deliveryAddress: string;
  cylinderSize: string;
  quantity: number;
  vehicleLabel: string;
  requestedAt: string;
  dispatchedAt: string;
  inTransitAt: string | null;
}

export interface DeliveryOffer {
  offerId: string;
  expiresAt: string;
  assignment: Omit<DeliveryAssignment, 'dispatchedAt' | 'inTransitAt'>;
}

export interface DeliveryRiderDashboard {
  deliveryRider: {
    id: string;
    displayName: string;
    email: string;
    mobile: string;
    branchName: string;
    availability: DeliveryRiderAvailability;
    operationalLocation: DeliveryRiderOperationalLocation | null;
    vehicle: DeliveryVehicle | null;
  };
  currentOffer: DeliveryOffer | null;
  activeDelivery: DeliveryAssignment | null;
}

export interface DeliveryRiderOperationalLocation {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  capturedAt: string;
  receivedAt: string;
  source: 'phone';
}

export interface DeliveryRiderLocationUpdate {
  latitude: number;
  longitude: number;
  accuracyM: number;
  capturedAt: string;
}

interface ApiResult {
  message?: string;
}

export async function getDeliveryRiderDetails(): Promise<DeliveryRiderInvitation> {
  const response = await apiFetch('/delivery-rider-invitations/session/details');
  return responseData<DeliveryRiderInvitation>(response, 'Could not load your details.');
}

export async function confirmDeliveryRiderDetails(): Promise<ApiResult> {
  const response = await apiFetch('/delivery-rider-invitations/session/confirm-details', {
    method: 'POST',
  });
  return responseData<ApiResult>(response, 'Could not confirm your details.');
}

async function responseData<T>(response: Response, fallback: string): Promise<T> {
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(apiErrorMessage(data, fallback));
  return data as T;
}

/** Loads the invitation-bound identity after website acceptance and app sign-in. */
export async function getDeliveryRiderMobileVerification(): Promise<DeliveryRiderMobileVerification> {
  const response = await apiFetch('/delivery-rider-invitations/session/mobile-verification');
  return responseData<DeliveryRiderMobileVerification>(
    response,
    'Mobile verification is unavailable for this account.',
  );
}

export async function completeDeliveryRiderPlaceholderVerification(): Promise<ApiResult> {
  const response = await apiFetch(
    '/delivery-rider-invitations/session/complete-placeholder-mobile-verification',
    { method: 'POST' },
  );
  return responseData<ApiResult>(
    response,
    'Could not complete the temporary verification step.',
  );
}

export async function sendDeliveryRiderMobileVerificationCode(): Promise<ApiResult> {
  const response = await apiFetch('/delivery-rider-invitations/session/mobile-code', {
    method: 'POST',
  });
  return responseData<ApiResult>(response, 'Could not send the verification code.');
}

export async function verifyDeliveryRiderMobileForSession(code: string): Promise<ApiResult> {
  const response = await apiFetch('/delivery-rider-invitations/session/verify-mobile', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  return responseData<ApiResult>(
    response,
    'The verification code could not be confirmed.',
  );
}

export async function getDeliveryRiderDashboard(): Promise<DeliveryRiderDashboard> {
  const response = await apiFetch('/delivery-rider/me');
  return responseData<DeliveryRiderDashboard>(response, 'Delivery Rider workspace is unavailable.');
}

export async function setDeliveryRiderAvailability(
  available: boolean,
): Promise<DeliveryRiderDashboard> {
  const response = await apiFetch('/delivery-rider/availability', {
    method: 'POST',
    body: JSON.stringify({ available }),
  });
  return responseData<DeliveryRiderDashboard>(response, 'Could not update your availability.');
}

export async function updateDeliveryRiderOperationalLocation(
  location: DeliveryRiderLocationUpdate,
): Promise<{ recorded: boolean; receivedAt: string | null }> {
  const response = await apiFetch('/delivery-rider/location', {
    method: 'POST',
    body: JSON.stringify(location),
  });
  return responseData<{ recorded: boolean; receivedAt: string | null }>(
    response,
    'Could not update your operational location.',
  );
}

export async function acceptDeliveryOffer(offerId: string): Promise<DeliveryRiderDashboard> {
  const response = await apiFetch(`/delivery-rider/offers/${encodeURIComponent(offerId)}/accept`, {
    method: 'POST',
  });
  return responseData<DeliveryRiderDashboard>(response, 'This delivery offer can no longer be accepted.');
}

export async function declineDeliveryOffer(offerId: string): Promise<DeliveryRiderDashboard> {
  const response = await apiFetch(`/delivery-rider/offers/${encodeURIComponent(offerId)}/decline`, {
    method: 'POST',
  });
  return responseData<DeliveryRiderDashboard>(response, 'Could not decline this delivery offer.');
}

export async function startDelivery(serviceRequestId: string): Promise<DeliveryRiderDashboard> {
  const response = await apiFetch(
    `/delivery-rider/service-requests/${encodeURIComponent(serviceRequestId)}/in-transit`,
    { method: 'POST' },
  );
  return responseData<DeliveryRiderDashboard>(response, 'Could not start this delivery.');
}

export interface DeliveryProofPhoto {
  uri: string;
  fileName: string;
  mimeType: string;
}

export async function submitDeliveredWithProof(
  serviceRequestId: string,
  photo: DeliveryProofPhoto,
): Promise<DeliveryRiderDashboard> {
  if (!photo.uri?.trim()) throw new Error('Choose a delivery photo before submitting.');
  const form = new FormData();
  // DOM typings omit React Native's native file-descriptor overload.
  const nativeForm = form as FormData & {
    append(name: string, file: { uri: string; name: string; type: string }): void;
  };
  nativeForm.append('proof', {
    uri: photo.uri,
    name: photo.fileName,
    type: photo.mimeType,
  });

  const response = await apiFetch(
    `/delivery-rider/service-requests/${encodeURIComponent(serviceRequestId)}/deliver`,
    { method: 'POST', body: form },
  );
  return responseData<DeliveryRiderDashboard>(response, 'Could not submit the delivery proof.');
}
