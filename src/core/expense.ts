import { Splitwise } from 'splitwise';
import { getSplitwiseClient } from './auth.js';

export interface CreateExpenseResult {
  expenseId: number;
  cost: number;
  currency: string;
  description: string;
  splitWith: { friendId: number; friendName: string; share: number }[];
  createdAt: string;
}

export interface SplitDetail {
  friendId: number;
  friendName: string;
  share: number; // percentage or fixed amount
}

/**
 * Create an expense in Splitwise.
 *
 * @param cost - Total cost of the expense
 * @param currency - Currency code (SGD, USD, CNY, etc.)
 * @param description - What the expense is for
 * @param splits - How to split (array of { friendId, friendName, share })
 *   - If shares sum to the cost: treated as fixed amounts
 *   - If shares sum to 100: treated as percentages (split evenly if omitted)
 * @param date - Optional date for the expense (defaults to today)
 * @param category - Optional category name
 */
export async function createExpense(
  cost: number,
  currency: string,
  description: string,
  splits: SplitDetail[],
  date?: string,
  category?: string
): Promise<CreateExpenseResult> {
  const sw = await getSplitwiseClient();
  const me = await sw.users.getCurrent();

  // Default: split evenly with all participants
  const totalShare = splits.reduce((sum, s) => sum + s.share, 0);
  const absCost = Math.abs(cost);

  let users: Array<{ userId: number; paidShare: string; owedShare: string }>;

  if (totalShare === absCost) {
    // Fixed amounts
    users = [
      { userId: me.id, paidShare: absCost.toFixed(2), owedShare: (absCost - totalShare + splits[0].share).toFixed(2) },
      ...splits.map(s => ({
        userId: s.friendId,
        paidShare: '0.00',
        owedShare: s.share.toFixed(2),
      })),
    ];
    // Recalculate: payer owes their share too
    const myOwedShare = absCost - splits.reduce((sum, s) => sum + s.share, 0);
    users[0].owedShare = myOwedShare.toFixed(2);
  } else if (totalShare === 100) {
    // Percentages
    users = [
      { userId: me.id, paidShare: absCost.toFixed(2), owedShare: '0.00' },
      ...splits.map(s => ({
        userId: s.friendId,
        paidShare: '0.00',
        owedShare: (absCost * s.share / 100).toFixed(2),
      })),
    ];
  } else {
    // Default: split evenly
    const perPerson = absCost / (splits.length + 1); // +1 for me
    users = [
      { userId: me.id, paidShare: absCost.toFixed(2), owedShare: perPerson.toFixed(2) },
      ...splits.map(s => ({
        userId: s.friendId,
        paidShare: '0.00',
        owedShare: perPerson.toFixed(2),
      })),
    ];
  }

  const expenseData: any = {
    cost: absCost.toFixed(2),
    description,
    currencyCode: currency,
    payment: false,
    users,
  };

  if (date) {
    expenseData.date = date;
  }

  if (category) {
    expenseData.category = category;
  }

  const expense = await sw.expenses.create(expenseData);

  return {
    expenseId: expense.id,
    cost: absCost,
    currency,
    description,
    splitWith: splits.map(s => ({
      friendId: s.friendId,
      friendName: s.friendName,
      share: s.share,
    })),
    createdAt: new Date().toISOString(),
  };
}