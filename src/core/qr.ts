import sgqr from 'sgqr';
import QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';

export interface QRCodeResult {
  qrString: string;
  dataUrl: string; // base64 PNG data URL
  shareUrl?: string; // online QR image URL (for WhatsApp/Telegram sharing)
}

export interface PayNowQRParams {
  recipientPhone: string;
  amount: number;
  recipientName?: string;
  reference?: string;
}

/**
 * Generate a PayNow SGQR string.
 */
export function generateQRString(params: PayNowQRParams): string {
  const { recipientPhone, amount, recipientName, reference } = params;

  return sgqr.generate({
    number: recipientPhone,
    amount: amount.toFixed(2),
    merchant_name: recipientName || 'Recipient',
    comments: reference || 'auto-settle',
  });
}

/**
 * Generate a shareable URL for the QR code using qrserver.com API.
 *
 * This creates an online image URL that can be sent via WhatsApp/Telegram.
 * The QR data (payee info + amount) is embedded in the URL as query params.
 *
 * Security note:
 * - The API only renders QR images, it doesn't store or process payments
 * - QR codes are inherently plaintext (anyone scanning sees the same data)
 * - The URL contains the recipient phone number — only share with intended recipients
 * - For maximum privacy, use --output to save locally instead
 */
export function generateShareUrl(params: PayNowQRParams, size: number = 400): string {
  const qrString = generateQRString(params);
  const encoded = encodeURIComponent(qrString);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
}

/**
 * Generate a PayNow SGQR code image (data URL).
 */
export async function generateQR(params: PayNowQRParams): Promise<QRCodeResult> {
  const qrString = generateQRString(params);

  const dataUrl = await QRCode.toDataURL(qrString, {
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  const shareUrl = generateShareUrl(params);

  return { qrString, dataUrl, shareUrl };
}

/**
 * Render QR code to terminal (ASCII art).
 */
export function renderQRToTerminal(params: PayNowQRParams): void {
  const qrString = generateQRString(params);
  qrcodeTerminal.generate(qrString, { small: true }, (code: string) => {
    console.log(code);
  });
}

/**
 * Save QR code to a PNG file.
 */
export async function saveQRToFile(
  params: PayNowQRParams,
  filePath: string
): Promise<QRCodeResult> {
  const result = await generateQR(params);

  await QRCode.toFile(filePath, result.qrString, {
    width: 400,
    margin: 2,
  });

  return result;
}