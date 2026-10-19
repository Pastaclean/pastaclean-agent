// End-to-End gegen den Test-Shop: MCP-Client ↔ unser Server (stdio) ↔ Agent-API. Nur wenn E2E_KEY gesetzt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const KEY = process.env.E2E_KEY;
test('MCP e2e', { skip: !KEY }, async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [new URL('../src/index.js', import.meta.url).pathname],
    env: { ...process.env, PASTACLEAN_API_KEY: KEY, PASTACLEAN_BASE_URL: process.env.E2E_BASE },
  });
  const c = new Client({ name: 'e2e', version: '0' });
  await c.connect(transport);
  const tools = (await c.listTools()).tools.map((t) => t.name).sort();
  assert.deepEqual(tools, ['pastaclean_check_link', 'pastaclean_get_product', 'pastaclean_list_orders', 'pastaclean_order_status', 'pastaclean_place_order', 'pastaclean_quote', 'pastaclean_search', 'pastaclean_whoami']);
  const j = (r) => JSON.parse(r.content[0].text);
  const me = j(await c.callTool({ name: 'pastaclean_whoami', arguments: {} }));
  assert.equal(me.permissions.canPay, false);
  const s = j(await c.callTool({ name: 'pastaclean_search', arguments: { query: 'mixer', limit: 2 } }));
  assert.ok(s.products.length > 0);
  const q = j(await c.callTool({ name: 'pastaclean_quote', arguments: { items: [{ productId: s.products[0].id, quantity: 1 }] } }));
  assert.ok(q.total > 0);
  const bad = await c.callTool({ name: 'pastaclean_check_link', arguments: { url: 'https://evil.example/x' } });
  assert.equal(bad.isError, true);
  assert.equal(j(bad).error, 'not_a_product');
  await c.close();
});
