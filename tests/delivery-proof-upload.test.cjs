const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function loadApi(os, apiFetch) {
  const filename = path.resolve(__dirname, '../src/lib/deliveryRiderApi.ts');
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  const source = new Module(filename, module);
  source.require = (id) => {
    if (id === 'react-native') return { Platform: { OS: os } };
    if (id === '@/lib/api') return { apiFetch, apiErrorMessage: (data, fallback) => data?.message ?? fallback };
    throw new Error(`Unexpected dependency: ${id}`);
  };
  source._compile(compiled.outputText, filename);
  return source.exports;
}

const photo = { uri: 'data:image/jpeg;base64,/9j/2Q==', fileName: 'delivery-proof.jpg', mimeType: 'image/jpeg' };

test('browser proof submission sends JPEG bytes as a multipart file, not a text field', async () => {
  let requests = 0;
  const api = loadApi('web', async (url, init) => {
    requests++;
    assert.equal(url, '/delivery-rider/service-requests/test-request/deliver');
    assert.equal(init.method, 'POST');
    // Parse the actual wire representation as the API multipart parser does.
    const parsed = await new Response(init.body).formData();
    const proof = parsed.get('proof');
    assert.ok(proof instanceof File, 'A delivery proof photo is required: proof arrived as text instead of a file');
    assert.equal(proof.name, photo.fileName);
    assert.equal(proof.type, 'image/jpeg');
    assert.deepEqual(Buffer.from(await proof.arrayBuffer()), Buffer.from('/9j/2Q==', 'base64'));
    return Response.json({ saved: true });
  });
  assert.deepEqual(await api.submitDeliveredWithProof('test-request', photo), { saved: true });
  assert.equal(requests, 1);
});

test('native proof submission keeps the file descriptor required by native XHR', async () => {
  const originalFormData = global.FormData;
  class NativeFormData {
    parts = [];
    append(...part) { this.parts.push(part); }
  }
  global.FormData = NativeFormData;
  try {
    const api = loadApi('ios', async (_url, init) => {
      assert.deepEqual(init.body.parts, [['proof', { uri: 'file:///proof.jpg', name: photo.fileName, type: photo.mimeType }]]);
      return Response.json({ saved: true });
    });
    await api.submitDeliveredWithProof('test-request', { ...photo, uri: 'file:///proof.jpg' });
  } finally { global.FormData = originalFormData; }
});

test('missing or unreadable browser photos do not submit a delivery', async () => {
  const api = loadApi('web', () => { throw new Error('Delivery endpoint must not be called'); });
  await assert.rejects(api.submitDeliveredWithProof('test-request', { ...photo, uri: '' }), /Choose a delivery photo/);
  await assert.rejects(api.submitDeliveredWithProof('test-request', { ...photo, uri: 'data:image/jpeg;base64,' }), /photo.*empty|empty.*photo/i);
});
