# Auto-Settle — Design Document

## Problem

Every month, Splitwise users (especially couples) need to settle debts. The process is:
1. Open Splitwise → check how much you owe
2. Open banking app → find PayNow → enter amount → pay
3. Go back to Splitwise → mark as settled

This is tedious and easy to forget. Auto-settle automates steps 1 and 3, and makes step 2 one-scan easy.

## MVP1 Scope

**In scope:**
- Splitwise OAuth2 authentication
- Fetch balance between you and a specific friend/partner
- Generate PayNow SGQR QR code with pre-filled amount
- Settle up in Splitwise (create a payment record)
- CLI interface
- MCP Server interface (for AI assistants)

**Out of scope (future):**
- Automatic bank transfers (no bank API available for individuals in SG)
- Multi-currency support
- Group expense management
- Mobile app
- Speaker diarization (lol no)

## Architecture

### Core Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Splitwise   │────▶│   Auto-     │────▶│   PayNow    │
│  API         │     │   Settle    │     │   SGQR      │
│  (balance,   │     │   (orchest- │     │   (QR code  │
│   settle)    │◀────│    ration)  │◀────│   image)    │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
               ┌────▼───┐  ┌─────▼────┐
               │  CLI    │  │   MCP     │
               │         │  │  Server   │
               └────────┘  └───────────┘
```

### Dual Interface

**CLI mode** — Human runs commands directly:
```bash
auto-settle balance
auto-settle qr --amount 150 --to +65XXXXXXXX
auto-settle settle --amount 150
```

**MCP mode** — AI assistant calls tools:
```
User: "How much do I owe my wife?"
AI: calls check_balance → "You owe SGD 150"

User: "Generate a QR code for payment"
AI: calls generate_paynow_qr → [QR image]

User: "Done, settle it"
AI: calls settle_up → "Settled SGD 150 in Splitwise"
```

## Component Details

### 1. Splitwise Integration

**API:** Splitwise Self-Serve API v3.0
**Auth:** OAuth2 (user authorizes via browser)
**Key endpoints:**
- `GET /api/v3.0/get_friends` — list friends + balances
- `GET /api/v3.0/get_expenses` — fetch expenses
- `POST /api/v3.0/create_expense` — create payment (settle up)

**Note:** There is no official "settle up" endpoint. Settlement is done by creating a payment expense between two users that zeroes out the balance.

**Rate limits:** Conservative on Self-Serve API. Fine for monthly personal use.

### 2. PayNow SGQR Generation

**Standard:** SGQR (Singapore QR) — unified payment QR code standard
**Format:** EMVCo-compliant QR string

**Parameters:**
- Recipient mobile number (or NRIC/UEN)
- Amount (SGD)
- Recipient name (display only, not verified)
- Reference/edit reference (optional, for tracking)

**Security:**
- QR codes only encode **payment instructions** — no banking credentials
- User still scans and confirms payment in their bank app
- No API access to bank accounts — you must manually scan and confirm
- This is the **safest** semi-automated approach: automated amount calculation + manual payment confirmation

**Libraries:**
- `paynow-qr` (npm) — generates PayNow QR strings
- `qrcode` (npm) — renders QR string to image

### 3. MCP Server

**SDK:** @modelcontextprotocol/sdk

**Tools exposed:**

| Tool | Description | Parameters |
|---|---|---|
| `check_balance` | Check Splitwise balance with a friend | `friend_name` (optional) |
| `generate_paynow_qr` | Generate PayNow QR code | `amount`, `recipient_phone` |
| `settle_up` | Mark debt as settled in Splitwise | `amount`, `friend_id` |

**Transport:** stdio (standard for local MCP servers)

### 4. CLI

**Framework:** Commander.js

**Commands:**
- `auto-settle auth` — OAuth2 login flow
- `auto-settle balance` — show outstanding balance
- `auto-settle qr [--amount N] [--to PHONE]` — generate and display QR
- `auto-settle settle --amount N` — settle up
- `auto-settle --mcp` — start MCP server mode

### 5. Configuration

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

**OAuth tokens stored at:** `~/.auto-settle/oauth.json` (gitignored)

## Payment Flow (Step by Step)

```
Month-end trigger (cron or manual)
         │
         ▼
  Splitwise API: GET balance
         │
         ▼
  Calculate net amount owed
         │
         ▼
  Generate SGQR with amount + recipient
         │
         ▼
  Output QR to terminal / save image / send via notification
         │
         ▼
  User scans QR with bank app → confirms payment
         │
         ▼
  User confirms: "paid"
         │
         ▼
  Splitwise API: POST settle up expense
         │
         ▼
  Done ✅
```

## Security Considerations

- **No bank API access** — we never touch bank credentials or initiate transfers
- **QR codes are read-only instructions** — no sensitive data in QR
- **OAuth tokens stored locally** — `~/.auto-settle/oauth.json`, never committed to git
- **User confirms every payment** — the actual money transfer always requires manual bank app confirmation
- **Splitwise Self-Serve API** — rate-limited, personal use only

## Future Ideas

- Scheduled monthly reminders (cron)
- WhatsApp/Telegram notification integration
- Multi-partner support
- Payment history tracking
- Splitwise group support
- Standing instruction integration (if bank APIs ever open up)
- OpenClaw skill package for direct WhatsApp interaction

## References

- [Splitwise API Docs](https://dev.splitwise.com/)
- [SGQR Specification](https://www.abs.org.sg/sgqr)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [paynow-qr npm](https://www.npmjs.com/package/paynow-qr)