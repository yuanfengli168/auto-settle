import { Splitwise } from 'splitwise';
import { getSplitwiseClient } from './auth.js';

export interface BalanceResult {
  friendId: number;
  friendName: string;
  amount: number; // positive = you owe them, negative = they owe you
  currency: string;
}

/**
 * Get balance with a specific friend, or all friends.
 */
export async function getBalance(friendName?: string): Promise<BalanceResult[]> {
  const sw = await getSplitwiseClient();
  const friends = await sw.friends.list();

  const results: BalanceResult[] = [];

  for (const friend of friends) {
    // Splitwise balance is from the friend's perspective:
    // positive balance means the friend owes you
    // We flip it: positive = you owe them
    const youOwe = -(friend.balance ?? 0);

    if (Math.abs(youOwe) < 0.01) continue; // skip zero balances

    if (friendName) {
      const name = `${friend.firstName || ''} ${friend.lastName || ''}`.trim().toLowerCase();
      if (!name.includes(friendName.toLowerCase())) continue;
    }

    results.push({
      friendId: friend.id,
      friendName: `${friend.firstName || ''} ${friend.lastName || ''}`.trim(),
      amount: Math.round(youOwe * 100) / 100,
      currency: 'SGD', // Splitwise SGD default
    });
  }

  if (friendName && results.length === 0) {
    throw new Error(`No balance found with friend "${friendName}"`);
  }

  return results;
}