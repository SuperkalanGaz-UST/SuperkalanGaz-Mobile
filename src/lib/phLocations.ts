import psgcLocations from '@/data/ph-locations-psgc-2026-q2.json';

export type PhAddressArea = {
  cities: Record<string, readonly string[]>;
};

type PsgcLocationDataset = {
  version: string;
  source: string;
  areas: Record<string, PhAddressArea>;
};

/**
 * Philippine administrative names from the PSA's 2Q 2026 PSGC publication.
 * The bundled snapshot keeps address selection available offline and avoids a
 * runtime dependency on an unofficial third-party location service.
 */
const dataset = psgcLocations as PsgcLocationDataset;

export const PH_ADDRESS_AREAS = dataset.areas;
export const PH_LOCATION_DATA_VERSION = dataset.version;
