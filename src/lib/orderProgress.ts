export function orderProgress(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'delivered' || normalized === 'completed') return { step: 2, label: 'Delivered', complete: true } as const;
  if (['dispatched', 'en route', 'on the way'].includes(normalized)) return { step: 1, label: 'On the way', complete: false } as const;
  return {
    step: 0,
    label: normalized === 'under review' ? 'Under Review' : normalized === 'cancelled' ? 'Cancelled' : 'Order Confirmed',
    complete: false,
  } as const;
}

export function latestActiveOrder<T extends { status: string; created_at: string }>(orders: T[]): T | null {
  return orders
    .filter((order) => !['delivered', 'completed', 'cancelled'].includes(order.status.trim().toLowerCase()))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] ?? null;
}
