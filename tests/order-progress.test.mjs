import assert from 'node:assert/strict';
import test from 'node:test';
import { orderProgress, latestActiveOrder } from '../src/lib/orderProgress.ts';

test('customer milestones separate acceptance from starting the delivery trip', () => {
  assert.deepEqual(orderProgress('Pending'), { step: 0, label: 'Order Confirmed', complete: false });
  assert.deepEqual(orderProgress('Dispatched'), { step: 1, label: 'Preparing', complete: false });
  assert.deepEqual(orderProgress('En Route'), { step: 2, label: 'On the way', complete: false });
  assert.deepEqual(orderProgress('Delivered'), { step: 3, label: 'Delivered', complete: true });
  assert.deepEqual(orderProgress('Completed'), orderProgress('Delivered'));
});

test('case/whitespace and legacy transit labels retain the correct milestones', () => {
  assert.deepEqual(orderProgress('  DISPATCHED  '), orderProgress('Dispatched'));
  assert.deepEqual(orderProgress('On the way'), orderProgress('En Route'));
});

test('cancelled, under-review and unknown states never imply the rider is travelling', () => {
  for (const status of ['Cancelled', 'Under Review', 'unknown', '']) {
    assert.equal(orderProgress(status).step, 0);
    assert.equal(orderProgress(status).complete, false);
  }
});

test('the home card still selects the latest active order, including dispatched orders', () => {
  const dispatched = { status: 'Dispatched', created_at: '2026-11-20T02:00:00Z' };
  assert.equal(latestActiveOrder([
    { status: 'Pending', created_at: '2026-11-20T01:00:00Z' }, dispatched,
    { status: 'Delivered', created_at: '2026-11-20T03:00:00Z' },
    { status: 'Cancelled', created_at: '2026-11-20T04:00:00Z' },
  ]), dispatched);
});
