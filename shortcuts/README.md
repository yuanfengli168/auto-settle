# Manual Expense Shortcut

A simple iOS Shortcut that lets you quickly send expense text to your AI assistant.

## Option A: Share Sheet Shortcut (Recommended)

This shortcut appears in the Share Sheet — when you copy a notification, just share it.

### Import

1. Open this link on your iPhone:
   [Import Shortcut](https://www.icloud.com/shortcuts/YOUR_SHORTCUT_ID)

   > Note: You'll need to create and upload the shortcut first. See "Manual Setup" below.

### Manual Setup

Create the shortcut yourself in the Shortcuts app:

1. Open **Shortcuts** app
2. Tap **+** to create new
3. Name it: **"Log Expense"**

4. Add these actions in order:

#### Step 1: Ask for Input
- Action: **Ask for Input**
- Type: **Text**
- Prompt: `What did you spend? (e.g. "SGD 45.60 at FairPrice")`

#### Step 2: Send via WhatsApp
- Action: **Send Message via WhatsApp**
- To: `+6585933968` (your assistant's number)
- Message: `📱 Expense: [Input from Step 1]`

#### Alternative: Send via Telegram
If you prefer Telegram:
- Action: **Send Message via Telegram**
- To: your bot username `@lyf168_glm51bot`
- Message: `📱 Expense: [Input from Step 1]`

### Add to Home Screen

1. Long-press the shortcut in Shortcuts app
2. Tap **Details**
3. Tap **Add to Home Screen**
4. Now you have a one-tap expense logger!

---

## Option B: Clipboard Shortcut (Fastest)

This sends whatever's in your clipboard — just copy the notification text first.

### Manual Setup

1. Open **Shortcuts** app
2. Tap **+** to create new
3. Name it: **"Quick Expense"**

4. Add these actions:

#### Step 1: Get Clipboard
- Action: **Get Clipboard**

#### Step 2: Ask for confirmation
- Action: **Ask for Input**
- Type: **Text**
- Default: **Clipboard** (from Step 1)
- Prompt: `Confirm expense:`

#### Step 3: Send via WhatsApp
- Action: **Send Message via WhatsApp**
- To: `+6585933968`
- Message: `📱 Expense: [Input from Step 2]`

---

## Option C: Automation (Auto-forward notifications)

See `expense-notifier.json` for the automation shortcut that triggers on payment app notifications.

---

## How It Works End-to-End

```
1. You see a payment notification (Apple Pay / PayLah / bank SMS)
2. Option A: Type or paste the expense info
   Option B: Copy notification → tap Quick Expense
   Option C: It auto-forwards (no action needed)
3. AI assistant receives the message
4. AI parses it with auto-settle parse
5. AI asks: "Split with Winter Z? Even split?"
6. You confirm
7. AI creates Splitwise expense
8. Done! ✅
```

## Example Inputs

Any of these formats work:
- `SGD 45.60 at FairPrice Finest`
- `$120 dinner at Din Tai Fung`
- `You paid SGD 12.50 at Toast Box`
- `45.60 groceries`