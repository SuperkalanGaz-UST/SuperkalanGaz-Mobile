import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiErrorMessage, apiFetch } from '@/lib/api';

export const CYLINDER_SIZES = ['50kg', '22kg', '11kg', '5kg', '2.7kg'] as const;
export type CylinderSize = (typeof CYLINDER_SIZES)[number];
export type PriceMap = Partial<Record<CylinderSize, number>>;

interface PriceRow {
  cylinder_size: CylinderSize;
  unit_price: number;
}

interface PricingValue {
  prices: PriceMap;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const PricingContext = createContext<PricingValue | null>(null);

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
      if (!data || typeof data !== 'object' || !Array.isArray((data as { prices?: unknown }).prices)) {
        throw new Error('The pricing response was invalid.');
      }

      const rows = (data as { prices: PriceRow[] }).prices;
      setPrices(Object.fromEntries(rows.map((row) => [row.cylinder_size, Number(row.unit_price)])));
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

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
