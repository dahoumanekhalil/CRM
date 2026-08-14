export const CURRENCIES = [
  "USD", "EUR", "GBP",
  "AED", "SAR", "KWD", "QAR", "BHD", "OMR",
  "EGP", "MAD", "DZD", "TND",
] as const;

export type SupportedCurrency = typeof CURRENCIES[number];
