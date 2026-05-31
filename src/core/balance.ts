import { Splitwise } from 'splitwise';
import { getSplitwiseClient } from './auth.js';

export interface BalanceResult {
  friendId: number;
  friendName: string;
  amounts: { currency: string; amount: number }[];
  /** Net amount in primary currency. Positive = you owe them. */
  netAmount: number;
  currency: string;
}

/**
 * Get balance with a specific friend, or all friends with outstanding balances.
 *
 * Splitwise Friend.balance is an array of {currencyCode, amount}.
 * Positive amount = friend is owed money (you owe them).
 * We normalize so positive = you owe them, negative = they owe you.
 */
export async function getBalance(friendName?: string): Promise<BalanceResult[]> {
  const sw = await getSplitwiseClient();
  const friends = await sw.friends.list();

  const results: BalanceResult[] = [];

  for (const friend of friends) {
    // Filter by name if specified
    if (friendName) {
      const fullName = `${friend.firstName} ${friend.lastName || ''}`.trim().toLowerCase();
      if (!fullName.includes(friendName.toLowerCase())) continue;
    }

    // Parse balances — friend.balance[].amount from their perspective
    // Positive = they are owed money = you owe them
    const amounts: { currency: string; amount: number }[] = (friend.balance || []).map((b) => ({
      currency: b.currencyCode,
      amount: parseFloat(b.amount),
    }));

    // Filter out zero balances
    const nonZero = amounts.filter((a) => Math.abs(a.amount) >= 0.01);
    if (nonZero.length === 0) continue;

    // Find primary currency (first one, or SGD if present)
    const sgd = nonZero.find((a) => a.currency === 'SGD');
    const primary = sgd || nonZero[0];

    results.push({
      friendId: friend.id,
      friendName: `${friend.firstName} ${friend.lastName || ''}`.trim(),
      amounts: nonZero,
      netAmount: primary.amount,
      currency: primary.currency,
    });
  }

  if (friendName && results.length === 0) {
    throw new Error(`No balance found with friend "${friendName}"`);
  }

  return results;
}