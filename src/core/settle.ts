import { SplitwiseConfig } from '../types/index.js';

export interface SettleResult {
  expenseId: number;
  amount: number;
  friendId: number;
  settledAt: string;
}

/**
 * Settle up a debt in Splitwise by creating a payment expense.
 *
 * Splitwise doesn't have a dedicated "settle up" API endpoint.
 * Instead, we create a payment expense between two users that
 * zeroes out their balance.
 */
export async function settleUp(
  config: SplitwiseConfig,
  friendId: number,
  amount: number,
  description?: string
): Promise<SettleResult> {
  // TODO: implement
  // 1. Authenticate with Splitwise
  // 2. POST /api/v3.0/create_expense
  //    - payment: true
  //    - cost: amount
  //    - users: [payer, payee]
  // 3. Return result
  throw new Error('Not implemented');
}