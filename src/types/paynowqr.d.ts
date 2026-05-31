declare module 'paynowqr' {
  interface PayNowQRParams {
    phoneNumber?: string;
    vpa?: string;
    uen?: string;
    amount?: number;
    editable?: boolean;
    expiry?: string;
    name?: string;
    reference?: string;
  }

  class PayNowQR {
    constructor(params: PayNowQRParams);
    generate(): string;
  }

  export default PayNowQR;
}

declare module 'qrcode-terminal' {
  function generate(text: string, options: { small: boolean }, callback: (code: string) => void): void;
  function generate(text: string, callback: (code: string) => void): void;
}