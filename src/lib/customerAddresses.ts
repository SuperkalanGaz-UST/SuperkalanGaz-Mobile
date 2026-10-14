import { apiErrorMessage, apiFetch } from '@/lib/api';

export type CustomerAddressRow = {
  id: string;
  label: string;
  full_address: string;
  province: string;
  city: string;
  barangay: string;
  street: string;
  landmark: string | null;
  contact_number: string;
  latitude: number | null;
  longitude: number | null;
};

export type SaveCustomerAddressInput = {
  label: string;
  province: string;
  city: string;
  barangay: string;
  street: string;
  landmark?: string;
  contactNumber: string;
  latitude?: number;
  longitude?: number;
};

async function responseData(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export async function listCustomerAddresses(): Promise<CustomerAddressRow[]> {
  const response = await apiFetch('/customer/addresses');
  const data = await responseData(response);
  if (!response.ok) throw new Error(apiErrorMessage(data, 'Could not load saved addresses.'));
  if (!data || typeof data !== 'object' || !Array.isArray((data as { addresses?: unknown }).addresses)) {
    throw new Error('The saved-address response was invalid.');
  }
  return (data as { addresses: CustomerAddressRow[] }).addresses;
}

export async function createCustomerAddress(
  input: SaveCustomerAddressInput,
): Promise<CustomerAddressRow> {
  return save('/customer/addresses', 'POST', input);
}

export async function updateCustomerAddress(
  id: string,
  input: SaveCustomerAddressInput,
): Promise<CustomerAddressRow> {
  return save(`/customer/addresses/${id}`, 'PATCH', input);
}

async function save(
  path: string,
  method: 'POST' | 'PATCH',
  input: SaveCustomerAddressInput,
): Promise<CustomerAddressRow> {
  const response = await apiFetch(path, {
    method,
    body: JSON.stringify(input),
  });
  const data = await responseData(response);
  if (!response.ok) throw new Error(apiErrorMessage(data, 'Could not save this address.'));
  const address = data && typeof data === 'object'
    ? (data as { address?: CustomerAddressRow }).address
    : undefined;
  if (!address?.id) throw new Error('The saved-address response was invalid.');
  return address;
}
