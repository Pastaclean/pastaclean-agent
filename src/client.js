// Dünner Client für die Pastaclean Agent-API (/agent-api/v1). Keine Logik, die Sicherheit liegt im Shop.
import { randomUUID } from 'node:crypto';

export class PastacleanClient {
  constructor({ baseUrl, apiKey, fetchImpl = globalThis.fetch, timeoutMs = 20000, clientTag = 'mcp' }) {
    this.clientTag = clientTag;
    if (!apiKey || !/^pca_[0-9a-f]{8}_[A-Za-z0-9]{40}$/.test(apiKey)) {
      throw new Error('PASTACLEAN_API_KEY fehlt oder hat ein falsches Format (pca_…). Schlüssel im Kundenkonto anlegen.');
    }
    const u = new URL(baseUrl || 'https://www.pastaclean.tv');
    if (u.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(u.hostname)) {
      throw new Error('PASTACLEAN_BASE_URL muss https sein.');
    }
    this.base = u.origin;
    this.key = apiKey;
    this.fetch = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async req(method, path, body, headers = {}) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), this.timeoutMs);
    try {
      const res = await this.fetch(this.base + '/agent-api/v1' + path, {
        method,
        signal: ctl.signal,
        redirect: 'error', // Schlüssel nie an eine Umleitung weitergeben
        headers: {
          Authorization: `Bearer ${this.key}`,
          'X-Agent-Client': typeof this.clientTag === 'function' ? this.clientTag() : this.clientTag,
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      let data;
      try { data = await res.json(); } catch { data = { error: { code: 'bad_response', message: `HTTP ${res.status}` } }; }
      if (!res.ok) {
        const e = new Error(data?.error?.message || `HTTP ${res.status}`);
        e.code = data?.error?.code || 'http_' + res.status;
        e.status = res.status;
        throw e;
      }
      return data;
    } finally {
      clearTimeout(t);
    }
  }

  me() { return this.req('GET', '/me'); }
  search(q, limit = 10) { return this.req('GET', `/products?${new URLSearchParams({ q, limit: String(limit) })}`); }
  product(id) { return this.req('GET', `/products/${encodeURIComponent(id)}`); }
  resolve(url) { return this.req('POST', '/products/resolve', { url }); }
  quote(items) { return this.req('POST', '/quote', { items }); }
  createOrder(items, idempotencyKey = randomUUID()) {
    return this.req('POST', '/orders', { items }, { 'Idempotency-Key': idempotencyKey });
  }
  orders() { return this.req('GET', '/orders'); }
  order(id) { return this.req('GET', `/orders/${encodeURIComponent(id)}`); }
}
