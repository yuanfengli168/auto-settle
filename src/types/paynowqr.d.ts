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