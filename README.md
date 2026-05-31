# Auto-Settle 💸

Automatically settle your Splitwise debts with PayNow QR codes.

## What it does

Monthly workflow:
1. Pull your outstanding balance from Splitwise
2. Generate a PayNow (SGQR) QR code with the exact amount
3. Scan and pay via your bank app
4. Mark as settled in Splitwise

## Why

Paying your spouse/friends back on Splitwise every month is easy to forget. Auto-settle automates the tedious parts (checking balances, generating QR, settling up) while keeping you in control of the actual money transfer.

## Features (MVP1)

- **CLI** — check balance, generate QR, settle up from terminal
- **MCP Server** — let AI assistants (Claude, Cursor, etc.) call these tools via Model Context Protocol
- **SGQR Generation** — PayNow-compatible QR codes for Singapore bank transfers
- **Splitwise Integration** — OAuth2 + API to read balances and settle expenses

## Tech Stack

| Component | Choice |
|---|---|
| Language | TypeScript |
| Runtime | Node.js |
| CLI | Commander.js |
| MCP | @modelcontextprotocol/sdk |
| Splitwise | splitwise npm package |
| QR | paynow-qr + qrcode |
| Config | ~/.auto-settle/config.json |
| License | MIT |

## Project Structure (Planned)

```
auto-settle/
├── src/
│   ├── core/              # Core logic (pure functions)
│   │   ├── balance.ts     # Fetch Splitwise balance
│   │   ├── qr.ts          # Generate SGQR / PayNow QR
│   │   └── settle.ts      # Splitwise settle up
│   ├── cli/               # CLI entry (Commander.js)
│   │   └── index.ts
│   ├── mcp/               # MCP Server entry
│   │   └── server.ts      # Expose tools to AI assistants
│   └── config/            # Configuration management
│       └── index.ts
├── docs/
│   └── design-doc.md      # Design document
├── package.json
├── tsconfig.json
└── README.md
```

## Quick Start (Coming Soon)

```bash
npm install -g auto-settle
auto-settle auth          # OAuth2 with Splitwise
auto-settle balance       # Check what you owe
auto-settle qr            # Generate PayNow QR code
auto-settle settle        # Mark as settled in Splitwise
```

### MCP Mode

```bash
auto-settle --mcp         # Start as MCP server
```

Or add to Claude Desktop config:
```json
{
  "mcpServers": {
    "auto-settle": {
      "command": "npx",
      "args": ["auto-settle", "--mcp"]
    }
  }
}
```

## Status

🚧 MVP1 in progress — see [design-doc.md](docs/design-doc.md) for details.

## License

MIT