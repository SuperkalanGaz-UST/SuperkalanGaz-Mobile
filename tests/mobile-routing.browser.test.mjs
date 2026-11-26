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
  browser = process.env.TEST_MOBILE_BROWSER === 'webkit'
    ? await webkit.launch({ headless: true })
    : await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL });
});

after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

function sessionFor(role, status = 'Active', accepted = false, sessionId = '00000000-0000-4000-8000-000000000006') {
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
    access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, exp: expiresAt, role: 'authenticated', session_id: sessionId })}.synthetic-test-signature`,
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
      if (url.pathname === '/api/auth/mobile/sign-in') return route.fulfill({ json: {
        access_token: session.access_token, refresh_token: session.refresh_token,
      } });
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
    requests.length = 0;
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

test('customer signup collects details after notice acceptance and sends its version', { timeout: 30_000 }, async () => {
  const { context, page } = await newContext(sessionFor('customer'), { signedOut: true });
  try {
    const noticeText = 'Registration notice for this test only.';
    let registrations = 0;
    await context.route('**/api/auth/registration-privacy-notice', route => route.fulfill({
      json: { version: 'test-v1', text: noticeText },
    }));
    await context.route('**/api/auth/register', route => {
      registrations++;
      assert.equal(route.request().method(), 'POST');
      const { privacyNoticeVersion, privacyConsentAccepted } = route.request().postDataJSON();
      assert.equal(privacyNoticeVersion, 'test-v1');
      assert.equal(privacyConsentAccepted, true);
      return route.fulfill({ status: 201, json: { needsConfirmation: true } });
    });
    await page.goto(`${baseUrl}/signup`);
    await page.getByText(noticeText).waitFor();
    const consent = page.getByRole('checkbox');
    assert.equal(await consent.getAttribute('aria-checked'), 'false');
    assert.equal(await page.getByPlaceholder('First name').count(), 0);
    assert.equal(registrations, 0);

    await consent.click();
    await page.getByPlaceholder('First name').fill('Ana');
    await page.getByPlaceholder('Last name').fill('Santos');
    await page.getByPlaceholder('name@example.com').fill('signup-test@example.invalid');
    await page.getByPlaceholder('Street, barangay, city').fill('Test address');
    await page.getByPlaceholder('At least 8 characters').fill('test-password');
    await page.getByText('Create account', { exact: true }).click();
    await page.getByText('Verify your email', { exact: true }).waitFor();
    assert.equal(registrations, 1);
  } finally { await context.close(); }
});

test('customer signup demo uses fictional details without contacting Auth or the API', { timeout: 15_000 }, async () => {
  const { context, page, requests, errors } = await newContext(sessionFor('customer'), { signedOut: true });
  const authRequests = [];
  page.on('request', request => {
    if (new URL(request.url()).origin === authOrigin) authRequests.push(request.method());
  });
  try {
    await page.goto(`${baseUrl}/demo/signup`);
    await page.getByRole('heading', { name: 'Demo privacy notice' }).waitFor();
    assert.equal(await page.getByText('customer@example.invalid', { exact: true }).count(), 0);

    await page.getByRole('button', { name: 'I understand', exact: true }).click();
    await page.getByText('customer@example.invalid', { exact: true }).waitFor();
    assert.equal(await page.locator('input, textarea').count(), 0);
    await page.getByRole('button', { name: 'Finish demo', exact: true }).click();
    await page.getByRole('heading', { name: 'Demo complete' }).waitFor();

    await page.reload();
    await page.getByRole('heading', { name: 'Demo privacy notice' }).waitFor();
    await page.getByRole('button', { name: 'Back to sign in' }).click();
    await expectPath(page, '/login');
    assert.deepEqual(authRequests, []);
    assert.deepEqual(requests, []);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('Commercial Customer guide dims the bottom navigation and restores the white Home background', { timeout: 15_000 }, async () => {
  const session = sessionFor('customer');
  session.user.app_metadata.account_type = 'commercial';
  const { context, page } = await newContext(session, { viewport: { width: 393, height: 896 }, reducedMotion: 'reduce' });
  try {
    await page.goto(`${baseUrl}/customer/home?showGuide=true`);
    const guide = page.getByTestId('app-guide-card');
    await guide.getByText('Hi! Welcome to Superkalan Gaz App', { exact: true }).waitFor();
    const guideScreenshot = await page.screenshot({ scale: 'css' });
    await guide.getByRole('button', { name: 'Close guide' }).click();
    await guide.waitFor({ state: 'detached' });
    await page.getByText('Commercial reward', { exact: true }).waitFor();
    await page.getByText('Quick order', { exact: true }).waitFor();

    const screenshot = await page.screenshot({ scale: 'css' });
    const readPixels = async (png, coords) => page.evaluate(async ({ png, coords }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${png}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const drawing = canvas.getContext('2d');
      drawing.drawImage(image, 0, 0);
      return coords.map(([x, y]) => Array.from(drawing.getImageData(x, y, 1, 1).data).slice(0, 3));
    }, { png: png.toString('base64'), coords });
    const pixels = await readPixels(screenshot, [[376, 70], [376, 750], [376, 800]]);
    const [hero, belowQuickOrder, aboveNavigation] = pixels;
    assert.ok(hero[2] > hero[0], 'The hero keeps its blue background');
    assert.deepEqual(belowQuickOrder, [255, 255, 255], 'The area below Quick order is white');
    assert.deepEqual(aboveNavigation, [255, 255, 255], 'The white background reaches the bottom navigation');
    const bottomPixels = [[50, 865], [376, 891]];
    const dimmed = await readPixels(guideScreenshot, bottomPixels);
    const restored = await readPixels(screenshot, bottomPixels);
    for (const [index, pixel] of dimmed.entries()) {
      assert.ok(pixel.every((channel, component) => Math.abs(channel - restored[index][component] * 0.38) <= 3),
        `Welcome backdrop covers ${bottomPixels[index]} (dimmed ${pixel}, restored ${restored[index]})`);
    }
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

    await next.click();
    await card.getByText('Need Help?', { exact: true }).waitFor();
    const helpButton = page.locator('[aria-label="Open app guide"]');
    await page.waitForFunction(button => {
      const hole = document.querySelector('[data-testid="app-guide-spotlight"]').getBoundingClientRect();
      const bounds = button.getBoundingClientRect();
      return hole.left <= bounds.left && hole.right >= bounds.right && hole.top <= bounds.top && hole.bottom >= bounds.bottom;
    }, await helpButton.elementHandle());
    await back.click();
    await card.getByText('Navigate with Ease!', { exact: true }).waitFor();
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
      window.testGpsFixRequests = 0;
      window.testGpsLatitude = 14.275;
      const oldTimestamp = Date.now() - 10_000;
      navigator.geolocation.getCurrentPosition = (callback, _error, options) => {
        if (options.maximumAge !== 0) throw new Error('Expected a fresh fix');
        window.testGpsFixRequests++;
        setTimeout(() => callback({ coords: { latitude: window.testGpsLatitude, longitude: 120.98, accuracy: 8 }, timestamp: Date.now() }), 50);
      };
      let nextId = 0;
      navigator.geolocation.watchPosition = callback => {
        const id = ++nextId;
        window.testGpsWatchers.set(id, callback);
        // A watcher can initially return a cached fix. It must never replace the fresh reading.
        setTimeout(() => callback({ coords: { latitude: 14.275, longitude: 120.98, accuracy: 8 }, timestamp: oldTimestamp }), 50);
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
    assert.deepEqual(samples.map(sample => sample.latitude), [14.275]);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.getByText('Operational GPS is paused. Return to the app to share your location.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.testGpsWatchers.size), 0);
    await page.evaluate(() => {
      window.testGpsLatitude = 14.5995;
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.getByText('Operational GPS is active for dispatch.', { exact: true }).waitFor();
    assert.deepEqual(samples.map(sample => sample.latitude), [14.275, 14.5995]);
    assert.equal(await page.evaluate(() => window.testGpsFixRequests), 2);
    await page.getByText('Go Offline', { exact: true }).click();
    await page.getByText('Operational GPS starts when you go Available.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.testGpsWatchers.size), 0);
    assert.ok(await page.evaluate(() => window.testGpsClears >= 2));
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('the replaced Delivery Rider device returns to sign-in on resume', { timeout: 20_000 }, async () => {
  const previousSession = sessionFor('driver');
  const nextSession = sessionFor('driver', 'Active', false, '00000000-0000-4000-8000-000000000007');
  const previous = await newContext(previousSession);
  const next = await newContext(nextSession, { signedOut: true });
  let authorizedToken = previousSession.access_token;
  try {
    for (const { context } of [previous, next]) {
      await context.route('**/api/delivery-rider/me', route => {
        if (route.request().headers().authorization === `Bearer ${authorizedToken}`) {
          return route.fulfill({ json: driverDashboard() });
        }
        return route.fulfill({ status: 401, json: {
          code: 'DELIVERY_RIDER_SESSION_REPLACED', message: 'This Delivery Rider session has ended. Sign in to use this device.',
        } });
      });
    }
    await next.context.route('**/api/auth/mobile/sign-in', route => {
      assert.equal(route.request().method(), 'POST');
      authorizedToken = nextSession.access_token;
      return route.fulfill({ json: { access_token: authorizedToken, refresh_token: nextSession.refresh_token } });
    });
    await previous.page.goto(`${baseUrl}/delivery-rider/home`);
    await previous.page.getByText('Go Available', { exact: true }).waitFor();
    await next.page.goto(`${baseUrl}/login`);
    await signIn(next.page);
    await next.page.getByText('Go Available', { exact: true }).waitFor();
    await previous.page.evaluate(() => {
      for (const state of ['hidden', 'visible']) {
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
        document.dispatchEvent(new Event('visibilitychange'));
      }
    });
    await previous.page.getByText('This Delivery Rider session has ended. Sign in to use this device.', { exact: true }).waitFor();
    await next.page.getByText('Go Available', { exact: true }).waitFor();
    assert.deepEqual([...previous.errors, ...next.errors], []);
  } finally {
    await Promise.all([previous.context.close(), next.context.close()]);
  }
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

test('tracking back responds near the arrow and returns to the previous Home entry', { timeout: 15_000 }, async () => {
  const order = {
    id: '00000000-0000-4000-8000-000000000006', status: 'Pending',
    cylinder_size: '11kg', quantity: 1, requested_at: '2026-11-20T01:00:00Z',
    payment_method: 'Cash on Delivery',
  };
  const { context, page, requests } = await newContext(sessionFor('customer'), {
    orders: [order], viewport: { width: 512, height: 1138 }, reducedMotion: 'reduce', device: { hasTouch: true },
  });
  try {
    await page.goto(`${baseUrl}/customer/home`);
    await page.getByRole('button', { name: 'Close guide', exact: true }).click();
    const activeOrder = page.getByRole('button', { name: 'View active order status', exact: true });
    await activeOrder.click();
    const title = page.getByText('Track my Order', { exact: true });
    const header = title.locator('..');
    await header.tap({ position: { x: 57, y: 7 } });
    await activeOrder.waitFor({ timeout: 3_000 });
    await expectPath(page, '/customer/home');

    await page.goForward();
    await title.waitFor({ timeout: 3_000 });
    await page.getByRole('button', { name: 'Go back', exact: true }).click();
    await activeOrder.waitFor({ timeout: 3_000 });
    assert.equal(requests.some(request => request.method !== 'GET'), false);

    await page.goto(`${baseUrl}/customer/order/${order.id}`);
    await title.waitFor();
    await page.getByRole('button', { name: 'Go back', exact: true }).click();
    await expectPath(page, '/customer/home');
    await activeOrder.waitFor({ timeout: 3_000 });
  } finally { await context.close(); }
});

test('closing tracking after checkout returns to Home after placing just one order', { timeout: 15_000 }, async () => {
  const orders = [];
  const { context, page, requests } = await newContext(sessionFor('customer'), { orders, reducedMotion: 'reduce' });
  page.setDefaultTimeout(4_000);
  try {
    await context.route('**/api/branches/public', route => route.fulfill({ json: { branches: [
      { id: 'test-branch', name: 'Test branch', address: 'Test address', city: null, province: null },
    ] } }));
    await context.route('**/api/prices/for-branch/test-branch', route => route.fulfill({ json: {
      prices: ['50kg', '22kg', '11kg', '5kg', '2.7kg'].map(cylinder_size => ({ cylinder_size, unit_price: 1200, available_qty: 4 })),
    } }));
    let submissions = 0;
    await context.route('**/api/service-requests/customer', route => {
      assert.equal(route.request().method(), 'POST');
      submissions++;
      const order = {
        id: '00000000-0000-4000-8000-000000000006', status: 'Pending',
        cylinder_size: '11kg', quantity: 1, requested_at: '2026-11-20T01:00:00Z', payment_method: 'Cash on Delivery',
      };
      orders.push(order);
      return route.fulfill({ status: 201, json: { serviceRequest: order } });
    });
    await page.goto(`${baseUrl}/customer/order`);
    await page.getByText('Choose cylinders', { exact: true }).click();
    await page.getByRole('button', { name: 'Select 11 KG cylinder' }).click();
    await page.getByText('Review order', { exact: true }).click();
    await page.getByText('Deliver now', { exact: true }).click();
    await page.getByRole('button', { name: 'REVIEW ORDER', exact: true }).click();
    await page.getByRole('button', { name: 'PLACE ORDER', exact: true }).click();
    await page.getByText('SEE ORDER RECEIPT', { exact: true }).click();
    await page.getByText('Track my Order', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Go back', exact: true }).click();
    await expectPath(page, '/customer/home');
    await page.getByRole('button', { name: 'View active order status', exact: true }).waitFor();
    assert.equal(submissions, 1);
    assert.equal(requests.some(request => request.method !== 'GET'), false, 'Leaving tracking makes no writes');
  } finally { await context.close(); }
});

test('customer tracking stays Preparing after rider acceptance and advances only when transit starts', { timeout: 30_000 }, async () => {
  const order = {
    id: '00000000-0000-4000-8000-000000000006', status: 'Pending',
    cylinder_size: '11kg', quantity: 1, requested_at: '2026-11-20T01:00:00Z',
    created_at: '2026-11-20T01:00:00Z', dispatched_at: null, in_transit_at: null, delivered_at: null,
    payment_method: 'Cash on Delivery', payment_status: 'Pending', rider_id: null,
    items: ['2.7kg', '5kg', '11kg', '22kg', '50kg'].map(cylinder_size => ({ cylinder_size, quantity: 1 })),
  };
  const { context, page, requests, errors } = await newContext(sessionFor('customer'), { orders: [order], reducedMotion: 'reduce' });
  page.setDefaultTimeout(8_000);
  let phase = 'pending order';
  try {
    await page.goto(`${baseUrl}/customer/order/${order.id}`);
    await page.getByText('Track my Order', { exact: true }).waitFor();
    const transit = page.getByText('Out for Delivery', { exact: true });
    assert.equal(await transit.evaluate(el => getComputedStyle(el).color), 'rgb(138, 143, 153)');
    assert.equal(await page.getByText('Order Confirmed', { exact: true }).evaluate(el => getComputedStyle(el).color), 'rgb(20, 50, 99)');

    // Accepting the offer assigns a rider and stamps dispatch, without starting transit.
    phase = 'accepted order';
    Object.assign(order, { status: 'Dispatched', dispatched_at: '2026-11-20T01:05:00Z', rider_id: 'rider-1' });
    await page.waitForFunction(() => [...document.querySelectorAll('*')].some(el =>
      el.textContent === 'Preparing' && getComputedStyle(el).color === 'rgb(20, 50, 99)'));
    assert.equal(await transit.evaluate(el => getComputedStyle(el).color), 'rgb(138, 143, 153)');
    assert.equal(await page.getByText('Your rider is on the way with your order!', { exact: true }).count(), 0);
    await page.reload();
    await page.getByText('Preparing', { exact: true }).waitFor();
    assert.equal(await transit.evaluate(el => getComputedStyle(el).color), 'rgb(138, 143, 153)');

    await page.goto(`${baseUrl}/customer/home`);
    phase = 'home card';
    const card = page.getByRole('button', { name: 'View active order status', exact: true });
    await card.getByText('Preparing', { exact: true }).waitFor();
    await card.getByText('5 cylinders', { exact: true }).waitFor();
    await card.getByText('1 × 2.7 kg', { exact: true }).waitFor();
    await card.getByText('1 × 50 kg', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Close guide', exact: true }).click();
    await page.getByTestId('app-guide-card').waitFor({ state: 'hidden' });
    await card.click();
    await page.getByText('Track my Order', { exact: true }).waitFor();

    // The rider's start action is the only transition to the travelling milestone.
    phase = 'started transit';
    Object.assign(order, { status: 'En Route', in_transit_at: '2026-11-20T01:10:00Z' });
    await page.getByText('Your rider is on the way with your order!', { exact: true }).waitFor();
    assert.equal(await transit.evaluate(el => getComputedStyle(el).color), 'rgb(20, 50, 99)');
    await page.getByText('Your rider has started the trip and is heading your way.', { exact: true }).waitFor();

    Object.assign(order, { status: 'Delivered', delivered_at: '2026-11-20T01:25:00Z' });
    phase = 'delivered order';
    await page.getByText('Delivery Complete!', { exact: true }).waitFor();
    assert.equal(requests.some(request => request.method !== 'GET'), false, 'Tracking must not create or advance delivery milestones');
    assert.deepEqual(errors, []);
  } catch (error) {
    throw new Error(`${phase}: ${page.url()}\n${(await page.locator('body').innerText()).slice(0, 1500)}`, { cause: error });
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

test('a Delivery Rider goes Available and accepts an offer without a motorcycle', { timeout: 15_000 }, async () => {
  const offline = driverDashboard();
  offline.deliveryRider.vehicle = null;
  const assignment = { serviceRequestId: 'order-a', srCode: 'SR-10001', customerName: 'Test customer', deliveryAddress: 'Test address',
    cylinderSize: '11kg', quantity: 1, requestedAt: new Date().toISOString() };
  const offered = {
    ...offline,
    deliveryRider: { ...offline.deliveryRider, availability: 'Available' },
    currentOffer: { offerId: 'test-offer', expiresAt: new Date(Date.now() + 60_000).toISOString(), assignment },
  };
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
      writes.push(route.request().postData());
      const accepted = driverDashboard({ ...assignment, dispatchedAt: new Date().toISOString(), inTransitAt: null });
      accepted.deliveryRider.vehicle = null;
      return route.fulfill({ json: accepted });
    });
    await page.goto(`${baseUrl}/delivery-rider/home`);
    await page.getByText('Go Available', { exact: true }).click();
    await page.getByRole('button', { name: 'Accept offer', exact: true }).click();
    await expectPath(page, '/delivery-rider/delivery');
    await page.getByText('SR-10001', { exact: true }).first().waitFor();
    assert.equal(await page.getByText('Assigned vehicle', { exact: true }).count(), 0);
    assert.deepEqual(writes, [null]);
  } finally { await context.close(); }
});

async function recordSheetFrames(page, id) {
  await page.evaluate(id => {
    window.sheetFrames = [];
    function record() {
      const backdrop = document.querySelector(`[data-testid="${id}-backdrop"]`);
      const panel = document.querySelector(`[data-testid="${id}-panel"]`);
      if (backdrop && panel) {
        const { top, height } = backdrop.getBoundingClientRect();
        window.sheetFrames.push({ top, height, opacity: Number(getComputedStyle(backdrop).opacity), panelTop: panel.getBoundingClientRect().top });
      }
      requestAnimationFrame(record);
    }
    requestAnimationFrame(record);
  }, id);
}

async function assertSheetOpened(page) {
  await page.waitForFunction(() => window.sheetFrames.some(frame => frame.opacity === 1), null, { timeout: 3_000 });
  const frames = await page.evaluate(() => window.sheetFrames);
  assert.ok(frames.some(frame => frame.opacity > 0 && frame.opacity < 1 && frame.panelTop > frames.at(-1).panelTop), 'Panel opens while backdrop fades');
}

async function assertSheetClosed(page, viewportHeight) {
  const frames = await page.evaluate(() => window.sheetFrames);
  const fullyOpen = frames.findIndex(frame => frame.opacity === 1);
  assert.ok(frames.slice(fullyOpen + 1).some(frame => frame.opacity > 0 && frame.opacity < 1 && frame.panelTop > frames[fullyOpen].panelTop), 'Panel closes while backdrop fades');
  assert.ok(frames.every(frame => frame.top === 0 && frame.height === viewportHeight), 'Backdrop never moves');
}

test('delivery feedback slides over a stationary fading backdrop', { timeout: 15_000 }, async () => {
  const { context, page } = await newContext(sessionFor('customer'), { viewport: { width: 375, height: 625 }, orders: [{
    id: '00000000-0000-4000-8000-000000000011', sr_code: 'SR-RATING', status: 'Delivered',
    requested_at: new Date().toISOString(), delivered_at: new Date().toISOString(),
    cylinder_size: '11kg', quantity: 1, total_amount: 1200,
  }] });
  try {
    await page.goto(`${baseUrl}/customer/orders`);
    await page.getByText('Past Orders (1)', { exact: true }).click();
    await recordSheetFrames(page, 'feedback-sheet');
    await page.getByText('Rate this order', { exact: true }).click({ timeout: 3_000 });
    await page.getByText('How was your experience?', { exact: true }).waitFor();
    const backdrop = page.getByTestId('feedback-sheet-backdrop');
    assert.equal(await backdrop.count(), 1, 'The rating panel must use a separate stationary backdrop');
    await assertSheetOpened(page);
    await page.getByRole('button', { name: 'Close feedback' }).click();
    await backdrop.waitFor({ state: 'detached' });
    await assertSheetClosed(page, 625);
  } finally { await context.close(); }
});

test('Household Customers choose the pickup branch and preview the reward before redeeming', { timeout: 15_000 }, async () => {
  const { context, page } = await newContext(sessionFor('customer'), { viewport: { width: 375, height: 625 } });
  try {
    await context.route(url => url.pathname === '/api/loyalty/catalog', route => {
      assert.equal(new URL(route.request().url()).searchParams.get('byPickupBranch'), 'true');
      return route.fulfill({ json: {
        pickup_branches: [{ id: 'first', name: 'First branch' }, { id: 'chosen', name: 'Chosen branch' }],
        catalogItems: [
          { id: 'notebook-first', franchise_reward_id: 'notebook', branch_id: 'first', branch_name: 'First branch', name: 'Notebook and Pen', points_cost: 10, stock_qty: 0 },
          { id: 'notebook-chosen', franchise_reward_id: 'notebook', branch_id: 'chosen', branch_name: 'Chosen branch', name: 'Notebook and Pen', points_cost: 10, stock_qty: 3 },
        ],
      } });
    });
    await context.route('**/api/loyalty/me', route => route.fulfill({ json: { points_balance: 10 } }));
    let writes = 0;
    await context.route('**/api/loyalty/me/redemptions', route => {
      const payload = route.request().postDataJSON();
      assert.equal(payload.branchId, 'chosen');
      assert.equal(payload.catalogItemId, 'notebook-chosen');
      writes++;
      return route.fulfill({ status: 201, json: { redemption: { id: 'redemption', branch_id: 'chosen', branch_name: 'Chosen branch', catalog_item_name: 'Notebook and Pen', status: 'approved', redemption_code: 'ABC-123' } } });
    });
    await page.goto(`${baseUrl}/customer/rewards`);
    const picker = page.getByRole('button', { name: 'Choose a pickup branch', exact: true });
    await picker.click();
    await page.getByRole('radio', { name: 'First branch', exact: true }).click();
    await page.getByText('Out of stock', { exact: false }).waitFor();
    await page.getByRole('button', { name: 'Pickup branch: First branch' }).click();
    await page.getByRole('radio', { name: 'Chosen branch', exact: true }).click();
    await recordSheetFrames(page, 'reward-sheet');
    await page.getByText('Notebook and Pen', { exact: true }).click();
    await assertSheetOpened(page);
    const panel = page.getByTestId('reward-sheet-panel');
    await panel.getByTestId('reward-preview').locator('img').waitFor();
    await panel.getByText('Chosen branch', { exact: true }).waitFor();
    await panel.getByRole('button', { name: 'Close reward' }).click();
    await page.getByTestId('reward-sheet-backdrop').waitFor({ state: 'detached' });
    await assertSheetClosed(page, 625);
    await page.getByText('Notebook and Pen', { exact: true }).click();
    await panel.getByRole('button', { name: 'REDEEM', exact: true }).click();
    await panel.getByText('ABC-123', { exact: true }).waitFor();
    assert.equal(writes, 1);
  } finally { await context.close(); }
});

test('Commercial Customers pick the branch with the cycle they want to redeem', { timeout: 15_000 }, async () => {
  const session = sessionFor('customer');
  session.user.app_metadata.account_type = 'commercial';
  const { context, page } = await newContext(session);
  try {
    let issued = false;
    await context.route('**/api/loyalty/me', route => route.fulfill({ json: {
      commercial_accounts: [
        { branch_id: 'first', branch_name: 'First branch', completed_cycles: 0, current_cycle_count: 19 },
        { branch_id: 'chosen', branch_name: 'Chosen branch', completed_cycles: issued ? 0 : 1, current_cycle_count: 4 },
      ],
      commercial_purchases: [{ id: 'first-order', branch_id: 'first', counted_at: '2026-11-19' }],
      active_redemptions: issued ? [{ id: 'redemption', branch_id: 'chosen', branch_name: 'Chosen branch', status: 'approved', redemption_code: 'CBA-321' }] : [],
    } }));
    await context.route('**/api/loyalty/me/commercial-redemptions', route => {
      assert.deepEqual(route.request().postDataJSON(), { branchId: 'chosen' });
      issued = true;
      return route.fulfill({ status: 201, json: {} });
    });
    await page.goto(`${baseUrl}/customer/rewards`);
    await page.getByRole('button', { name: 'Choose a pickup branch' }).click();
    await page.getByRole('radio', { name: /First branch, 19 of 30/ }).click();
    await page.getByRole('progressbar', { name: '19 of 30 qualifying purchases' }).waitFor();
    await page.getByText('Qualifying purchase', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Pickup branch: First branch' }).click();
    await page.getByRole('radio', { name: /Chosen branch, 1 free cylinder available/ }).click();
    await page.getByRole('progressbar', { name: '4 of 30 qualifying purchases' }).waitFor();
    await page.getByText('No counted purchases yet.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Request free cylinder' }).click();
    await page.getByText('CBA-321', { exact: true }).waitFor();
    assert.equal(issued, true);
  } finally { await context.close(); }
});

test('payment sheet slides over a stationary fading backdrop', { timeout: 15_000 }, async () => {
  const { context, page } = await newContext(sessionFor('customer'), { viewport: { width: 375, height: 625 } });
  try {
    await context.route('**/api/branches/public', route => route.fulfill({ json: { branches: [
      { id: 'test-branch', name: 'Test branch', address: 'Test address', city: null, province: null },
    ] } }));
    await context.route('**/api/prices/for-branch/test-branch', route => route.fulfill({ json: {
      prices: ['50kg', '22kg', '11kg', '5kg', '2.7kg'].map(cylinder_size => ({
        cylinder_size, unit_price: 1200, available_qty: cylinder_size === '11kg' ? 1 : 0,
      })),
    } }));
    await page.goto(`${baseUrl}/customer/order`);
    await page.getByText('Choose cylinders', { exact: true }).click();
    assert.equal(await page.getByRole('button', { name: '5 KG cylinder, out of stock', exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: 'Select 11 KG cylinder' }).click();
    assert.equal(await page.getByRole('button', { name: 'Add one 11 KG cylinder', exact: true }).isDisabled(), true);
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

test('checkout refreshes stock after another order takes the last cylinder', { timeout: 15_000 }, async () => {
  const { context, page } = await newContext(sessionFor('customer'));
  try {
    page.setDefaultTimeout(4_000);
    let available = 1;
    await context.route('**/api/branches/public', route => route.fulfill({ json: { branches: [
      { id: 'test-branch', name: 'Test branch', address: 'Test address', city: null, province: null },
    ] } }));
    await context.route('**/api/prices/for-branch/test-branch', route => route.fulfill({ json: {
      prices: ['50kg', '22kg', '11kg', '5kg', '2.7kg'].map(cylinder_size => ({
        cylinder_size, unit_price: 1200, available_qty: cylinder_size === '11kg' ? available : 0,
      })),
    } }));
    await context.route('**/api/service-requests/customer', route => {
      assert.deepEqual(route.request().postDataJSON().items, [{ cylinderSize: '11kg', quantity: 1 }]);
      available = 0;
      return route.fulfill({ status: 409, json: { message: 'There is not enough 11kg cylinder stock at this branch.' } });
    });
    await page.goto(`${baseUrl}/customer/order`);
    await page.getByText('Choose cylinders', { exact: true }).click();
    await page.getByRole('button', { name: 'Select 11 KG cylinder' }).click();
    const review = page.getByText('Review order', { exact: true });
    await review.click();
    await page.getByText('Deliver now', { exact: true }).click();
    await page.getByRole('button', { name: 'REVIEW ORDER', exact: true }).click();
    await page.getByRole('button', { name: 'PLACE ORDER', exact: true }).click();
    await page.getByText('This branch is out of cylinder stock.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Add one 11 KG cylinder' }).isDisabled(), true);
    await review.click({ force: true });
    assert.equal(await page.getByText('Build your order', { exact: true }).isVisible(), true);
    await page.getByRole('button', { name: 'Remove one 11 KG cylinder' }).click();
    const soldOutCylinder = page.getByRole('button', { name: '11 KG cylinder, out of stock', exact: true });
    assert.equal(await soldOutCylinder.isVisible(), true);
    assert.equal(await soldOutCylinder.isDisabled(), true);
    available = 1;
    await page.getByRole('button', { name: /Refresh stock/ }).click();
    assert.equal(await page.getByRole('button', { name: 'Select 11 KG cylinder' }).isEnabled(), true);
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
