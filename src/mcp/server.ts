import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { loadConfig } from '../config/index.js';

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: 'auto-settle',
    version: '0.1.0',
  });

  // Tool: Check Splitwise balance
  server.tool(
    'check_balance',
    'Check your outstanding balance on Splitwise with a specific friend or overall',
    {
      friend_name: z.string().optional().describe('Friend name to check balance with. Omit for all friends.'),
    },
    async ({ friend_name }) => {
      try {
        // TODO: implement with actual Splitwise API call
        return {
          content: [
            {
              type: 'text' as const,
              text: `Balance check${friend_name ? ` with ${friend_name}` : ''}: TODO — not yet implemented`,
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

  // Tool: Generate PayNow QR code
  server.tool(
    'generate_paynow_qr',
    'Generate a PayNow SGQR code for payment',
    {
      amount: z.number().describe('Amount in SGD'),
      recipient_phone: z.string().describe('Recipient mobile number (e.g. +65XXXXXXXX)'),
      recipient_name: z.string().optional().describe('Recipient display name'),
      reference: z.string().optional().describe('Payment reference note'),
    },
    async ({ amount, recipient_phone, recipient_name, reference }) => {
      try {
        // TODO: implement with actual QR generation
        return {
          content: [
            {
              type: 'text' as const,
              text: `PayNow QR: SGD ${amount} → ${recipient_name || recipient_phone}${reference ? ` (ref: ${reference})` : ''}\n\nTODO — QR image generation not yet implemented`,
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
    },
    async ({ amount, friend_name }) => {
      try {
        // TODO: implement with actual Splitwise API call
        return {
          content: [
            {
              type: 'text' as const,
              text: `Settled SGD ${amount}${friend_name ? ` with ${friend_name}` : ''} in Splitwise.\n\nTODO — not yet implemented`,
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