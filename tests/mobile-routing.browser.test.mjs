import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after, before } from 'node:test';
import { chromium } from 'playwright';

// Run against the actual Expo export with SPA fallback, as configured on Vercel.
// Auth and domain requests use synthetic fixtures and never reach real services.
const root = fileURLToPath(new URL('../', import.meta.url));
const env = await readFile(path.join(root, '.env'), 'utf8');
const supabaseUrl = env.match(/^EXPO_PUBLIC_SUPABASE_URL=(.+)$/m)?.[1]?.trim();
assert.ok(supabaseUrl, 'Configure the public Supabase URL before exporting');
const authOrigin = new URL(supabaseUrl).origin;
const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
const dist = path.join(root, 'dist');
const types = { '.js': 'application/javascript', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.css': 'text/css' };
let server;
let baseUrl;
let browser;

before(async () => {
  server = createServer(async (request, response) => {
    const filename = path.resolve(dist, `.${decodeURIComponent(new URL(request.url, 'http://localhost').pathname)}`);
    if (filename !== dist && !filename.startsWith(`${dist}${path.sep}`)) {
      response.writeHead(403).end();
      return;
    }
    let body;
    let extension = path.extname(filename);
    try { body = await readFile(filename); }
    catch { body = await readFile(path.join(dist, 'index.html')); extension = '.html'; }
    response.writeHead(200, { 'Content-Type': types[extension] ?? 'application/octet-stream' }).end(body);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

function sessionFor(role, status = 'Active', accepted = false) {
  const user = {
    id: '00000000-0000-4000-8000-000000000001', email: 'routes@example.invalid',
    app_metadata: {
      role, status, account_type: role === 'customer' ? 'household' : undefined,
      branch_ids: ['00000000-0000-4000-8000-000000000002'],
      ...(accepted ? { delivery_rider_invitation_accepted_at: new Date().toISOString() } : {}),
    },
    user_metadata: { first_name: 'Route', last_name: 'Test', contact_number: '+639171234567', address: 'Test address' },
    aud: 'authenticated', created_at: new Date().toISOString(),
  };
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  return {
    access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, exp: expiresAt, role: 'authenticated' })}.synthetic-test-signature`,
    refresh_token: 'synthetic-test-only', token_type: 'bearer', expires_in: 3600, expires_at: expiresAt, user,
  };
}

function driverDashboard(assignment = null) {
  return {
    deliveryRider: {
      id: '00000000-0000-4000-8000-000000000004', displayName: 'Route Test',
      email: 'routes@example.invalid', mobile: '+639171234567', branchName: 'Routing branch',
      availability: assignment ? 'On Delivery' : 'Offline', operationalLocation: null,
      vehicle: { id: '00000000-0000-4000-8000-000000000005', label: 'TEST 123', model: null, healthy: true },
    },
    currentOffer: null, activeDelivery: assignment,
  };
}

async function newContext(session, { signedOut = false, dashboard = driverDashboard() } = {}) {
  const context = await browser.newContext({ viewport: { width: 414, height: 896 } });
  if (!signedOut) await context.addInitScript(({ key, session }) => {
    if (!sessionStorage.getItem('routing-test-initialized')) {
      localStorage.setItem(key, JSON.stringify(session));
      sessionStorage.setItem('routing-test-initialized', 'yes');
    }
  }, { key: storageKey, session });
  const requests = [];
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === authOrigin) {
      if (url.pathname === '/auth/v1/user') return route.fulfill({ json: session.user });
      if (url.pathname === '/auth/v1/token' || url.pathname === '/auth/v1/verify') return route.fulfill({ json: session });
      if (url.pathname === '/auth/v1/recover') return route.fulfill({ json: {} });
      if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });
      return route.abort();
    }
    if (url.pathname.startsWith('/api/')) {
      requests.push({ method: request.method(), path: url.pathname });
      if (url.pathname === '/api/delivery-rider/me') return route.fulfill({ json: dashboard });
      if (url.pathname === '/api/delivery-rider-invitations/session/details') return route.fulfill({ json: {
        recipientName: 'Route Test', email: session.user.email, mobile: '+639171234567', branchName: 'Routing branch',
      } });
      if (url.pathname === '/api/prices') return route.fulfill({ json: {
        prices: ['50kg', '22kg', '11kg', '5kg', '2.7kg'].map((cylinder_size, i) => ({ cylinder_size, unit_price: 3000 - i * 500 })),
      } });
      return route.fulfill({ json: { serviceRequests: [], branches: [], catalogItems: [], addresses: [], points_balance: 0 } });
    }
    if (url.origin === baseUrl) return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return { context, page, requests, errors };
}

async function expectPath(page, pathname) {
  try {
    await page.waitForURL(url => url.pathname === pathname, { timeout: 8_000 });
  } catch (error) {
    throw new Error(`Expected ${pathname}, found ${page.url()}. Screen: ${(await page.locator('body').innerText()).slice(0, 700)}`, { cause: error });
  }
  assert.equal(new URL(page.url()).pathname, pathname);
}

async function signIn(page) {
  await page.getByPlaceholder('Email or mobile number', { exact: true }).fill('routes@example.invalid');
  await page.getByPlaceholder('Password', { exact: true }).fill('synthetic-password');
  await page.getByText('Sign in', { exact: true }).click();
}

test('customer bookmarks resume after login; rewards, profile and history survive refresh and Back/Forward', { timeout: 60_000 }, async () => {
  const { context, page, requests, errors } = await newContext(sessionFor('customer'), { signedOut: true });
  try {
    await page.goto(`${baseUrl}/customer/orders`);
    await page.getByText('Welcome back!', { exact: true }).waitFor();
    assert.equal(requests.length, 0, 'Signed-out links must not load customer records');
    await signIn(page);
    await expectPath(page, '/customer/orders');
    await page.getByRole('button', { name: 'Rewards', exact: true }).click();
    await expectPath(page, '/customer/rewards');
    await page.reload();
    await page.getByRole('button', { name: 'Rewards', exact: true }).waitFor();
    await expectPath(page, '/customer/rewards');
    await page.goBack();
    await expectPath(page, '/customer/orders');
    await page.goForward();
    await expectPath(page, '/customer/rewards');
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await expectPath(page, '/customer/more');
    await page.goto(`${baseUrl}/customer/profile?profileSection=preferences`);
    await page.getByText('Account Preferences', { exact: true }).first().waitFor();
    await page.reload();
    await expectPath(page, '/customer/profile');
    assert.equal(new URL(page.url()).searchParams.get('profileSection'), 'preferences');
    await page.goto(`${baseUrl}/delivery-rider/profile`);
    await expectPath(page, '/customer/home');
    assert.equal(requests.some(r => r.path.startsWith('/api/delivery-rider')), false);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('signup and password recovery have public routes without putting recovery proof into links', { timeout: 30_000 }, async () => {
  const { context, page, requests, errors } = await newContext(sessionFor('customer'), { signedOut: true });
  try {
    await page.goto(baseUrl);
    await page.getByText('Sign Up', { exact: true }).click();
    await expectPath(page, '/signup');
    await page.goBack();
    await page.getByText('Welcome back!', { exact: true }).waitFor();
    await page.getByText('Forgot password?', { exact: true }).click();
    await expectPath(page, '/forgot-password');
    await page.getByPlaceholder('Email Address', { exact: true }).fill('routes@example.invalid');
    await page.getByText('Confirm', { exact: true }).click();
    await page.getByText('Check your email', { exact: true }).waitFor();
    const digits = page.locator('input[maxlength="1"]');
    for (let index = 0; index < 6; index++) await digits.nth(index).fill(String(index + 1));
    await page.getByText('Confirm', { exact: true }).click();
    await page.getByText('Set a new password', { exact: true }).waitFor();
    await expectPath(page, '/forgot-password');
    assert.equal(new URL(page.url()).search, '');
    assert.equal(new URL(page.url()).hash, '');
    assert.equal(requests.length, 0, 'A recovery session must not load customer operations');
    await page.reload();
    await page.getByPlaceholder('Email Address', { exact: true }).waitFor();
    assert.equal(requests.length, 0, 'Reloading an unfinished recovery must remain signed out');
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('Delivery Rider routes restore their tabs and reject customer screens', { timeout: 45_000 }, async () => {
  const { context, page, requests, errors } = await newContext(sessionFor('driver'));
  try {
    await page.goto(`${baseUrl}/delivery-rider/profile`);
    await page.getByText('Sign out', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Delivery', exact: true }).click();
    await expectPath(page, '/delivery-rider/delivery');
    await page.reload();
    await page.getByRole('button', { name: 'Delivery', exact: true }).waitFor();
    await expectPath(page, '/delivery-rider/delivery');
    await page.goBack();
    await expectPath(page, '/delivery-rider/profile');
    await page.goForward();
    await expectPath(page, '/delivery-rider/delivery');
    await page.goto(`${baseUrl}/customer/orders`);
    await page.getByRole('button', { name: 'Delivery', exact: true }).waitFor();
    await expectPath(page, '/delivery-rider/home');
    assert.equal(requests.some(r => r.path === '/api/service-requests/me' || r.path === '/api/prices'), false);
    await page.goto(`${baseUrl}/delivery-rider/profile`);
    await page.getByText('Sign out', { exact: true }).click();
    await page.getByText('Welcome back!', { exact: true }).waitFor();
    await page.goBack();
    await page.getByText('Welcome back!', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Delivery', exact: true }).count(), 0);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('pending, inactive and staff sessions cannot enter operational routes', { timeout: 45_000 }, async () => {
  for (const [role, status, accepted, expected] of [
    ['driver', 'Pending', true, 'Confirm your details'],
    ['driver', 'Pending', false, 'Mobile access unavailable'],
    ['driver', 'Inactive', true, 'Mobile access unavailable'],
    ['branch-manager', 'Active', false, 'Mobile access unavailable'],
  ]) {
    const { context, page, requests, errors } = await newContext(sessionFor(role, status, accepted));
    try {
      await page.goto(`${baseUrl}/delivery-rider/delivery`);
      await page.getByText(expected, { exact: true }).waitFor();
      assert.equal(requests.some(r => r.path === '/api/delivery-rider/me' || r.path === '/api/service-requests/me'), false);
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
});

test('proof links require an authorized in-transit assignment; completion cannot be fabricated', { timeout: 45_000 }, async () => {
  const assignment = {
    serviceRequestId: '00000000-0000-4000-8000-000000000006', srCode: 'SR-ROUTING-TEST',
    customerName: 'Test Customer', deliveryAddress: 'Test address', cylinderSize: '11kg', quantity: 1,
    vehicleLabel: 'TEST 123', requestedAt: new Date().toISOString(), dispatchedAt: new Date().toISOString(),
    inTransitAt: new Date().toISOString(),
  };
  for (const activeDelivery of [assignment, null, { ...assignment, inTransitAt: null }]) {
    const { context, page, errors } = await newContext(sessionFor('driver'), { dashboard: driverDashboard(activeDelivery) });
    try {
      await page.goto(`${baseUrl}/delivery-rider/delivery/proof`);
      if (activeDelivery?.inTransitAt) {
        await page.getByText('Add a delivery photo', { exact: true }).waitFor();
        await page.reload();
        await page.getByText('Add a delivery photo', { exact: true }).waitFor();
        await expectPath(page, '/delivery-rider/delivery/proof');
      } else {
        await expectPath(page, '/delivery-rider/delivery');
        assert.equal(await page.getByText('Add a delivery photo', { exact: true }).count(), 0);
      }
      await page.goto(`${baseUrl}/delivery-rider/delivery/complete`);
      await expectPath(page, '/delivery-rider/home');
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
});

test('a chosen delivery photo uploads as a JPEG file before confirming delivery', { timeout: 30_000 }, async () => {
  const assignment = {
    serviceRequestId: '00000000-0000-4000-8000-000000000006', srCode: 'SR-PROOF-TEST',
    customerName: 'Test Customer', deliveryAddress: 'Test address', cylinderSize: '11kg', quantity: 1,
    vehicleLabel: 'TEST 123', requestedAt: new Date().toISOString(), dispatchedAt: new Date().toISOString(),
    inTransitAt: new Date().toISOString(),
  };
  const { context, page, errors } = await newContext(sessionFor('driver'), { dashboard: driverDashboard(assignment) });
  let uploads = 0;
  try {
    await context.route('**/api/delivery-rider/service-requests/*/deliver', async route => {
      const request = route.request();
      const parsed = await new Response(request.postDataBuffer(), {
        headers: { 'content-type': request.headers()['content-type'] },
      }).formData();
      const proof = parsed.get('proof');
      if (!(proof instanceof File)) return route.fulfill({ status: 400, json: { message: 'A delivery proof photo is required' } });
      assert.match(proof.name, /^delivery-proof-.*\.jpg$/);
      assert.equal(proof.type, 'image/jpeg');
      const bytes = Buffer.from(await proof.arrayBuffer());
      assert.equal(bytes.readUInt16BE(0), 0xffd8, 'The uploaded file contains JPEG bytes');
      assert.ok(bytes.length < 3 * 1024 * 1024);
      uploads++;
      await route.fulfill({ json: driverDashboard() });
    });
    await page.goto(`${baseUrl}/delivery-rider/delivery/proof`);
    await page.getByText('Add a delivery photo', { exact: true }).waitFor();
    const chooserEvent = page.waitForEvent('filechooser');
    await page.getByText('Choose photo', { exact: true }).click();
    const chooser = await chooserEvent;
    await chooser.setFiles({
      name: 'proof.png', mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=', 'base64'),
    });
    await page.getByText('Photo ready', { exact: true }).waitFor();
    await page.getByText('Submit Delivered', { exact: true }).click();
    await page.getByText('Marked as delivered', { exact: true }).waitFor();
    assert.equal(uploads, 1);
    assert.equal(await page.getByText('A delivery proof photo is required', { exact: true }).count(), 0);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('Delivery Rider phone GPS syncs only while Available and the app is visible', { timeout: 30_000 }, async () => {
  const dashboard = driverDashboard();
  dashboard.deliveryRider.availability = 'Available';
  const { context, page, errors } = await newContext(sessionFor('driver'), { dashboard });
  const samples = [];
  try {
    await context.grantPermissions(['geolocation']);
    await context.addInitScript(() => {
      window.testGpsWatchers = new Map();
      window.testGpsClears = 0;
      let nextId = 0;
      navigator.geolocation.watchPosition = callback => {
        const id = ++nextId;
        window.testGpsWatchers.set(id, callback);
        // Native providers deliver the first fix asynchronously.
        setTimeout(() => callback({ coords: { latitude: 14.45, longitude: 120.98, accuracy: 8 }, timestamp: Date.now() }), 50);
        return id;
      };
      navigator.geolocation.clearWatch = id => {
        window.testGpsClears++;
        window.testGpsWatchers.delete(id);
      };
    });
    await context.route('**/api/delivery-rider/location', async route => {
      const sample = route.request().postDataJSON();
      samples.push(sample);
      assert.deepEqual(Object.keys(sample).sort(), ['accuracyM', 'capturedAt', 'latitude', 'longitude']);
      await route.fulfill({ json: { recorded: true, receivedAt: new Date().toISOString() } });
    });
    await context.route('**/api/delivery-rider/availability', async route => {
      assert.deepEqual(route.request().postDataJSON(), { available: false });
      await route.fulfill({ json: driverDashboard() });
    });
    await page.goto(`${baseUrl}/delivery-rider/home`);
    await page.getByText('Operational GPS is active for dispatch.', { exact: true }).waitFor();
    assert.ok(samples.length > 0);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.getByText('Operational GPS is paused. Return to the app to share your location.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.testGpsWatchers.size), 0);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.getByText('Operational GPS is active for dispatch.', { exact: true }).waitFor();
    await page.getByText('Go Offline', { exact: true }).click();
    await page.getByText('Operational GPS starts when you go Available.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.testGpsWatchers.size), 0);
    assert.ok(await page.evaluate(() => window.testGpsClears >= 2));
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('unknown and malformed order links show a missing-page state', { timeout: 30_000 }, async () => {
  const { context, page, requests, errors } = await newContext(sessionFor('customer'));
  try {
    for (const pathname of ['/customer/missing-screen', '/customer/order/not-a-uuid', '/super-admin/dashboard']) {
      await page.goto(`${baseUrl}${pathname}`);
      await page.getByText('Page not found', { exact: true }).waitFor();
    }
    assert.equal(requests.length, 0, 'Invalid links must not load application records');
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('order links retain the distinction between new requests and milestone tracking', { timeout: 30_000 }, async () => {
  const { context, page, requests, errors } = await newContext(sessionFor('customer'));
  try {
    await page.goto(`${baseUrl}/customer/order`);
    await page.getByText('Request an Order', { exact: true }).waitFor();
    await page.reload();
    await page.getByText('Request an Order', { exact: true }).waitFor();
    const orderId = '00000000-0000-4000-8000-000000000006';
    await page.goto(`${baseUrl}/customer/order/${orderId}`);
    await page.getByText('Track my Order', { exact: true }).waitFor();
    await page.reload();
    await page.getByText('Track my Order', { exact: true }).waitFor();
    await expectPath(page, `/customer/order/${orderId}`);
    assert.equal(requests.some(r => r.path === '/api/service-requests/me'), true);
    assert.equal(requests.some(r => r.method !== 'GET'), false, 'Opening an order link must never create a request');
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});
