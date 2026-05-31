#!/usr/bin/env node

import { Command } from 'commander';
import { loadConfig } from '../config/index.js';

const program = new Command();

program
  .name('auto-settle')
  .description('Automatically settle Splitwise debts with PayNow QR codes')
  .version('0.1.0');

program
  .command('auth')
  .description('Authenticate with Splitwise (OAuth2)')
  .action(async () => {
    console.log('🔐 Starting Splitwise OAuth2 flow...');
    console.log('TODO: implement OAuth2 browser flow');
  });

program
  .command('balance')
  .description('Check your Splitwise balance')
  .option('-f, --friend <name>', 'Friend name to check balance with')
  .action(async (options) => {
    try {
      const config = loadConfig();
      console.log(`Checking balance${options.friend ? ` with ${options.friend}` : ''}...`);
      console.log('TODO: implement balance check');
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('qr')
  .description('Generate a PayNow QR code')
  .option('-a, --amount <number>', 'Amount in SGD', parseFloat)
  .option('-t, --to <phone>', 'Recipient phone number')
  .option('-n, --name <name>', 'Recipient display name')
  .option('-o, --output <file>', 'Output file path (PNG)')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const phone = options.to || config.defaultRecipient.phone;
      const name = options.name || config.defaultRecipient.name;
      const amount = options.amount;

      if (!amount) {
        console.error('Error: --amount is required');
        process.exit(1);
      }

      console.log(`Generating PayNow QR: SGD ${amount} → ${name} (${phone})`);
      console.log('TODO: implement QR generation');
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('settle')
  .description('Mark a debt as settled in Splitwise')
  .requiredOption('-a, --amount <number>', 'Amount to settle', parseFloat)
  .option('-f, --friend <name>', 'Friend name')
  .action(async (options) => {
    try {
      const config = loadConfig();
      console.log(`Settling SGD ${options.amount}${options.friend ? ` with ${options.friend}` : ''}...`);
      console.log('TODO: implement settle up');
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