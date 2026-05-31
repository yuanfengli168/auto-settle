# Auto-Settle — Design Document

## Problem

Every month, Splitwise users (especially couples) need to settle debts. The process is:
1. Open Splitwise → check how much you owe
2. Open banking app → find PayNow → enter amount → pay
3. Go back to Splitwise → mark as settled

This is tedious and easy to forget. Auto-settle automates steps 1 and 3, and makes step 2 one-scan easy.

## MVP1 Scope

**In scope:**
- Splitwise OAuth2 authentication (PKCE + Client Credentials)
- Fetch balance between you and a specific friend/partner
- Generate PayNow SGQR QR code with pre-filled amount
- Settle up in Splitwise (create payment record with correct currency)
- Multi-currency support (SGD, USD, CNY, etc.)
- Partial payment support (pay part of what you owe, remaining balance stays)
- CLI interface (Commander.js)
- MCP Server interface (for AI assistants)
- OCR verification of payment screenshots (tesseract.js)
- Cross-verification: OCR amount/currency vs expected parameters
- Payment history tracking (JSON + screenshots)
- QR share links for WhatsApp/Telegram
- Monthly reminder via OpenClaw heartbeat

**Out of scope (future):**
- Automatic bank transfers (no bank API for individuals in SG)
- Mobile app
- Speaker diarization
- Standing instruction integration

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Splitwise   │────▶│   Auto-     │────▶│   PayNow    │
│  API         │     │   Settle    │     │   SGQR      │
│  (balance,   │◀────│   (orchest- │     │   (QR code  │
│   settle)    │     │    ration)  │◀────│   image)    │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
               ┌────▼───┐  ┌─────▼────┐
               │  CLI    │  │   MCP     │
               │         │  │  Server   │
               └────────┘  └───────────┘
                           │
                    ┌──────┴──────┐
                    │  Verify     │
                    │  (OCR)      │
                    └─────────────┘
```

## Dual Interface

**CLI mode** — Human runs commands directly:
```bash
auto-settle balance
auto-settle qr --amount 150
auto-settle verify --image screenshot.jpg --expected-amount 150 --expected-currency SGD
auto-settle settle --amount 150 --currency SGD --friend "Wife"
auto-settle history
```

**MCP mode** — AI assistant calls tools:
```
User: "How much do I owe my wife?"
AI: calls check_balance → "You owe SGD 150"

User: "Generate a QR for payment"
AI: calls generate_paynow_qr → [QR image]

User: [sends screenshot]
AI: runs OCR verify → confirms amount → settles
```

## Component Details

### 1. Splitwise Integration

**API:** Splitwise Self-Serve API v3.0
**SDK:** splitwise v2 (TypeScript)
**Auth:** OAuth2 (PKCE + Client Credentials)

Key endpoints used:
- `GET /api/v3.0/get_friends` — list friends + balances
- `POST /api/v3.0/create_expense` — create payment (settle up)

**Important:** Splitwise `Friend.balance[].amount`:
- Positive = friend owes you
- Negative = you owe friend
- Our code flips this so positive = you owe them

### 2. PayNow SGQR Generation

**Standard:** SGQR (Singapore QR)
**Library:** `sgqr` npm package (supports mobile numbers, unlike `paynowqr`)
**Share links:** `api.qrserver.com` for WhatsApp/Telegram sharing

**Security:**
- QR codes only encode payment instructions — no banking credentials
- User still confirms payment in bank app
- Share URLs contain payee phone — only share with intended recipients
- PayNow only supports SGD

### 3. OCR Verification

**Library:** tesseract.js
**Flow:**
1. User sends payment screenshot
2. OCR extracts: amount, currency, recipient name, payment status
3. Cross-verification against expected settle parameters
4. If amount/currency mismatch → warn and ask user to confirm
5. Never settle without user confirmation

**Known limitation:** PayLah! screenshots render recipient name as image — OCR often can't extract it. Amount and currency are reliably detected.

### 4. MCP Server

**SDK:** @modelcontextprotocol/sdk
**Transport:** stdio

| Tool | Description | Parameters |
|---|---|---|
| `check_balance` | Check Splitwise balance | `friend_name` (optional) |
| `generate_paynow_qr` | Generate PayNow QR code | `amount`, `recipient_phone`, `recipient_name`, `reference` |
| `settle_up` | Mark debt as settled | `amount`, `currency`, `friend_name`, `friend_id` |

### 5. CLI

**Framework:** Commander.js

| Command | Description |
|---|---|
| `auto-settle init` | Interactive setup wizard |
| `auto-settle auth [--client-credentials]` | OAuth2 login |
| `auto-settle balance [-f friend]` | Check balances |
| `auto-settle qr --amount N [options]` | Generate PayNow QR |
| `auto-settle verify --image PATH [options]` | OCR verify screenshot |
| `auto-settle settle --amount N --currency CODE` | Settle up |
| `auto-settle history [--json]` | View payment history |
| `auto-settle --mcp` | Start MCP server |

### 6. Payment History

**Location:** `~/.auto-settle/history.json` + `~/.auto-settle/screenshots/`

Each record contains:
- id, date, amount, currency, recipient, recipientPhone
- splitwiseExpenseId, qrShareUrl, screenshotPath, status, note

### 7. Configuration

**Location:** `~/.auto-settle/config.json`

```json
{
  "splitwise": {
    "consumerKey": "...",
    "consumerSecret": "..."
  },
  "defaultRecipient": {
    "phone": "+65XXXXXXXX",
    "name": "Wife"
  },
  "preferences": {
    "currency": "SGD"
  }
}
```

**OAuth tokens:** `~/.auto-settle/oauth.json` (gitignored)

## Payment Flow (Step by Step)

```
Month-end trigger (heartbeat or manual)
         │
         ▼
  Splitwise API: GET balance
         │
         ▼
  Calculate net amount owed (by currency)
         │
         ▼
  For SGD: Generate SGQR with amount + recipient
  For other currencies: Just show balance
         │
         ▼
  Send reminder with balance + QR link
         │
         ▼
  User pays via bank app (scan QR)
         │
         ▼
  User sends payment screenshot
         │
         ▼
  OCR verify: extract amount + currency
         │
         ▼
  Cross-verify against expected parameters
         │
         ├─ Match → Ask user to confirm
         └─ Mismatch → Warn user, ask to confirm
         │
         ▼
  User confirms → Splitwise API: POST settle up
         │
         ▼
  Save to payment history + screenshot
         │
         ▼
  Done ✅
```

## Monthly Reminder

**OpenClaw heartbeat** checks on the last day of each month:
1. Run `auto-settle balance`
2. If SGD owed, generate QR link
3. Send WhatsApp message with balance + QR link
4. Remind user to pay and send screenshot

See `docs/cron-setup.md` for system crontab alternative.

## Security Considerations

- **No bank API access** — we never touch bank credentials or initiate transfers
- **QR codes are read-only** — only encode payment instructions
- **OAuth tokens stored locally** — `~/.auto-settle/oauth.json` (gitignored)
- **User confirms every payment** — OCR is a safety net, not a replacement for confirmation
- **Cross-verification** — OCR amount must match expected settle amount before proceeding
- **Splitwise Self-Serve API** — rate-limited, personal use only
- **Screenshots stored locally** — `~/.auto-settle/screenshots/` (gitignored)

## Tech Stack

| Component | Choice |
|---|---|
| Language | TypeScript |
| Runtime | Node.js |
| CLI | Commander.js |
| MCP | @modelcontextprotocol/sdk |
| Splitwise | splitwise v2 SDK |
| QR | sgqr + qrcode + qrcode-terminal |
| OCR | tesseract.js |
| Validation | Zod |

## Project Structure

```
auto-settle/
├── src/
│   ├── cli/index.ts          # CLI commands
│   ├── mcp/server.ts         # MCP server
│   ├── core/
│   │   ├── auth.ts           # OAuth2 flows
│   │   ├── balance.ts        # Splitwise balance query
│   │   ├── qr.ts             # PayNow SGQR + share links
│   │   ├── settle.ts         # Splitwise settle up
│   │   ├── verify.ts         # OCR screenshot verification
│   │   └── history.ts        # Payment history tracking
│   ├── config/index.ts       # Config management
│   └── types/
│       ├── index.ts           # Shared types
│       └── paynowqr.d.ts     # Type declarations
├── scripts/
│   └── monthly-reminder.sh   # Cron script
├── docs/
│   ├── design-doc.md         # This file
│   └── cron-setup.md         # Cron setup instructions
├── package.json
├── tsconfig.json
└── README.md
```

## References

- [Splitwise API Docs](https://dev.splitwise.com/)
- [SGQR Specification](https://www.abs.org.sg/sgqr)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [sgqr npm](https://www.npmjs.com/package/sgqr)
- [tesseract.js](https://github.com/naptha/tesseract.js)