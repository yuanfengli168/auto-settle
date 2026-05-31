import { SplitwiseApi, SplitwiseConfig } from '../types/index.js';

export function createSplitwiseClient(config: SplitwiseConfig): SplitwiseApi {
  // Will be implemented with splitwise npm package
  throw new Error('Not implemented');
}

export async function getBalance(config: SplitwiseConfig, friendIdentifier?: string): Promise<{
  friendName: string;
  friendId: number;
  amount: number;
  currency: string;
}> {
  // TODO: implement
  // 1. Authenticate with Splitwise API
  // 2. GET /api/v3.0/get_friends
  // 3. Find friend (by name or pick first with balance)
  // 4. Return net balance
  throw new Error('Not implemented');
}

export async function settleUp(
  config: SplitwiseConfig,
  friendId: number,
  amount: number
): Promise<{ expenseId: number }> {
  // TODO: implement
  // 1. Authenticate with Splitwise API
  // 2. POST /api/v3.0/create_expense with payment=true
  // 3. Return expense ID
  throw new Error('Not implemented');
}