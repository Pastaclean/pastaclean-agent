import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const ID = z.string().regex(/^[0-9a-f]{32}$/, 'Shopware product id (32 hex chars)');
const ITEMS = z.array(z.object({ productId: ID, quantity: z.number().int().min(1).max(50) })).min(1).max(20);

const ok = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const fail = (e) => ({ isError: true, content: [{ type: 'text', text: JSON.stringify({ error: e.code || 'error', message: e.message }) }] });
const wrap = (fn) => async (args) => { try { return ok(await fn(args)); } catch (e) { return fail(e); } };

import { createRequire } from 'node:module';
const VERSION = createRequire(import.meta.url)('../package.json').version;

export function createServer(client) {
  const s = new McpServer({ name: 'pastaclean', version: VERSION });
  // Kampagnencode wie bei der App: mcp-<version>+<host-app>, z. B. mcp-0.1.2+claude-ai
  client.clientTag = () => {
    const host = s.server.getClientVersion?.()?.name || 'unknown';
    return `mcp-${VERSION}+${host}`;
  };

  s.registerTool('pastaclean_whoami', {
    title: 'Who am I / my limits',
    description: 'Shows which Pastaclean customer this key belongs to and its limits (per order, per month, reorder-only). Call this first.',
    inputSchema: {},
    annotations: { readOnlyHint: true },
  }, wrap(() => client.me()));

  s.registerTool('pastaclean_search', {
    title: 'Search products',
    description: 'Search the Pastaclean shop. Prices and availability are live from the shop.',
    inputSchema: { query: z.string().min(1).max(100), limit: z.number().int().min(1).max(20).optional() },
    annotations: { readOnlyHint: true },
  }, wrap(({ query, limit }) => client.search(query, limit ?? 10)));

  s.registerTool('pastaclean_get_product', {
    title: 'Product details',
    description: 'Details for one product id (price, list price, stock, description).',
    inputSchema: { productId: ID },
    annotations: { readOnlyHint: true },
  }, wrap(({ productId }) => client.product(productId)));

  s.registerTool('pastaclean_check_link', {
    title: 'Check a product link',
    description: 'Resolve a pastaclean.tv product link the user sent you: returns the product with live price and availability. Links to other websites are rejected.',
    inputSchema: { url: z.string().url().max(2000) },
    annotations: { readOnlyHint: true },
  }, wrap(({ url }) => client.resolve(url)));

  s.registerTool('pastaclean_quote', {
    title: 'Price a cart (no order)',
    description: 'Calculates total incl. shipping for the given items WITHOUT ordering, and says whether the key is allowed to order it. Always quote and show the user the total before ordering. If shippingHint is set, tell the user how much is missing for free shipping (do not add items on your own).',
    inputSchema: { items: ITEMS },
    annotations: { readOnlyHint: true },
  }, wrap(({ items }) => client.quote(items)));

  s.registerTool('pastaclean_place_order', {
    title: 'Place order',
    description: 'Places a real order for the customer. Only call after the user explicitly confirmed the quoted items and total. The order is NOT paid: give the user the returned paymentUrl so they can pay themselves. Pass the same idempotencyKey when retrying so no duplicate order is created.',
    inputSchema: { items: ITEMS, idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{8,100}$/) },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, wrap(({ items, idempotencyKey }) => client.createOrder(items, idempotencyKey)));

  s.registerTool('pastaclean_list_orders', {
    title: 'My agent orders',
    description: 'Lists the last 20 orders placed with this key, with payment and delivery status.',
    inputSchema: {},
    annotations: { readOnlyHint: true },
  }, wrap(() => client.orders()));

  s.registerTool('pastaclean_order_status', {
    title: 'Order status',
    description: 'Status of one order placed with this key (payment, delivery, paymentUrl if unpaid).',
    inputSchema: { orderId: ID },
    annotations: { readOnlyHint: true },
  }, wrap(({ orderId }) => client.order(orderId)));

  return s;
}
