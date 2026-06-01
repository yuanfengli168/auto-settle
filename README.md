# Auto-Settle 💸

Automatically settle your Splitwise debts with PayNow QR codes.

## What it does

Monthly workflow:
1. Pull your outstanding balance from Splitwise
2. Generate a PayNow (SGQR) QR code with the exact amount
3. Scan and pay via your bank app
4. Mark as settled in Splitwise

Works as a **CLI tool** and an **MCP server** (for AI assistants like Claude).

## Install

```bash
npm install -g auto-settle
```

Or run directly:
```bash
npx auto-settle init
```

## Quick Start

### 1. Initialize config

```bash
auto-settle init
```

This will ask for:
- Splitwise Consumer Key & Secret (get them at https://secure.splitwise.com/apps)
- Default PayNow recipient (phone number + name)

Config is saved to `~/.auto-settle/config.json`.

### 2. Authenticate

```bash
# Client Credentials (simpler, for your own data)
auto-settle auth --client-credentials

# Or PKCE OAuth2 (opens browser, for end-user apps)
auto-settle auth
```

Token is saved to `~/.auto-settle/oauth.json`.

### 3. Check balance

```bash
# All friends
auto-settle balance

# Specific friend
auto-settle balance --friend "Wife"
```

### 4. Generate PayNow QR

```bash
# Uses default recipient from config
auto-settle qr --amount 150

# Specify recipient
auto-settle qr --amount 150 --to +65XXXXXXXX --name "Wife"

# Save to file instead of terminal
auto-settle qr --amount 150 --output payment.png
```

### 5. Settle up

```bash
# By friend name
auto-settle settle --amount 150 --friend "Wife"

# By friend ID
auto-settle settle --amount 150 --friend-id 12345
```

## MCP Server

Use auto-settle with AI assistants (Claude, Cursor, etc.):

### Claude Desktop

Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "auto-settle": {
      "command": "npx",
      "args": ["auto-settle", "mcp"]
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|---|---|
| `check_balance` | Check Splitwise balance with a friend or all friends |
| `generate_paynow_qr` | Generate PayNow QR code with specified amount |
| `generate_meme` | Generate pixel-art debt collection meme |
| `settle_up` | Mark debt as settled in Splitwise |

Then just ask your AI: *"How much do I owe my wife?"* or *"Generate a QR for $150"*

### 6. Generate debt meme 🎨

Pixel-art debt collection meme — perfect for reminding friends they owe you.

```bash
# Generate meme for all friends
auto-settle meme

# Target a specific friend
auto-settle meme --friend "Wife"

# Chinese version
auto-settle meme --zh

# Save to custom path
auto-settle meme -o ~/meme.png
```

Each meme includes:
- Pixel-art debt collector character 💰
- Speech bubble with demand
- Itemized debt breakdown with your name
- Random classic movie quote about money/debts

Set your name in config so it shows "owes **Jacky**" instead of "owes you":
```json
{ "userName": "Jacky" }
```

## Architecture

```
src/
├── cli/index.ts          # CLI entry (Commander.js)
├── mcp/server.ts         # MCP server entry
├── core/
│   ├── auth.ts           # OAuth2 (PKCE + Client Credentials)
│   ├── balance.ts        # Splitwise balance query
│   ├── qr.ts             # PayNow SGQR generation
│   ├── meme.ts           # Pixel-art debt meme generator
│   ├── settle.ts         # Splitwise settle up
│   ├── verify.ts         # Payment screenshot OCR verification
│   └── history.ts        # Payment history tracking
├── config/index.ts       # Config management
└── types/index.ts        # Shared types
```

## Tech Stack

| Component | Choice |
|---|---|
| Language | TypeScript |
| CLI | Commander.js |
| MCP | @modelcontextprotocol/sdk |
| Splitwise | splitwise v2 SDK |
| QR | sgqr + qrcode + qrcode-terminal |
| Meme | canvas (node-canvas) |
| OCR | tesseract.js |
| Validation | Zod |

## Security

- **No bank API access** — we never touch bank credentials or initiate transfers
- **QR codes are read-only** — they only encode payment instructions
- **OAuth tokens stored locally** — `~/.auto-settle/oauth.json` (gitignored)
- **You confirm every payment** — actual money transfer requires manual bank app confirmation
- **OCR verification** — payment screenshots cross-verified before settling
- **Splitwise Self-Serve API** — rate-limited, personal use only
- **Meme images are local** — generated on your machine, no data sent to external services

## Config Reference

`~/.auto-settle/config.json`:

```json
{
  "splitwise": {
    "consumerKey": "YOUR_KEY",
    "consumerSecret": "YOUR_SECRET"
  },
  "defaultRecipient": {
    "phone": "+65XXXXXXXX",
    "name": "Wife"
  },
  "preferences": {
    "currency": "SGD"
  },
  "userName": "YourName"
}
```

## License

MIT