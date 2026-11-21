import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiErrorMessage, apiFetch } from '@/lib/api';

export const CYLINDER_SIZES = ['50kg', '22kg', '11kg', '5kg', '2.7kg'] as const;
export type CylinderSize = (typeof CYLINDER_SIZES)[number];
export type PriceMap = Partial<Record<CylinderSize, number>>;

interface PriceRow {
  cylinder_size: CylinderSize;
  unit_price: number;
  available_qty?: number;
}

interface PricingValue {
  prices: PriceMap;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const PricingContext = createContext<PricingValue | null>(null);

function priceRowsFrom(data: unknown): PriceRow[] {
  if (!data || typeof data !== 'object' || !Array.isArray((data as { prices?: unknown }).prices)) throw new Error('The pricing response was invalid.');
  const rows = (data as { prices: PriceRow[] }).prices;
  if (rows.length !== CYLINDER_SIZES.length || new Set(rows.map((row) => row?.cylinder_size)).size !== CYLINDER_SIZES.length || rows.some((row) => !row || !CYLINDER_SIZES.includes(row.cylinder_size) || !Number.isFinite(Number(row.unit_price)) || Number(row.unit_price) <= 0)) {
    throw new Error('The cylinder price list is incomplete. Please retry.');
  }
  return rows;
}

function priceMapFrom(rows: PriceRow[]): PriceMap {
  return Object.fromEntries(rows.map((row) => [row.cylinder_size, Number(row.unit_price)]));
}

export function PricingProvider({ children }: { children: React.ReactNode }) {
  const [prices, setPrices] = useState<PriceMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/prices');
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(data, 'Could not load LPG prices.'));
      setPrices(priceMapFrom(priceRowsFrom(data)));
      setError(null);
    } catch (loadError) {
      setPrices({});
      setError(loadError instanceof Error ? loadError.message : 'Could not load LPG prices.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ prices, loading, error, refresh }), [prices, loading, error, refresh]);
  return <PricingContext.Provider value={value}>{children}</PricingContext.Provider>;
}

export function usePricing(): PricingValue {
  const value = useContext(PricingContext);
  if (!value) throw new Error('usePricing must be used inside PricingProvider');
  return value;
}

/** Checkout prices and quantities both come from the selected branch. */
export function useBranchPricing(branchId: string | null): PricingValue & { available: Partial<Record<CylinderSize, number>> } {
  const generation = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const [result, setResult] = useState<{
    branchId: string; prices: PriceMap; available: Partial<Record<CylinderSize, number>>; loading: boolean; error: string | null;
  } | null>(null);
  const refresh = useCallback(async () => {
    controllerRef.current?.abort();
    const requestId = ++generation.current;
    if (!branchId) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    setResult({ branchId, prices: {}, available: {}, loading: true, error: null });
    try {
      const response = await apiFetch(`/prices/for-branch/${encodeURIComponent(branchId)}`, { signal: controller.signal, cache: 'no-store' });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(data, 'Could not load branch LPG prices.'));
      const rows = priceRowsFrom(data);
      if (rows.some(({ available_qty }) => available_qty === undefined || !Number.isInteger(available_qty) || available_qty < 0)) {
        throw new Error('Could not confirm branch stock. Please retry.');
      }
      const prices = priceMapFrom(rows);
      const available = Object.fromEntries(rows.map((row) => [row.cylinder_size, row.available_qty]));
      if (requestId === generation.current) setResult({ branchId, prices, available, loading: false, error: null });
    } catch (error: unknown) {
      if (requestId === generation.current) setResult({ branchId, prices: {}, available: {}, loading: false, error: controller.signal.aborted ? 'Branch availability took too long to load. Please retry.' : error instanceof Error ? error.message : 'Could not load branch availability.' });
    } finally { clearTimeout(timeout); }
  }, [branchId]);
  useEffect(() => {
    void refresh();
    return () => { generation.current++; controllerRef.current?.abort(); };
  }, [refresh]);
  // Never show the previous branch's amounts while the next request is starting.
  const current = result?.branchId === branchId ? result : null;
  return {
    prices: current?.prices ?? {},
    available: current?.available ?? {},
    loading: branchId !== null && (!current || current.loading),
    error: current?.error ?? null,
    refresh,
  };
}

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
