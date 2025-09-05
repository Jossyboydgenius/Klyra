/* eslint-disable @typescript-eslint/no-explicit-any */
export const formatAmount = (amount: number, currency: string = 'GHS', hideBalance: boolean = false) => {
  if (hideBalance) return '••••••';
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: currency === 'GHS' ? 'GHS' : 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

export const formatCryptoAmount = (amount: number, symbol: string, hideBalance: boolean = false) => {
  if (hideBalance) return '••••••';
  return `${amount.toFixed(6)} ${symbol}`;
};

export const formatCryptoAmountDetailed = (amount: number, symbol: string, hideBalance: boolean = false) => {
  if (hideBalance) return '••••••';
  return `${amount.toFixed(8)} ${symbol}`;
};

export const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  // You could add a toast notification here
};

export const getConversionRate = (cryptoSymbol: string, currency: string, cryptoInfo: any) => {
  // Mock conversion rates from the base price
  const rates: {[key: string]: number} = {
    'GHS': cryptoInfo.price_ghs,
    'USD': cryptoInfo.price_usd,
    'EUR': cryptoInfo.price_usd * 0.85,
    'GBP': cryptoInfo.price_usd * 0.75,
    'NGN': cryptoInfo.price_usd * 1500,
    'KES': cryptoInfo.price_usd * 130
  };
  return rates[currency] || rates['USD'];
};

export const calculateAssetValue = (amount: number, cryptoSymbol: string, currency: string, cryptoInfo: any) => {
  const price = currency === 'GHS' ? cryptoInfo.price_ghs : cryptoInfo.price_usd;
  return amount * price;
};

export const calculateFeeAmount = (amount: number, feePercentage: string) => {
  const percentage = parseFloat(feePercentage.replace('%', '')) / 100;
  return amount * percentage;
};