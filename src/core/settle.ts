import { Splitwise } from 'splitwise';
import { getSplitwiseClient } from './auth.js';

export interface SettleResult {
  expenseId: number;
  amount: number;
  friendId: number;
  settledAt: string;
}

/**
 * Settle up a debt in Splitwise by creating a payment expense.
 *
 * Uses sw.expenses.createDebt which is the SDK convenience method
 * for recording that one user paid another.
 */
export async function settleUp(
  friendId: number,
  amount: number,
  description?: string
): Promise<SettleResult> {
  const sw = await getSplitwiseClient();

  // Get current user ID
  const me = await sw.users.getCurrent();

  // Determine who pays whom
  // If amount > 0, current user pays the friend (you owe them)
  // If amount < 0, friend pays current user (they owe you)
  const paidBy = amount > 0 ? me.id : friendId;
  const owedBy = amount > 0 ? friendId : me.id;
  const absAmount = Math.abs(amount);

  const expense = await sw.expenses.createDebt({
    paidBy,
    owedBy,
    amount: absAmount,
    description: description || `auto-settle payment`,
  });

  return {
    expenseId: expense.id,
    amount: absAmount,
    friendId,
    settledAt: new Date().toISOString(),
  };
}