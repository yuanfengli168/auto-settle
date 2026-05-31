import PayNowQR from 'paynowqr';
import QRCode from 'qrcode';

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
 * Generate a PayNow SGQR code image.
 *
 * The QR code only encodes payment instructions (recipient + amount).
 * No banking credentials are included. User must still confirm
 * payment in their bank app after scanning.
 */
export async function generateQR(params: PayNowQRParams): Promise<QRCodeResult> {
  const { recipientPhone, amount, recipientName, reference } = params;

  const pn = new PayNowQR({
    phoneNumber: recipientPhone,
    amount,
    name: recipientName || 'Recipient',
    reference: reference || 'auto-settle',
    editable: false,
  });

  const qrString = pn.generate();

  // Render to PNG data URL
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
 * Save QR code to a file.
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