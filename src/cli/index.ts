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
import { generateQR, saveQRToFile, renderQRToTerminal } from '../core/qr.js';
import { settleUp } from '../core/settle.js';

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
  .description('Generate a PayNow QR code')
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
  .requiredOption('-a, --amount <number>', 'Amount to settle (SGD)', parseFloat)
  .option('-f, --friend <name>', 'Friend name (will look up ID)')
  .option('--friend-id <id>', 'Friend ID directly')
  .action(async (options) => {
    try {
      let friendId = options.friendId ? parseInt(options.friendId) : undefined;

      if (!friendId && options.friend) {
        const balances = await getBalance(options.friend);
        if (balances.length === 0) {
          console.error('No balance found with that friend');
          process.exit(1);
        }
        if (balances.length > 1) {
          console.error('Multiple friends match. Use --friend-id to specify:');
          balances.forEach(b => console.log(`  ${b.friendName} (ID: ${b.friendId})`));
          process.exit(1);
        }
        friendId = balances[0].friendId;
      }

      if (!friendId) {
        console.error('Error: --friend or --friend-id is required');
        process.exit(1);
      }

      const result = await settleUp(friendId, options.amount);
      console.log(`\n✅ Settled SGD ${result.amount.toFixed(2)} with friend ID ${result.friendId}`);
      console.log(`   Expense ID: ${result.expenseId}`);
      console.log(`   Settled at: ${result.settledAt}\n`);
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