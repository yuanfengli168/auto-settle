import Tesseract from 'tesseract.js';

export interface VerifyResult {
  /** Raw OCR text from the screenshot */
  rawText: string;
  /** Extracted amount, if found */
  amount: number | null;
  /** Extracted currency, if found */
  currency: string | null;
  /** Extracted recipient name, if found */
  recipientName: string | null;
  /** Whether the payment appears successful */
  paymentSuccess: boolean;
  /** Confidence score 0-1 */
  confidence: number;
  /** Warnings about mismatches */
  warnings: string[];
}

/**
 * Verify a payment screenshot using OCR.
 *
 * Extracts: amount, currency, recipient name, payment status.
 * Returns structured data for confirmation before settling.
 */
export async function verifyScreenshot(imagePath: string): Promise<VerifyResult> {
  const result = await Tesseract.recognize(imagePath, 'eng', {
    logger: () => {}, // suppress logs
  });

  const text = result.data.text;
  const confidence = result.data.confidence / 100;

  // Extract amount: look for currency patterns like SGD 1.00, $3.00, 1.00 SGD
  const amountPatterns = [
    /SGD\s*(\d+\.?\d*)/i,
    /\$\s*(\d+\.?\d*)/,
    /(\d+\.?\d*)\s*SGD/i,
    /(\d+\.\d{2})/,  // bare decimal like 1.00
  ];

  let amount: number | null = null;
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      amount = parseFloat(match[1]);
      break;
    }
  }

  // Extract currency
  let currency: string | null = null;
  if (/SGD/i.test(text)) currency = 'SGD';
  else if (/USD/i.test(text)) currency = 'USD';
  else if (/CNY/i.test(text)) currency = 'CNY';
  else if (/\$/i.test(text)) currency = 'SGD'; // Default $ to SGD in Singapore context

  // Extract recipient name — look for common patterns in bank transfer screenshots
  // PayLah! shows recipient name in various positions, sometimes as image
  let recipientName: string | null = null;

  // Common patterns across bank apps
  const recipientPatterns = [
    /(?:to|transfer\s+to|paid\s+to|sent\s+to)\s+([A-Z][A-Za-z\s]{1,30})/i,
    /([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)\s*(?:received|has received)/i,
    // PayLah! pattern: sometimes "NAME" appears before "Successful"
    /^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)\s*$/m,
  ];

  for (const pattern of recipientPatterns) {
    const match = text.match(pattern);
    if (match) {
      const name = match[1].trim();
      // Filter out common false positives
      const falsePositives = ['SGD', 'PayNow', 'Transfer', 'Transaction', 'Share', 'Comments', 'Successful', 'LOG', 'OUT'];
      if (!falsePositives.includes(name) && name.length > 1) {
        recipientName = name;
        break;
      }
    }
  }

  // For PayLah! screenshots: if "You sent" is found, look for the line after
  const youSentMatch = text.match(/You sent\s*\n(.+)/);
  if (youSentMatch && !recipientName) {
    const lineAfter = youSentMatch[1].trim();
    // If it's just an amount, the recipient name might be above "You sent"
    const lines = text.split('\n');
    const youSentIndex = lines.findIndex(l => l.includes('You sent'));
    if (youSentIndex > 0) {
      const possibleName = lines[youSentIndex - 1].trim();
      if (possibleName.length > 1 && !possibleName.match(/^\d/) && !possibleName.match(/SGD|PayNow|Successful|Transfer|Transaction|Share|Comments/i)) {
        recipientName = possibleName;
      }
    }
  }

  // Check payment success — look for success indicators
  const successKeywords = ['successful', 'completed', 'success', 'paid', 'transferred', 'sent'];
  const paymentSuccess = successKeywords.some(kw => text.toLowerCase().includes(kw));

  // Build warnings
  const warnings: string[] = [];
  if (amount === null) warnings.push('Could not extract amount from screenshot');
  if (currency === null) warnings.push('Could not extract currency from screenshot');
  if (recipientName === null) warnings.push('Could not extract recipient name from screenshot');

  return {
    rawText: text,
    amount,
    currency,
    recipientName,
    paymentSuccess,
    confidence,
    warnings,
  };
}

/**
 * Cross-verify screenshot against expected settle parameters.
 * Returns warnings for any mismatches.
 */
export function crossVerify(
  verifyResult: VerifyResult,
  expectedAmount: number,
  expectedCurrency: string,
  expectedRecipient: string
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (verifyResult.amount !== null && Math.abs(verifyResult.amount - expectedAmount) > 0.01) {
    warnings.push(
      `Amount mismatch: screenshot shows ${verifyResult.currency} ${verifyResult.amount}, expected ${expectedCurrency} ${expectedAmount}`
    );
  }

  if (verifyResult.currency !== null && verifyResult.currency !== expectedCurrency) {
    warnings.push(
      `Currency mismatch: screenshot shows ${verifyResult.currency}, expected ${expectedCurrency}`
    );
  }

  if (verifyResult.recipientName !== null) {
    const expectedLower = expectedRecipient.toLowerCase();
    const actualLower = verifyResult.recipientName.toLowerCase();
    if (!expectedLower.includes(actualLower) && !actualLower.includes(expectedLower)) {
      warnings.push(
        `Recipient mismatch: screenshot shows "${verifyResult.recipientName}", expected "${expectedRecipient}"`
      );
    }
  }

  if (!verifyResult.paymentSuccess) {
    warnings.push('Payment status unclear — screenshot does not clearly show successful payment');
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}