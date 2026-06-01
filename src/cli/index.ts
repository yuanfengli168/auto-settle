#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { loadConfig, saveConfig } from '../config/index.js';
import { AppConfig } from '../types/index.js';
import { authPKCE, authClientCredentials } from '../core/auth.js';
import { getBalance } from '../core/balance.js';
import { generateQR, saveQRToFile, renderQRToTerminal, generateShareUrl } from '../core/qr.js';
import { settleUp } from '../core/settle.js';
import { loadHistory, addPaymentRecord, createPaymentRecord, saveScreenshot } from '../core/history.js';
import { verifyScreenshot, crossVerify } from '../core/verify.js';
import { generateMeme } from '../core/meme.js';

const CONFIG_DIR = path.join(os.homedir(), '.auto-settle');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

const program = new Command();

program
  .name('auto-settle')
  .description('Automatically settle Splitwise debts with PayNow QR codes')
  .version('0.1.0');

// ─── init ────────────────────────────────────────────────────────────────────

program
  .command('init')
  .description('Initialize auto-settle configuration (interactive)')
  .action(async () => {
    console.log('\n🪄 auto-settle init\n');
    console.log('This will create your config at ~/.auto-settle/config.json\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = (prompt: string): Promise<string> =>
      new Promise((resolve) => rl.question(prompt, resolve));

    // Splitwise credentials
    console.log('First, set up Splitwise integration.');
    console.log('Register your app at https://secure.splitwise.com/apps to get credentials.\n');

    const consumerKey = await question('Splitwise Consumer Key: ');
    const consumerSecret = await question('Splitwise Consumer Secret: ');

    // Default recipient
    console.log('\nNow set up your default PayNow recipient (e.g. your spouse).');
    const recipientPhone = await question('Recipient phone number (e.g. +65XXXXXXXX): ');
    const recipientName = await question('Recipient name (e.g. Wife): ');

    const config: AppConfig = {
      splitwise: {
        consumerKey: consumerKey.trim(),
        consumerSecret: consumerSecret.trim(),
      },
      defaultRecipient: {
        phone: recipientPhone.trim(),
        name: recipientName.trim(),
      },
      preferences: {
        currency: 'SGD',
      },
    };

    // Save config
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

    console.log(`\n✅ Config saved to ${CONFIG_PATH}`);
    console.log('\nNext steps:');
    console.log('  1. Run: auto-settle auth');
    console.log('  2. Then: auto-settle balance\n');

    rl.close();
  });

// ─── auth ────────────────────────────────────────────────────────────────────

program
  .command('auth')
  .description('Authenticate with Splitwise (OAuth2)')
  .option('--client-credentials', 'Use Client Credentials flow (simpler, for your own data)')
  .action(async (options) => {
    try {
      if (options.clientCredentials) {
        await authClientCredentials();
      } else {
        await authPKCE();
      }
    } catch (err: any) {
      console.error(`Auth failed: ${err.message}`);
      process.exit(1);
    }
  });

// ─── balance ─────────────────────────────────────────────────────────────────

program
  .command('balance')
  .description('Check your Splitwise balance')
  .option('-f, --friend <name>', 'Friend name to check balance with')
  .action(async (options) => {
    try {
      const balances = await getBalance(options.friend);

      if (balances.length === 0) {
        console.log('✅ No outstanding balances!');
        return;
      }

      console.log('\n💰 Outstanding Balances:\n');
      for (const b of balances) {
        for (const a of b.amounts) {
          const direction = a.amount > 0 ? 'you owe' : 'owes you';
          console.log(`  ${b.friendName}: ${a.currency} ${Math.abs(a.amount).toFixed(2)} ${direction}`);
        }
      }
      console.log();
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// ─── qr ──────────────────────────────────────────────────────────────────────

program
  .command('qr')
  .description('Generate a PayNow QR code (SGD only — PayNow only supports SGD)')
  .option('-a, --amount <number>', 'Amount in SGD', parseFloat)
  .option('-t, --to <phone>', 'Recipient phone number (e.g. +65XXXXXXXX)')
  .option('-n, --name <name>', 'Recipient display name')
  .option('-r, --reference <text>', 'Payment reference')
  .option('-o, --output <file>', 'Save QR to file (PNG)')
  .option('--no-terminal', 'Do not render QR in terminal')
  .action(async (options) => {
    try {
      let phone = options.to;
      let name = options.name;

      if (!phone || !name) {
        try {
          const config = loadConfig();
          phone = phone || config.defaultRecipient.phone;
          name = name || config.defaultRecipient.name;
        } catch {
          // No config, that's OK if explicitly provided
        }
      }

      const amount = options.amount;

      if (!amount) {
        console.error('Error: --amount is required (or use "auto-settle balance" to check)');
        process.exit(1);
      }

      if (!phone) {
        console.error('Error: --to is required (or set defaultRecipient.phone in config)');
        process.exit(1);
      }

      const params = {
        recipientPhone: phone,
        amount,
        recipientName: name || 'Recipient',
        reference: options.reference || 'auto-settle',
      };

      console.log(`\n📱 PayNow QR: SGD ${amount.toFixed(2)} → ${name || phone}`);

      // Remind user: PayNow only supports SGD
      console.log('   ℹ️  PayNow only supports SGD. For other currencies, use a different transfer method');
      console.log('      then run: auto-settle settle --amount X --currency USD --friend "Name"');

      // Generate share URL for WhatsApp/Telegram
      const shareUrl = generateShareUrl(params);
      console.log(`\n   🔗 Share link (WhatsApp/Telegram):`);
      console.log(`   ${shareUrl}\n`);

      if (options.output) {
        await saveQRToFile(params, options.output);
        console.log(`   Saved to: ${options.output}\n`);
      }

      if (options.terminal !== false) {
        console.log();
        renderQRToTerminal(params);
        console.log();
      }

      if (!options.output) {
        // Also output data URL for programmatic use
        const result = await generateQR(params);
        // Data URL is available but not printed to terminal by default
      }
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// ─── settle ──────────────────────────────────────────────────────────────────

program
  .command('settle')
  .description('Mark a debt as settled in Splitwise')
  .requiredOption('-a, --amount <number>', 'Amount to settle', parseFloat)
  .option('-c, --currency <code>', 'Currency code (SGD, USD, CNY, etc.)', 'SGD')
  .option('-f, --friend <name>', 'Friend name (will look up ID)')
  .option('--friend-id <id>', 'Friend ID directly')
  .action(async (options) => {
    try {
      let friendId = options.friendId ? parseInt(options.friendId) : undefined;
      let currency = options.currency;

      if (!friendId && options.friend) {
        const balances = await getBalance(options.friend);
        if (balances.length === 0) {
          console.error('No balance found with that friend');
          process.exit(1);
        }
        if (balances.length > 1) {
          console.error('Multiple friends match. Use --friend-id to specify:');
          balances.forEach(b => {
            const amounts = b.amounts.map(a => `${a.currency} ${a.amount.toFixed(2)}`).join(', ');
            console.log(`  ${b.friendName} (ID: ${b.friendId}) — ${amounts}`);
          });
          process.exit(1);
        }
        friendId = balances[0].friendId;

        // Auto-detect currency from balance if only one currency
        if (currency === 'SGD' && balances[0].amounts.length === 1 && balances[0].amounts[0].currency !== 'SGD') {
          currency = balances[0].amounts[0].currency;
        }
      }

      if (!friendId) {
        console.error('Error: --friend or --friend-id is required');
        process.exit(1);
      }

      const result = await settleUp(friendId, options.amount, currency);
      console.log(`\n✅ Settled ${result.currency} ${result.amount.toFixed(2)} with ${result.friendName}`);
      console.log(`   Expense ID: ${result.expenseId}`);
      console.log(`   Settled at: ${result.settledAt}`);
      if (result.currency !== 'SGD') {
        console.log(`\n   💡 ${result.currency} settled in Splitwise only. PayNow only supports SGD.`);
        console.log('      Use other methods (wire transfer, Wise, WeChat Pay, etc.) for the actual transfer.');
      }

      // Save to payment history
      let config;
      try { config = loadConfig(); } catch { config = null; }
      const record = createPaymentRecord({
        amount: result.amount,
        currency: result.currency,
        recipient: result.friendName,
        recipientPhone: config?.defaultRecipient?.phone || '',
        splitwiseExpenseId: result.expenseId,
        note: `Settled via auto-settle`,
      });
      addPaymentRecord(record);
      console.log(`   Payment ID: ${record.id}`);
      console.log();
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// ─── verify ───────────────────────────────────────────────────────────────────

program
  .command('verify')
  .description('Verify a payment screenshot using OCR')
  .requiredOption('-i, --image <path>', 'Path to payment screenshot')
  .option('-a, --expected-amount <number>', 'Expected amount to cross-verify', parseFloat)
  .option('-c, --expected-currency <code>', 'Expected currency code (SGD, USD, CNY)', 'SGD')
  .option('-r, --expected-recipient <name>', 'Expected recipient name')
  .action(async (options) => {
    try {
      console.log('🔍 Verifying payment screenshot...\n');

      const result = await verifyScreenshot(options.image);

      console.log('OCR Results:');
      console.log(`  Amount:     ${result.amount !== null ? result.amount : 'NOT DETECTED'}`);
      console.log(`  Currency:   ${result.currency || 'NOT DETECTED'}`);
      console.log(`  Recipient:  ${result.recipientName || 'NOT DETECTED'}`);
      console.log(`  Status:     ${result.paymentSuccess ? '✅ Successful' : '⚠️  Unclear'}`);
      console.log(`  Confidence: ${(result.confidence * 100).toFixed(0)}%`);

      if (result.warnings.length > 0) {
        console.log('\n  Warnings:');
        result.warnings.forEach(w => console.log(`    ⚠️  ${w}`));
      }

      // Cross-verify if expected values provided
      if (options.expectedAmount) {
        let expectedRecipient = options.expectedRecipient || '';
        if (!expectedRecipient) {
          try {
            const config = loadConfig();
            expectedRecipient = config.defaultRecipient.name;
          } catch { /* no config */ }
        }

        const crossResult = crossVerify(
          result,
          options.expectedAmount,
          options.expectedCurrency,
          expectedRecipient
        );

        console.log('\nCross-verification:');
        if (crossResult.valid) {
          console.log('  ✅ Screenshot matches expected payment');
        } else {
          console.log('  ❌ Mismatch detected:');
          crossResult.warnings.forEach(w => console.log(`    ⚠️  ${w}`));
        }
      }

      if (options.json) {
        console.log('\n' + JSON.stringify(result, null, 2));
      }
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// ─── history ─────────────────────────────────────────────────────────────────

program
  .command('history')
  .description('View payment history')
  .option('-l, --limit <number>', 'Number of recent payments to show', '10')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const history = loadHistory();
      const limit = parseInt(options.limit, 10);

      if (history.payments.length === 0) {
        console.log('No payment history yet.');
        return;
      }

      if (options.json) {
        console.log(JSON.stringify(history, null, 2));
        return;
      }

      const recent = history.payments.slice(-limit).reverse();
      console.log('\n📜 Payment History:\n');
      for (const p of recent) {
        const status = p.status === 'settled' ? '✅' : '⏳';
        const date = new Date(p.date).toLocaleDateString('en-SG', {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });
        console.log(`  ${status} ${p.currency} ${p.amount.toFixed(2)} → ${p.recipient}  (${date})`);
        if (p.note) console.log(`     Note: ${p.note}`);
        if (p.qrShareUrl) console.log(`     QR: ${p.qrShareUrl}`);
        if (p.screenshotPath) console.log(`     Screenshot: ${p.screenshotPath}`);
      }
      console.log();
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// ─── meme ────────────────────────────────────────────────────────────────────

program
  .command('meme')
  .description('Generate a pixel-art debt collection meme')
  .option('-f, --friend <name>', 'Friend name to target in meme')
  .option('-o, --output <file>', 'Save meme to file (default: ~/.auto-settle/meme.png)')
  .option('--zh', 'Use Chinese text')
  .action(async (options) => {
    try {
      const balances = await getBalance(options.friend);

      if (balances.length === 0) {
        console.log('✅ No outstanding balances — nothing to meme about!');
        return;
      }

      // Get user name from config
      let userName = 'you';
      try {
        const config = loadConfig();
        userName = config.userName || 'you';
      } catch { /* no config */ }

      const outputPath = await generateMeme({
        friendName: options.friend,
        userName,
        balances,
        output: options.output,
        lang: options.zh ? 'zh' : 'en',
      });

      console.log('\n🎨 Meme generated!');
      console.log(`   ${outputPath}`);

      // Generate GitHub raw URL if it's in assets/memes/
      const fileName = path.basename(outputPath);
      console.log(`   https://raw.githubusercontent.com/yuanfengli168/auto-settle/main/assets/memes/${fileName}`);
      console.log();

      // Print summary
      for (const b of balances) {
        for (const a of b.amounts) {
          const direction = a.amount > 0 ? 'you owe' : `owes you`;
          console.log(`   ${b.friendName}: ${a.currency} ${Math.abs(a.amount).toFixed(2)} ${direction}`);
        }
      }
      console.log();
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// ─── mcp ─────────────────────────────────────────────────────────────────────

program
  .command('mcp', { hidden: true })
  .description('Start as MCP server (for AI assistants)')
  .action(async () => {
    const { startMcpServer } = await import('../mcp/server.js');
    await startMcpServer();
  });

program.parse();