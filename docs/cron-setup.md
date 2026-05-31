# Monthly Reminder Cron Setup

## Option 1: System crontab (email + log)

Add to crontab (`crontab -e`):

```cron
# Auto-settle monthly reminder — last day of every month at 22:00 SGT (14:00 UTC)
0 14 28-31 * * [ "$(date +\%d -d tomorrow)" = "01" ] && /home/lyf99/Desktop/Github/auto-settle/scripts/monthly-reminder.sh >> /home/lyf99/.auto-settle/reminders/cron.log 2>&1
```

Run this command to add it:
```bash
(crontab -l 2>/dev/null; echo ''; echo '# Auto-settle monthly reminder'; echo '0 14 28-31 * * [ "$(date +%d -d tomorrow)" = "01" ] && /home/lyf99/Desktop/Github/auto-settle/scripts/monthly-reminder.sh >> /home/lyf99/.auto-settle/reminders/cron.log 2>&1') | crontab -
```

## Option 2: OpenClaw heartbeat / cron (WhatsApp notification)

Since OpenClaw runs on this machine, you can use OpenClaw's built-in cron
to send a WhatsApp message on the last day of each month.

Add to HEARTBEAT.md or use OpenClaw's cron feature:

```
On the last day of each month at 22:00 SGT:
1. Run: node ~/Desktop/Github/auto-settle/dist/cli/index.js balance
2. If SGD owed, run: node ~/Desktop/Github/auto-settle/dist/cli/index.js qr --amount <AMOUNT> --no-terminal
3. Send WhatsApp message to Jacky with balance + QR link
```

## Email setup (optional)

If you want email notifications, configure gog first:
```bash
gog auth credentials /path/to/client_secret.json
gog auth add your@gmail.com --services gmail
```

Then set `REMINDER_EMAIL` in the script or as environment variable.