# Pastaclean for AI agents

Let your AI assistant search [pastaclean.tv](https://www.pastaclean.tv), price a cart and place orders **for you**.

- You create a key in your Pastaclean account (*Mein Konto → KI-Assistenten*) and set the limits: per order, per month, reorder-only.
- **The assistant never pays.** Every order comes with a payment link that you open and pay yourself.
- Prices, shipping and availability always come from the shop. The assistant cannot set prices, vouchers or addresses.

## Easiest: connect with your Pastaclean login (no key)

In apps that support remote MCP connectors (claude.ai, Claude Desktop, ChatGPT developer mode, Cursor …) add:

```
https://www.pastaclean.tv/agent-api/mcp
```

Click *Connect*, log in with your Pastaclean account and confirm the limits. That's it. You can see and block the connection any time in *Mein Konto → KI-Assistenten*.

## Or: send your assistant this message

> Please set yourself up for my Pastaclean shop. Instructions: https://www.pastaclean.tv/agent-api/SKILL.md
> My key (secret, never post it): `pca_…`

Any assistant that can make web requests can follow it (Claude, ChatGPT, OpenClaw, your own agent …).

## Skill

```bash
npx skills add Pastaclean/pastaclean-agent
```

The skill is [`skills/pastaclean/SKILL.md`](skills/pastaclean/SKILL.md) (same as the hosted one).

## MCP server

For MCP apps (Claude Desktop, Cursor, Claude Code …):

```json
{
  "mcpServers": {
    "pastaclean": {
      "command": "npx",
      "args": ["-y", "@pastaclean/mcp"],
      "env": { "PASTACLEAN_API_KEY": "pca_…" }
    }
  }
}
```

Tools: `pastaclean_whoami`, `pastaclean_search`, `pastaclean_get_product`, `pastaclean_check_link`, `pastaclean_quote`, `pastaclean_place_order`, `pastaclean_list_orders`, `pastaclean_order_status`.

## HTTP API

Base `https://www.pastaclean.tv/agent-api/v1`, header `Authorization: Bearer <key>`. Endpoints and rules: see the [skill](skills/pastaclean/SKILL.md).

## Develop

`npm test` runs unit tests. End-to-end against a shop: `E2E_KEY=pca_… E2E_BASE=https://… npm test`.

## License

MIT
