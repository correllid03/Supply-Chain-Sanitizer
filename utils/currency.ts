
export const CURRENCY_RATES: Record<string, number> = {
  'USD': 1.0,
  'EUR': 1.09, // 1 EUR = ~1.09 USD
  'GBP': 1.27, // 1 GBP = ~1.27 USD
  'JPY': 0.0067,
  'CNY': 0.14,
  'CAD': 0.74,
  'AUD': 0.65,
  'MXN': 0.059,
  'PLN': 0.25,
  'BRL': 0.20,
  'RUB': 0.011,
  'INR': 0.012,
  'TRY': 0.030 // 1 TRY = ~0.03 USD
};

export const SYMBOL_MAP: Record<string, string> = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  'R$': 'BRL',
  '₽': 'RUB',
  '₹': 'INR',
  '元': 'CNY',
  'zł': 'PLN',
  '₺': 'TRY'
};

export const CODE_TO_SYMBOL: Record<string, string> = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'JPY': '¥',
  'CNY': '¥', // Can be 元 or ¥
  'PLN': 'zł',
  'BRL': 'R$',
  'RUB': '₽',
  'INR': '₹',
  'MXN': '$',
  'CAD': '$',
  'AUD': '$',
  'TRY': '₺'
};

export const getCurrencyCode = (symbol: string): string => {
  // Simple heuristic: if symbol is already a 3-letter code, return it
  if (symbol && symbol.length === 3 && /^[A-Z]+$/.test(symbol)) return symbol;
  return SYMBOL_MAP[symbol] || 'USD'; // Default to USD if unknown
};

export const getExchangeRate = (sourceSymbol: string, targetCode: string): { rate: number, sourceCode: string } => {
  const sourceCode = getCurrencyCode(sourceSymbol);
  
  if (sourceCode === targetCode) return { rate: 1, sourceCode };

  const sourceRateInUSD = CURRENCY_RATES[sourceCode] || 1;
  const targetRateInUSD = CURRENCY_RATES[targetCode] || 1;

  // Amount(Target) = Amount(Source) * (SourceRateInUSD / TargetRateInUSD)
  const rate = sourceRateInUSD / targetRateInUSD;
  return { rate, sourceCode };
};
