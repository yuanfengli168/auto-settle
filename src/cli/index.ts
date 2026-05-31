#!/usr/bin/env node

import { Command } from 'commander';
import { loadConfig } from '../config/index.js';
import { authPKCE, authClientCredentials } from '../core/auth.js';
import { getBalance } from '../core/balance.js';
import { generateQR, saveQRToFile } from '../core/qr.js';
import { settleUp } from '../core/settle.js';

const program = new Command();

program
  .name('auto-settle')
  .description('Automatically settle Splitwise debts with PayNow QR codes')
  .version('0.1.0');

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
        const direction = b.amount > 0 ? 'you owe' : 'owes you';
        console.log(`  ${b.friendName}: SGD ${Math.abs(b.amount).toFixed(2)} ${direction}`);
      }
      console.log();
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('qr')
  .description('Generate a PayNow QR code')
  .option('-a, --amount <number>', 'Amount in SGD', parseFloat)
  .option('-t, --to <phone>', 'Recipient phone number (e.g. +65XXXXXXXX)')
  .option('-n, --name <name>', 'Recipient display name')
  .option('-r, --reference <text>', 'Payment reference')
  .option('-o, --output <file>', 'Save QR to file (PNG)')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const phone = options.to || config.defaultRecipient.phone;
      const name = options.name || config.defaultRecipient.name;
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
        recipientName: name,
        reference: options.reference || 'auto-settle',
      };

      if (options.output) {
        const result = await saveQRToFile(params, options.output);
        console.log(`\n📱 PayNow QR saved to: ${options.output}`);
        console.log(`   Amount: SGD ${amount.toFixed(2)}`);
        console.log(`   To: ${name} (${phone})\n`);
      } else {
        const result = await generateQR(params);
        console.log(`\n📱 PayNow QR generated:`);
        console.log(`   Amount: SGD ${amount.toFixed(2)}`);
        console.log(`   To: ${name} (${phone})\n`);
        // Output data URL for terminal rendering or pipe
        console.log(result.dataUrl);
      }
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

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

program
  .command('mcp', { hidden: true })
  .description('Start as MCP server (for AI assistants)')
  .action(async () => {
    const { startMcpServer } = await import('../mcp/server.js');
    await startMcpServer();
  });

program.parse();