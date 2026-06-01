# iOS Shortcuts for Auto-Settle

Two iOS shortcuts for automatic expense tracking with Splitwise.

## 1. Expense Notifier

Automatically detects payment notifications and sends them to your AI assistant for Splitwise logging.

### Setup

1. Open the link below on your iPhone
2. Follow the Shortcut setup instructions
3. Configure the automation trigger (see below)

### Automation Trigger

Create a new Automation in the Shortcuts app:

1. **Settings → Shortcuts → Automations**
2. **Create Personal Automation**
3. **Trigger**: App → Select your banking/payment apps (DBS PayLah!, Apple Pay, etc.)
4. **Action**: Run Shortcut → "Expense Notifier"

The shortcut will:
- Extract amount and merchant from the notification
- Send a formatted message to your AI assistant via WhatsApp
- Your assistant will parse it and ask you to confirm before creating the Splitwise expense

### Required Variables

Edit the shortcut and set:
- `RECIPIENT`: Your AI assistant's WhatsApp number (e.g., `+6585933968`)

## 2. Manual Expense

For manually inputting expenses when you don't have a notification.

### Usage

Run the shortcut, enter:
1. Amount (e.g., 45.60)
2. Description (e.g., "FairPrice groceries")
3. Choose split (even, or custom)

The shortcut sends the info to your AI assistant via WhatsApp.

## How It Works

```
iPhone Notification / Manual Input
  → iOS Shortcut extracts amount + merchant
  → Sends WhatsApp message to your AI assistant
  → AI parses the message (auto-settle parse)
  → AI asks: "Split with Winter Z?"
  → You confirm
  → AI creates Splitwise expense (auto-settle expense)
  → Done! ✅
```

## Troubleshooting

- **Shortcut not triggering**: Make sure Shortcuts has notification access in Settings
- **WhatsApp not opening**: Make sure WhatsApp is installed and you've messaged the assistant before
- **Parsing errors**: The AI assistant can handle various formats, just send the raw notification text