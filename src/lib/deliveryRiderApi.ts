import { apiErrorMessage, apiFetch, apiPublicFetch } from '@/lib/api';

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

export interface DeliveryVehicle {
  id: string;
  label: string;
  model: string | null;
  healthy: boolean;
}

export interface DeliveryAssignment {
  serviceRequestId: string;
  referenceNumber: string;
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
    vehicle: DeliveryVehicle | null;
  };
  currentOffer: DeliveryOffer | null;
  activeDelivery: DeliveryAssignment | null;
}

interface ApiResult {
  message?: string;
}

async function responseData<T>(response: Response, fallback: string): Promise<T> {
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(apiErrorMessage(data, fallback));
  return data as T;
}

/**
 * Delivery Rider endpoints are intentionally kept behind NestJS. The API must
 * validate the single-use invitation and derive branch scope from the
 * invitation/JWT; neither registration client submits role or branch claims.
 *
 * The invitation, dashboard, and availability routes are implemented by the
 * Fleet module. Offer and milestone calls remain server-authoritative and
 * surface explicit API errors when no corresponding assignment exists.
 */
export async function getDeliveryRiderInvitation(
  token: string,
): Promise<DeliveryRiderInvitation> {
  const response = await apiPublicFetch(
    `/delivery-rider-invitations/acceptance?token=${encodeURIComponent(token)}`,
  );
  return responseData<DeliveryRiderInvitation>(response, 'This invitation is unavailable.');
}

export async function createDeliveryRiderAccount(
  token: string,
  password: string,
): Promise<ApiResult> {
  const response = await apiPublicFetch('/delivery-rider-invitations/account', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
  return responseData<ApiResult>(response, 'Could not create the Delivery Rider account.');
}

export async function resendDeliveryRiderMobileCode(token: string): Promise<ApiResult> {
  const response = await apiPublicFetch('/delivery-rider-invitations/mobile-code', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
  return responseData<ApiResult>(response, 'Could not send a new verification code.');
}

export async function verifyDeliveryRiderMobile(
  token: string,
  code: string,
): Promise<ApiResult> {
  const response = await apiPublicFetch('/delivery-rider-invitations/verify-mobile', {
    method: 'POST',
    body: JSON.stringify({ token, code }),
  });
  return responseData<ApiResult>(response, 'The verification code could not be confirmed.');
}

export async function acceptDeliveryRiderInvitation(token: string): Promise<ApiResult> {
  const response = await apiPublicFetch('/delivery-rider-invitations/accept', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
  return responseData<ApiResult>(response, 'Could not activate the Delivery Rider account.');
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
  const form = new FormData();
  // React Native's FormData accepts this file descriptor at runtime. DOM's
  // declaration only exposes Blob, so the narrow bridge is kept here.
  form.append('proof', {
    uri: photo.uri,
    name: photo.fileName,
    type: photo.mimeType,
  } as unknown as Blob);

  const response = await apiFetch(
    `/delivery-rider/service-requests/${encodeURIComponent(serviceRequestId)}/deliver`,
    { method: 'POST', body: form },
  );
  return responseData<DeliveryRiderDashboard>(response, 'Could not submit the delivery proof.');
}
