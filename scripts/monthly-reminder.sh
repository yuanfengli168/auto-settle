#!/bin/bash
# Monthly Splitwise + PayNow reminder
# Runs on the last day of every month at 22:00 SGT
# Generates balance summary + PayNow QR, sends via email and WhatsApp (via OpenClaw)

set -e

AUTO_SETTLE_DIR="/home/lyf99/Desktop/Github/auto-settle"
CLI="$AUTO_SETTLE_DIR/dist/cli/index.js"
OUTPUT_DIR="/home/lyf99/.auto-settle/reminders"
mkdir -p "$OUTPUT_DIR"

TODAY=$(date +%Y-%m-%d)
OUTPUT_FILE="$OUTPUT_DIR/reminder-${TODAY}.txt"

cd "$AUTO_SETTLE_DIR"

echo "📋 Monthly Splitwise Reminder — $(date '+%d %b %Y')" > "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Check balance
echo "💰 Outstanding Balances:" >> "$OUTPUT_FILE"
node "$CLI" balance >> "$OUTPUT_FILE" 2>&1 || true
echo "" >> "$OUTPUT_FILE"

# Check if there's SGD owed — generate QR if so
SGD_OWED=$(node "$CLI" balance 2>/dev/null | grep "SGD.*you owe" | grep -oP '[\d.]+(?= you owe)' | head -1)

if [ -n "$SGD_OWED" ]; then
  echo "📱 PayNow QR for SGD $SGD_OWED:" >> "$OUTPUT_FILE"
  QR_URL=$(node "$CLI" qr --amount "$SGD_OWED" --no-terminal 2>/dev/null | grep "api.qrserver.com" | sed 's/^ *//')
  echo "$QR_URL" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  echo "Scan the QR above to pay, then reply with the screenshot to settle up!" >> "$OUTPUT_FILE"
else
  echo "✅ No SGD owed — no PayNow payment needed." >> "$OUTPUT_FILE"
fi

# List non-SGD debts that need manual transfer
node "$CLI" balance 2>/dev/null | grep -v "SGD" | grep "you owe" >> "$OUTPUT_FILE" || true

echo "" >> "$OUTPUT_FILE"
echo "— auto-settle monthly reminder" >> "$OUTPUT_FILE"

cat "$OUTPUT_FILE"

# Send email via gog (if configured)
if command -v gog &>/dev/null; then
  SUBJECT="📋 Monthly Reminder: Splitwise Balance ($(date '+%d %b %Y'))"
  gog gmail send --to "$REMINDER_EMAIL" --subject "$SUBJECT" --body "$(cat "$OUTPUT_FILE")" 2>/dev/null || true
fi