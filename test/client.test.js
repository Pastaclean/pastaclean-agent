import test from 'node:test';
import assert from 'node:assert/strict';
import { PastacleanClient } from '../src/client.js';

const KEY = 'pca_0123abcd_' + 'A'.repeat(40);

test('falscher Schlüssel → Fehler vor jedem Request', () => {
  assert.throws(() => new PastacleanClient({ apiKey: 'nope' }), /PASTACLEAN_API_KEY/);
});

test('http (nicht localhost) wird abgelehnt', () => {
  assert.throws(() => new PastacleanClient({ apiKey: KEY, baseUrl: 'http://evil.example' }), /https/);
});

test('Header, keine Umleitung, Idempotency-Key bei Bestellung', async () => {
  const calls = [];
  const fetchImpl = async (url, opt) => { calls.push({ url, opt }); return { ok: true, status: 200, json: async () => ({ ok: 1 }) }; };
  const c = new PastacleanClient({ apiKey: KEY, baseUrl: 'https://www.pastaclean.tv/egal/pfad', fetchImpl });
  await c.createOrder([{ productId: 'a'.repeat(32), quantity: 1 }], 'idem-12345678');
  assert.equal(calls[0].url, 'https://www.pastaclean.tv/agent-api/v1/orders');
  assert.equal(calls[0].opt.redirect, 'error');
  assert.equal(calls[0].opt.headers.Authorization, 'Bearer ' + KEY);
  assert.equal(calls[0].opt.headers['Idempotency-Key'], 'idem-12345678');
});

test('API-Fehler wird mit Code weitergereicht', async () => {
  const fetchImpl = async () => ({ ok: false, status: 403, json: async () => ({ error: { code: 'order_limit', message: 'zu teuer' } }) });
  const c = new PastacleanClient({ apiKey: KEY, fetchImpl });
  await assert.rejects(c.quote([]), (e) => e.code === 'order_limit' && e.status === 403);
});
