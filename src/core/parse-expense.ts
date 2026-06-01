/**
 * Parse expense information from text or OCR output.
 * Handles formats like:
 * - Apple Pay notification: "You paid SGD 45.60 at FairPrice"
 * - Bank SMS: "Your card ending 1234 was charged SGD 15.00 at Toast Box"
 * - Manual input: "45.60 groceries at FairPrice"
 * - PayLah! notification: "You sent SGD 100.00 to Winter Z"
 */

export interface ParsedExpense {
  /** Extracted amount */
  amount: number | null;
  /** Extracted currency */
  currency: string;
  /** Extracted merchant/description */
  description: string;
  /** Raw input text */
  raw: string;
  /** Confidence 0-1 */
  confidence: number;
  /** Warnings */
  warnings: string[];
}

// Currency patterns
const CURRENCY_PATTERNS: Array<{ pattern: RegExp; currency: string }> = [
  { pattern: /SGD\s*[\d,]+\.?\d*/i, currency: 'SGD' },
  { pattern: /\$\s*[\d,]+\.?\d*/, currency: 'SGD' }, // $ defaults to SGD in SG context
  { pattern: /USD\s*[\d,]+\.?\d*/i, currency: 'USD' },
  { pattern: /CNY\s*[\d,]+\.?\d*/i, currency: 'CNY' },
  { pattern: /RMB\s*[\d,]+\.?\d*/i, currency: 'CNY' },
  { pattern: /¥\s*[\d,]+\.?\d*/, currency: 'CNY' },
  { pattern: /€\s*[\d,]+\.?\d*/, currency: 'EUR' },
  { pattern: /£\s*[\d,]+\.?\d*/, currency: 'GBP' },
];

// Amount extraction patterns (ordered by specificity)
const AMOUNT_PATTERNS = [
  /SGD\s*([\d,]+\.?\d*)/i,
  /USD\s*([\d,]+\.?\d*)/i,
  /CNY\s*([\d,]+\.?\d*)/i,
  /RMB\s*([\d,]+\.?\d*)/i,
  /\$\s*([\d,]+\.?\d*)/,
  /¥\s*([\d,]+\.?\d*)/,
  /€\s*([\d,]+\.?\d*)/,
  /£\s*([\d,]+\.?\d*)/,
  /(?:paid|spent|charged|cost|total|amount)[:\s]*([\d,]+\.?\d*)/i,
  /([\d,]+\.\d{2})/, // bare decimal like 45.60
];

// Merchant/description extraction
const MERCHANT_PATTERNS = [
  /(?:at|to|for|@)\s+([A-Za-z0-9][A-Za-z0-9\s&'-]{1,40}?)(?:\s*(?:on|via|with|using|through|$))/i,
  /(?:at|to|for|@)\s+([A-Za-z0-9][A-Za-z0-9\s&'-]{1,40})$/i,
  /(?:at|to)\s+([A-Za-z][A-Za-z\s&'-]{1,40}?)(?:\s*\d)/i,
];

export function parseExpenseText(text: string): ParsedExpense {
  const warnings: string[] = [];
  let amount: number | null = null;
  let currency = 'SGD'; // default for SG context
  let description = '';
  let confidence = 0.5;

  const cleaned = text.trim();

  // 1. Extract currency
  for (const cp of CURRENCY_PATTERNS) {
    if (cp.pattern.test(cleaned)) {
      currency = cp.currency;
      break;
    }
  }

  // 2. Extract amount (prefer longer/larger matches)
  const allAmounts: Array<{ value: number; index: number; pattern: string }> = [];
  for (const pattern of AMOUNT_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match) {
      allAmounts.push({
        value: parseFloat(match[1].replace(/,/g, '')),
        index: match.index || 0,
        pattern: pattern.source,
      });
    }
  }
  // Pick the largest amount that looks like a price (not a card number or date)
  if (allAmounts.length > 0) {
    // Prefer amounts with decimal (like 45.60 over 1234)
    const withDecimal = allAmounts.filter(a => a.value % 1 !== 0 || a.value < 100);
    // Prefer explicit currency amounts
    const withCurrency = allAmounts.filter(a => a.pattern.includes('SGD|USD|CNY|RMB|\\$|¥|€|£'));
    const candidates = withCurrency.length > 0 ? withCurrency : (withDecimal.length > 0 ? withDecimal : allAmounts);
    amount = candidates[0].value;
    confidence += 0.2;
  }

  // 3. Extract merchant/description
  for (const pattern of MERCHANT_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match) {
      description = match[1].trim();
      confidence += 0.2;
      break;
    }
  }

  // If no merchant found, try to use the whole text (stripped of amount/currency)
  if (!description) {
    let descText = cleaned
      .replace(/SGD|USD|CNY|RMB/gi, '')
      .replace(/[$¥€£]/g, '')
      .replace(/[\d,]+\.?\d*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    // Remove common filler words
    descText = descText.replace(/^(you paid|paid|spent|charged|i paid|transferred|sent)\s*/i, '').trim();
    if (descText.length > 2) {
      description = descText.substring(0, 60);
      confidence += 0.1;
    }
  }

  // Fallback description
  if (!description) {
    description = 'Expense';
    warnings.push('Could not extract description from text');
  }

  if (amount === null) {
    warnings.push('Could not extract amount from text');
  }

  return {
    amount,
    currency,
    description,
    raw: cleaned,
    confidence: Math.min(confidence, 1),
    warnings,
  };
}