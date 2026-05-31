import fs from 'fs';
import path from 'path';
import os from 'os';
import { generateShareUrl, PayNowQRParams } from './qr.js';

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  currency: string;
  recipient: string;
  recipientPhone: string;
  splitwiseExpenseId: number;
  qrShareUrl: string;
  screenshotPath: string | null;
  status: 'pending' | 'settled';
  note: string;
}

export interface PaymentHistory {
  payments: PaymentRecord[];
}

const HISTORY_DIR = path.join(os.homedir(), '.auto-settle');
const HISTORY_PATH = path.join(HISTORY_DIR, 'history.json');
const SCREENSHOTS_DIR = path.join(HISTORY_DIR, 'screenshots');

function ensureDirs(): void {
  if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
  }
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}

export function loadHistory(): PaymentHistory {
  ensureDirs();
  if (!fs.existsSync(HISTORY_PATH)) {
    return { payments: [] };
  }
  const raw = fs.readFileSync(HISTORY_PATH, 'utf-8');
  return JSON.parse(raw) as PaymentHistory;
}

export function saveHistory(history: PaymentHistory): void {
  ensureDirs();
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

export function addPaymentRecord(record: PaymentRecord): void {
  const history = loadHistory();
  history.payments.push(record);
  saveHistory(history);
}

export function updatePaymentRecord(id: string, updates: Partial<PaymentRecord>): PaymentRecord | null {
  const history = loadHistory();
  const idx = history.payments.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  history.payments[idx] = { ...history.payments[idx], ...updates };
  saveHistory(history);
  return history.payments[idx];
}

/**
 * Generate a unique payment ID.
 */
export function generatePaymentId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `pay_${date}_${seq}`;
}

/**
 * Save a screenshot file to the screenshots directory and return the path.
 */
export function saveScreenshot(sourcePath: string, paymentId: string): string {
  ensureDirs();
  const ext = path.extname(sourcePath) || '.jpg';
  const filename = `${paymentId}${ext}`;
  const destPath = path.join(SCREENSHOTS_DIR, filename);
  fs.copyFileSync(sourcePath, destPath);
  return destPath;
}

/**
 * Create a payment record from settle result.
 */
export function createPaymentRecord(params: {
  amount: number;
  currency: string;
  recipient: string;
  recipientPhone: string;
  splitwiseExpenseId: number;
  qrShareUrl?: string;
  screenshotPath?: string | null;
  note?: string;
}): PaymentRecord {
  const id = generatePaymentId();
  return {
    id,
    date: new Date().toISOString(),
    amount: params.amount,
    currency: params.currency,
    recipient: params.recipient,
    recipientPhone: params.recipientPhone,
    splitwiseExpenseId: params.splitwiseExpenseId,
    qrShareUrl: params.qrShareUrl || '',
    screenshotPath: params.screenshotPath || null,
    status: 'settled',
    note: params.note || '',
  };
}