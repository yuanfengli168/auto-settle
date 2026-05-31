import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getBalance } from '../core/balance.js';
import { generateQR } from '../core/qr.js';
import { settleUp } from '../core/settle.js';
import { loadConfig } from '../config/index.js';

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: 'auto-settle',
    version: '0.1.0',
  });

  // Tool: Check Splitwise balance
  server.tool(
    'check_balance',
    'Check your outstanding balance on Splitwise with a specific friend or all friends',
    {
      friend_name: z.string().optional().describe('Friend name to check balance with. Omit for all friends.'),
    },
    async ({ friend_name }) => {
      try {
        const balances = await getBalance(friend_name);

        if (balances.length === 0) {
          return {
            content: [{ type: 'text' as const, text: 'No outstanding balances! 🎉' }],
          };
        }

        const lines = balances.map(b => {
          const dir = b.amount > 0 ? 'you owe' : 'owes you';
          return `${b.friendName}: SGD ${Math.abs(b.amount).toFixed(2)} ${dir}`;
        });

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // Tool: Generate PayNow QR code
  server.tool(
    'generate_paynow_qr',
    'Generate a PayNow SGQR code for payment',
    {
      amount: z.number().describe('Amount in SGD'),
      recipient_phone: z.string().optional().describe('Recipient mobile number (e.g. +65XXXXXXXX). Uses config default if omitted.'),
      recipient_name: z.string().optional().describe('Recipient display name'),
      reference: z.string().optional().describe('Payment reference note'),
    },
    async ({ amount, recipient_phone, recipient_name, reference }) => {
      try {
        let phone = recipient_phone;
        let name = recipient_name;

        if (!phone || !name) {
          try {
            const config = loadConfig();
            phone = phone || config.defaultRecipient.phone;
            name = name || config.defaultRecipient.name;
          } catch {
            // No config, that's OK if explicitly provided
          }
        }

        if (!phone) {
          return {
            content: [{ type: 'text' as const, text: 'Error: recipient_phone is required (or set defaultRecipient in config)' }],
            isError: true,
          };
        }

        const result = await generateQR({
          recipientPhone: phone,
          amount,
          recipientName: name || 'Recipient',
          reference: reference || 'auto-settle',
        });

        return {
          content: [
            {
              type: 'image' as const,
              data: result.dataUrl.replace(/^data:image\/png;base64,/, ''),
              mimeType: 'image/png',
            },
            {
              type: 'text' as const,
              text: `PayNow QR: SGD ${amount.toFixed(2)} → ${name || phone}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // Tool: Settle up in Splitwise
  server.tool(
    'settle_up',
    'Mark a debt as settled in Splitwise by creating a payment expense',
    {
      amount: z.number().describe('Amount to settle in SGD'),
      friend_name: z.string().optional().describe('Friend name to settle with'),
      friend_id: z.number().optional().describe('Friend ID (if known)'),
    },
    async ({ amount, friend_name, friend_id }) => {
      try {
        let fid = friend_id;

        if (!fid && friend_name) {
          const balances = await getBalance(friend_name);
          if (balances.length === 0) {
            return {
              content: [{ type: 'text' as const, text: `No friend found matching "${friend_name}"` }],
              isError: true,
            };
          }
          if (balances.length > 1) {
            const names = balances.map(b => `${b.friendName} (ID: ${b.friendId})`).join(', ');
            return {
              content: [{ type: 'text' as const, text: `Multiple friends match: ${names}. Please specify friend_id.` }],
              isError: true,
            };
          }
          fid = balances[0].friendId;
        }

        if (!fid) {
          return {
            content: [{ type: 'text' as const, text: 'Error: friend_name or friend_id is required' }],
            isError: true,
          };
        }

        const result = await settleUp(fid, amount);
        return {
          content: [
            {
              type: 'text' as const,
              text: `✅ Settled SGD ${result.amount.toFixed(2)} with friend ID ${result.friendId}. Expense ID: ${result.expenseId}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Auto-Settle MCP server running on stdio');
}