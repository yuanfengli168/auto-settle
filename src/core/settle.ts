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
 * This creates a "payment" record in Splitwise showing that you paid
 * the specified amount to your friend, reducing the balance.
 *
 * Supports partial payments and overpayments:
 * - Partial: owe 148.50, pay 100 → remaining balance stays
 * - Over: owe 148.50, pay 200 → friend now owes you 51.50
 * Splitwise handles net balance automatically.
 */
export async function settleUp(
  friendId: number,
  amount: number,
  currency: string = 'SGD',
  description?: string
): Promise<SettleResult> {
  const sw = await getSplitwiseClient();

  // Get current user and friend info
  const me = await sw.users.getCurrent();
  const friend = await sw.friends.get({ id: friendId });
  const friendName = `${friend.firstName} ${friend.lastName || ''}`.trim();

  // Create a payment expense
  // paidShare = how much each person paid toward the expense
  // owedShare = how much each person owes
  // For a payment: I paid the amount, my friend's share is zero
  const absAmount = Math.abs(amount).toFixed(2);

  const expense = await sw.expenses.create({
    cost: absAmount,
    description: description || 'Payment',
    currencyCode: currency,
    payment: true,
    users: [
      { userId: me.id, paidShare: absAmount, owedShare: '0.00' },
      { userId: friendId, paidShare: '0.00', owedShare: absAmount },
    ],
  });

  return {
    expenseId: expense.id,
    amount: Math.abs(amount),
    currency,
    friendId,
    friendName,
    settledAt: new Date().toISOString(),
  };
}