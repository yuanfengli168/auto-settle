import { Splitwise } from 'splitwise';
import { getSplitwiseClient } from './auth.js';

export interface SettleResult {
  expenseId: number;
  amount: number;
  currency: string;
  friendId: number;
  friendName: string;
  settledAt: string;
}

/**
 * Settle up a debt in Splitwise by creating a payment expense.
 *
 * Uses expenses.create with payment=true and currencyCode
 * to properly handle multi-currency debts.
 */
export async function settleUp(
  friendId: number,
  amount: number,
  currency: string = 'SGD',
  description?: string
): Promise<SettleResult> {
  const sw = await getSplitwiseClient();

  // Get current user ID
  const me = await sw.users.getCurrent();
  const friend = await sw.friends.get({ id: friendId });

  // Determine who pays whom based on amount sign
  // Positive amount = you owe them (you pay them)
  // Negative amount = they owe you (they pay you)
  const paidBy = amount > 0 ? me.id : friendId;
  const owedBy = amount > 0 ? friendId : me.id;
  const absAmount = Math.abs(amount);

  // Use expenses.create with payment=true for proper settlement
  const expense = await sw.expenses.create({
    cost: absAmount.toFixed(2),
    description: description || 'auto-settle payment',
    currencyCode: currency,
    payment: true,
    friendId,
    users: [
      { userId: paidBy, paidShare: absAmount.toFixed(2) },
      { userId: owedBy, owedShare: absAmount.toFixed(2) },
    ],
  });

  return {
    expenseId: expense.id,
    amount: absAmount,
    currency,
    friendId,
    friendName: `${friend.firstName} ${friend.lastName || ''}`.trim(),
    settledAt: new Date().toISOString(),
  };
}