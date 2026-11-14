import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after, before } from 'node:test';
import { chromium, devices, webkit } from 'playwright';

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

async function newContext(session, {
  signedOut = false, dashboard = driverDashboard(), orders = [],
  viewport = { width: 414, height: 896 }, reducedMotion = 'no-preference',
  browserInstance = browser, device = {},
} = {}) {
  const context = await browserInstance.newContext({ ...device, viewport, reducedMotion });
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
      if (url.pathname === '/api/service-requests/me') return route.fulfill({ json: { serviceRequests: orders } });
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

test('customer guide highlights Active Orders in History without requiring an order', { timeout: 15_000 }, async () => {
  const { context, page, errors } = await newContext(sessionFor('customer'), {
    viewport: { width: 393, height: 695 },
  });
  try {
    await page.goto(`${baseUrl}/customer/home?showGuide=true`);
    const next = page.getByRole('button', { name: 'NEXT', exact: true });
    const back = page.getByRole('button', { name: 'Back', exact: true });
    const spotlight = page.getByTestId('app-guide-spotlight');
    const card = page.getByTestId('app-guide-card');
    const mascot = card.locator('[data-testid^="mascot-"]');
    await next.click();
    await next.click();
    await page.getByText('My Orders', { exact: true }).waitFor({ timeout: 3_000 });
    await page.getByText('You have no active orders.', { exact: true }).waitFor();
    const activeTab = page.getByText('Active Orders (0)', { exact: true });
    await page.waitForFunction(tab => {
      const hole = document.querySelector('[data-testid="app-guide-spotlight"]').getBoundingClientRect();
      const label = tab.getBoundingClientRect();
      return hole.left <= label.left && hole.right >= label.right && hole.top <= label.top && hole.bottom >= label.bottom && hole.width < 200;
    }, await activeTab.elementHandle());
    await next.click();
    await page.waitForFunction(() => Number(document.querySelector('[data-testid="app-guide-spotlight"]').getAttribute('height')) > 150);
    await card.getByText('Ordering Again?', { exact: true }).waitFor();
    assert.equal(await mascot.count(), 1);
    assert.ok(await mascot.locator('svg path').count() > 100);
    const reorderHole = await spotlight.boundingBox();
    assert.ok(reorderHole.y + reorderHole.height < (await mascot.boundingBox()).y);

    await next.click();
    await page.waitForFunction(() => {
      const { y, height } = document.querySelector('[data-testid="app-guide-spotlight"]').getBoundingClientRect();
      return y < 40 && height > 0 && height < 75;
    });
    await spotlight.evaluate(element => {
      globalThis.guideFrames = [];
      new MutationObserver(() => {
        globalThis.guideFrames.push([Number(element.getAttribute('y')), Number(element.getAttribute('height'))]);
      }).observe(element, { attributes: true });
    });
    await next.click();
    await card.getByText('Navigate with Ease!', { exact: true }).waitFor();
    await page.waitForFunction(() => Number(document.querySelector('[data-testid="app-guide-spotlight"]').getAttribute('y')) > 590);
    const frames = await page.evaluate(() => globalThis.guideFrames);
    assert.ok(frames.some(([y]) => y > 100 && y < 500), 'The spotlight passes through intermediate positions');
    assert.ok(frames.every(([, height]) => height > 0), 'The spotlight stays open between measured targets');
    assert.equal(await mascot.count(), 1);
    assert.ok(await mascot.locator('svg path').count() > 100);
    const navCard = await card.boundingBox();
    assert.ok((await spotlight.boundingBox()).y > navCard.y + navCard.height);

    await back.click();
    await card.getByText('Quick Order', { exact: true }).waitFor();
    await back.click();
    await card.getByText('Ordering Again?', { exact: true }).waitFor();
    await back.click();
    await activeTab.waitFor();
    await page.getByRole('button', { name: 'Close guide' }).click();
    await card.waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Open app guide' }).click();
    await card.getByText('Hi! Welcome to Superkalan Gaz App', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Close guide' }).click();
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByText('App Guide', { exact: true }).click();
    await card.getByText('Hi! Welcome to Superkalan Gaz App', { exact: true }).waitFor();
    assert.equal(await card.count(), 1);
    await page.getByRole('button', { name: 'Close guide' }).click();
    await card.waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('button', { name: /Log Out Sign out of this device/ }).click();
    const sadMascot = page.getByTestId('mascot-sad');
    await sadMascot.waitFor();
    assert.ok(await sadMascot.locator('svg path').count() > 100);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('Quick Order spotlight follows the row when scrolling finishes after measurement', { timeout: 15_000 }, async () => {
  const { context, page } = await newContext(sessionFor('customer'), {
    viewport: { width: 393, height: 852 },
  });
  try {
    await page.goto(`${baseUrl}/customer/home?showGuide=true`);
    const next = page.getByRole('button', { name: 'NEXT', exact: true });
    const spotlight = page.getByTestId('app-guide-spotlight');
    for (let step = 0; step < 3; step++) await next.click();
    await page.getByText('Ordering Again?', { exact: true }).waitFor();
    const row = page.getByText('Quick order', { exact: true }).locator('..');
    await page.waitForFunction(element => {
      const hole = document.querySelector('[data-testid="app-guide-spotlight"]').getBoundingClientRect();
      return hole.height > 150 && hole.top < 35 && element.getBoundingClientRect().top > 200;
    }, await row.elementHandle());

    // Delay the real scroll command so layout reads can repeat the old bounds.
    await row.evaluate(element => {
      let scrollView = element.parentElement;
      while (scrollView && !['auto', 'scroll'].includes(getComputedStyle(scrollView).overflowY)) {
        scrollView = scrollView.parentElement;
      }
      if (!scrollView) throw new Error('Could not find the Home scroll view');
      const scroll = scrollView.scroll.bind(scrollView);
      scrollView.scroll = options => setTimeout(() => scroll(options), 180);
    });

    async function expectQuickOrderSpotlight() {
      const target = await row.elementHandle();
      await page.waitForFunction(element => element.getBoundingClientRect().top < 60, target);
      try {
        await page.waitForFunction(element => {
          const bounds = element.getBoundingClientRect();
          const hole = document.querySelector('[data-testid="app-guide-spotlight"]').getBoundingClientRect();
          return Math.abs(hole.top - bounds.top + 6) < 2 && Math.abs(hole.bottom - bounds.bottom - 6) < 2;
        }, target, { timeout: 2_500 });
      } catch (error) {
        throw new Error(`Quick Order row y=${(await row.boundingBox()).y}, spotlight y=${(await spotlight.boundingBox()).y}`, { cause: error });
      }
    }

    await next.click();
    await expectQuickOrderSpotlight();
    assert.ok(await page.getByTestId('mascot-confident').locator('svg path').count() > 100);
    await next.click();
    assert.ok(await page.getByTestId('mascot-wink-and-point').locator('svg path').count() > 100);
    await page.waitForFunction(element => element.getBoundingClientRect().top > 200, await row.elementHandle());
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expectQuickOrderSpotlight();
  } finally { await context.close(); }
});

test('customer guide uses the real active order list and honors reduced motion on a short viewport', { timeout: 15_000 }, async () => {
  const { context, page, errors } = await newContext(sessionFor('customer'), {
    viewport: { width: 320, height: 480 },
    reducedMotion: 'reduce',
    orders: [{ id: 'test-order', status: 'Pending', cylinder_size: '11kg', quantity: 1, requested_at: '2026-11-13T00:00:00Z', total_amount: 659, payment_method: 'Cash on Delivery' }],
  });
  try {
    await page.goto(`${baseUrl}/customer/home?showGuide=true`);
    const next = page.getByRole('button', { name: 'NEXT', exact: true });
    await next.click();
    await next.click();
    await page.getByText('Active Orders (1)', { exact: true }).waitFor();
    await page.getByText('Status: Pending', { exact: true }).waitFor();
    const spotlight = page.getByTestId('app-guide-spotlight');
    await page.waitForFunction(() => Number(document.querySelector('[data-testid="app-guide-spotlight"]').getAttribute('y')) > 140);
    await spotlight.evaluate(element => {
      globalThis.guideFrames = [];
      new MutationObserver(() => globalThis.guideFrames.push(Number(element.getAttribute('y')))).observe(element, { attributes: true });
    });
    await next.click();
    await page.waitForFunction(() => Number(document.querySelector('[data-testid="app-guide-spotlight"]').getAttribute('y')) < 40);
    assert.ok((await page.evaluate(() => globalThis.guideFrames)).every(y => y < 40 || y > 140));
    const card = page.getByTestId('app-guide-card');
    const mascot = card.locator('[data-testid^="mascot-"]');
    const hole = await spotlight.boundingBox();
    assert.ok(hole.height > 0 && hole.y + hole.height < (await mascot.boundingBox()).y);
    await next.click();
    await next.click();
    await next.click();
    await page.getByRole('button', { name: 'DONE' }).click();
    await card.waitFor({ state: 'hidden' });
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

test('the customer can choose a delivery pin in the browser', { timeout: 15_000 }, async () => {
  const { context, page } = await newContext(sessionFor('customer'), { viewport: { width: 320, height: 568 } });
  try {
    await context.route('https://unpkg.com/maplibre-gl@*/dist/maplibre-gl.js', route => route.fulfill({
      contentType: 'application/javascript',
      body: `window.maplibregl = {
        Map: class {
          touchZoomRotate = { disableRotation() {} };
          constructor() { const canvas = document.createElement('canvas'); canvas.style.cssText = 'width:100%;height:100%;display:block'; document.querySelector('#map').append(canvas); }
          on(event, listener) {
            if (event === 'load') setTimeout(listener, 0);
            if (event === 'click') document.querySelector('canvas').onclick = () => listener({ lngLat: { lat: 14.604, lng: 120.99 } });
          }
          resize() {}
          easeTo() {}
        },
        Marker: class {
          setLngLat(position) { this.position = { lng: position[0], lat: position[1] }; return this; }
          getLngLat() { return this.position; }
          addTo() { return this; }
          on() {}
        },
      };`,
    }));
    await context.route('https://nominatim.openstreetmap.org/reverse?*', route => route.fulfill({
      json: { address: { road: 'Test delivery street' } },
    }));
    await page.goto(`${baseUrl}/customer/order`);
    await page.getByRole('button', { name: 'Add another address' }).click();
    await page.getByRole('button', { name: 'Choose address on map' }).click();
    const picker = page.getByText('Choose delivery location', { exact: true });
    await picker.waitFor();
    assert.equal(await page.getByText('React Native WebView does not support this platform.').count(), 0);
    const confirm = page.getByText('Use this location', { exact: true });
    const map = page.frameLocator('iframe[title="Delivery location map"]').locator('canvas');
    await map.click();
    await confirm.click();
    await page.locator('input[value="Test delivery street"]').waitFor();
  } finally { await context.close(); }
});

test('a Delivery Rider goes Available without a vehicle and confirms an ambiguous GPS match', { timeout: 15_000 }, async () => {
  const offline = driverDashboard();
  offline.deliveryRider.vehicle = null;
  const assignment = { serviceRequestId: 'order-a', srCode: 'SR-10001', customerName: 'Test customer', deliveryAddress: 'Test address',
    cylinderSize: '11kg', quantity: 1, requestedAt: new Date().toISOString() };
  const offered = {
    ...offline,
    deliveryRider: { ...offline.deliveryRider, availability: 'Available' },
    currentOffer: { offerId: 'test-offer', expiresAt: new Date(Date.now() + 60_000).toISOString(), assignment },
  };
  const choices = [{ id: 'motorcycle-a', label: 'ABC 123' }, { id: 'motorcycle-b', label: 'DEF 456' }];
  const { context, page } = await newContext(sessionFor('driver'), { dashboard: offline, viewport: { width: 320, height: 568 } });
  try {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 14.6, longitude: 121, accuracy: 10 });
    await context.route('**/api/delivery-rider/availability', route => {
      assert.deepEqual(route.request().postDataJSON(), { available: true });
      return route.fulfill({ json: offered });
    });
    const writes = [];
    await context.route('**/api/delivery-rider/offers/test-offer/accept', route => {
      const input = route.request().postDataJSON();
      writes.push(input);
      if (!input.vehicleId) return route.fulfill({ json: { ...offered, vehicleChoices: choices } });
      assert.deepEqual(input, { vehicleId: 'motorcycle-b' });
      return route.fulfill({ json: {
        ...driverDashboard({ ...assignment, vehicleLabel: 'DEF 456', dispatchedAt: new Date().toISOString(), inTransitAt: null }),
        vehicleChoices: null,
      } });
    });
    await page.goto(`${baseUrl}/delivery-rider/home`);
    await page.getByText('No vehicle assigned', { exact: true }).waitFor();
    await page.getByText('Go Available', { exact: true }).click();
    await page.getByRole('button', { name: 'Accept offer', exact: true }).click();
    await page.getByText('Confirm your motorcycle', { exact: true }).waitFor();
    const confirm = page.getByRole('button', { name: 'Confirm and accept', exact: true });
    assert.equal(await confirm.isDisabled(), true);
    await page.getByRole('radio', { name: 'DEF 456' }).click();
    await confirm.click();
    await expectPath(page, '/delivery-rider/delivery');
    await page.getByText('DEF 456', { exact: true }).waitFor();
    assert.deepEqual(writes, [{}, { vehicleId: 'motorcycle-b' }]);
  } finally { await context.close(); }
});

test('payment sheet slides over a stationary fading backdrop', { timeout: 15_000 }, async () => {
  const { context, page } = await newContext(sessionFor('customer'), { viewport: { width: 375, height: 625 } });
  try {
    await context.route('**/api/branches/public', route => route.fulfill({ json: { branches: [
      { id: 'test-branch', name: 'Test branch', address: 'Test address', city: null, province: null },
    ] } }));
    await context.route('**/api/prices/for-branch/test-branch', route => route.fulfill({ json: {
      prices: ['50kg', '22kg', '11kg', '5kg', '2.7kg'].map(cylinder_size => ({ cylinder_size, unit_price: 1200 })),
    } }));
    await page.goto(`${baseUrl}/customer/order`);
    await page.getByText('Choose cylinders', { exact: true }).click();
    await page.getByRole('button', { name: 'Select 11 KG cylinder' }).click();
    await page.getByText('Review order', { exact: true }).click();
    await page.getByText('Deliver now', { exact: true }).click();
    await page.getByRole('button', { name: 'REVIEW ORDER', exact: true }).click();
    const open = page.getByText('See all', { exact: true });
    await open.waitFor();
    await page.evaluate(() => {
      const frames = [];
      window.paymentFrames = frames;
      function record() {
        const backdrop = document.querySelector('[data-testid="payment-sheet-backdrop"]');
        const panel = document.querySelector('[data-testid="payment-sheet-panel"]');
        if (backdrop && panel) {
          const bounds = backdrop.getBoundingClientRect();
          frames.push({ opacity: Number(getComputedStyle(backdrop).opacity), top: bounds.top, height: bounds.height, panelTop: panel.getBoundingClientRect().top });
        }
        requestAnimationFrame(record);
      }
      requestAnimationFrame(record);
    });
    await open.click();
    const backdrop = page.getByTestId('payment-sheet-backdrop');
    await page.getByText('Select Payment Method', { exact: true }).waitFor();
    await page.waitForFunction(() => window.paymentFrames.some(frame => frame.opacity === 1), null, { timeout: 2_000 });
    const frames = await page.evaluate(() => window.paymentFrames);
    assert.ok(frames.some(frame => frame.opacity > 0 && frame.opacity < 1 && frame.panelTop > frames.at(-1).panelTop));
    assert.ok(frames.every(frame => frame.top === 0 && frame.height === 625));
    const panel = page.getByTestId('payment-sheet-panel');
    // Online payment is being retired: it stays visible but disabled, marked Coming soon.
    const online = panel.getByRole('radio', { name: /Online payment/ });
    assert.equal(await online.isDisabled(), true);
    await panel.getByText('COMING SOON', { exact: true }).waitFor({ timeout: 3_000 });
    await panel.getByText('SAVE CHANGES', { exact: true }).click({ timeout: 3_000 });
    await backdrop.waitFor({ state: 'detached' });
    assert.equal(await page.getByText('Online payment — GCash, Maya, or QR Ph', { exact: true }).count(), 0);
  } finally { await context.close(); }
});

test('the customer guide fits a narrow Safari viewport and highlights the live controls', { timeout: 20_000 }, async () => {
  const safari = await webkit.launch();
  try {
    const { page } = await newContext(sessionFor('customer'), {
      browserInstance: safari, device: devices['iPhone SE'], viewport: { width: 320, height: 568 }, reducedMotion: 'reduce',
    });
    await page.goto(`${baseUrl}/customer/home?showGuide=true`);
    const next = page.getByRole('button', { name: 'NEXT', exact: true });
    const spotlight = page.getByTestId('app-guide-spotlight');
    const card = page.getByTestId('app-guide-card');
    const expectSpotlight = async target => {
      await page.waitForFunction(element => {
        const hole = document.querySelector('[data-testid="app-guide-spotlight"]').getBoundingClientRect();
        const bounds = element.getBoundingClientRect();
        return hole.top <= bounds.top && hole.bottom >= bounds.bottom && hole.left <= bounds.left && hole.right >= bounds.right;
      }, await target.elementHandle(), { timeout: 2_000 });
    };
    await next.click();
    await expectSpotlight(page.getByText('Household rewards', { exact: true }));
    await next.click();
    await expectSpotlight(page.getByText('Active Orders (0)', { exact: true }));
    await page.setViewportSize({ width: 320, height: 385 });
    await expectSpotlight(page.getByText('Active Orders (0)', { exact: true }));
    await page.waitForFunction(() => {
      const card = document.querySelector('[data-testid="app-guide-card"]').getBoundingClientRect();
      return card.left >= 12 && card.right <= 308 && card.bottom <= 373;
    }, null, { timeout: 2_000 }).catch(async error => {
      const sizes = await page.evaluate(() => ({ innerHeight, height: visualViewport.height, scale: visualViewport.scale, offset: visualViewport.offsetTop, root: document.querySelector('#root').clientHeight }));
      throw new Error(`Guide card ${JSON.stringify(await card.boundingBox())}, viewport ${JSON.stringify(sizes)}`, { cause: error });
    });
    await page.getByRole('button', { name: 'Close guide' }).click();
    await spotlight.waitFor({ state: 'hidden' });
    for (const name of ['Home', 'More']) {
      const tab = await page.getByRole('button', { name, exact: true }).boundingBox();
      assert.ok(tab.x >= 12 && tab.x + tab.width <= 308, `${name} should fit inside the tab bar`);
    }
  } finally { await safari.close(); }
});

test('History tab shows a red bubble counting only in-progress orders', { timeout: 15_000 }, async () => {
  const order = (id, status) => ({ id, status, cylinder_size: '11kg', quantity: 1, requested_at: '2026-11-13T00:00:00Z', total_amount: 659, payment_method: 'Cash on Delivery' });
  const withActive = await newContext(sessionFor('customer'), {
    orders: [order('pending-order', 'Pending'), order('en-route-order', 'En Route'), order('delivered-order', 'Delivered'), order('cancelled-order', 'Cancelled')],
  });
  try {
    await withActive.page.goto(`${baseUrl}/customer/home`);
    const badge = withActive.page.getByTestId('history-badge');
    await badge.waitFor({ timeout: 5_000 });
    assert.equal(await badge.innerText(), '2');
    await withActive.page.getByRole('button', { name: 'History, 2 active orders' }).waitFor();
  } finally { await withActive.context.close(); }

  const allClosed = await newContext(sessionFor('customer'), {
    orders: [order('delivered-order', 'Delivered'), order('cancelled-order', 'Cancelled')],
  });
  try {
    await allClosed.page.goto(`${baseUrl}/customer/home`);
    await allClosed.page.getByRole('button', { name: 'History', exact: true }).waitFor();
    assert.equal(await allClosed.page.getByTestId('history-badge').count(), 0);
  } finally { await allClosed.context.close(); }
});
