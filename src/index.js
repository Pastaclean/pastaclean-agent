#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PastacleanClient } from './client.js';
import { createServer } from './server.js';

try {
  const client = new PastacleanClient({
    baseUrl: process.env.PASTACLEAN_BASE_URL || 'https://www.pastaclean.tv',
    apiKey: process.env.PASTACLEAN_API_KEY,
  });
  await createServer(client).connect(new StdioServerTransport());
} catch (e) {
  process.stderr.write(`pastaclean-mcp: ${e.message}\n`);
  process.exit(1);
}
