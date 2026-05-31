import sgqr from 'sgqr';
import QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';

export interface QRCodeResult {
  qrString: string;
  dataUrl: string; // base64 PNG data URL
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

  return { qrString, dataUrl };
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