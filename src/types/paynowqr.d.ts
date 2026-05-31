declare module 'sgqr' {
  interface SGQROptions {
    number: string;
    amount: string;
    number_type?: 'MOBILE' | 'UEN';
    merchant_name?: string;
    comments?: string;
    country_code?: string;
    currency_code?: string;
    expiry_date?: string;
    editable?: boolean;
  }

  function generate(options: SGQROptions): string;
  function generate_code(options: SGQROptions & { type?: string; scale?: number }): Promise<Buffer | null>;
  function generate_svg(options: SGQROptions): Promise<string>;

  export { generate, generate_code, generate_svg };
  export default { generate, generate_code, generate_svg };
}

declare module 'qrcode-terminal' {
  function generate(text: string, options: { small: boolean }, callback: (code: string) => void): void;
  function generate(text: string, callback: (code: string) => void): void;
}