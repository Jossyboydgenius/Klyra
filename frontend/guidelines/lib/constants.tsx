export const CRYPTO_INFO = {
  'BTC': { 
    name: 'Bitcoin', 
    color: 'bg-orange-100 text-orange-600',
    price_ghs: 537500,
    price_usd: 43000,
    change: '+2.4%',
    trending: 'up' as const,
    description: 'The world\'s first and largest cryptocurrency by market cap.'
  },
  'ETH': { 
    name: 'Ethereum', 
    color: 'bg-blue-100 text-blue-600',
    price_ghs: 30000,
    price_usd: 2400,
    change: '+1.8%',
    trending: 'up' as const,
    description: 'Smart contract platform powering decentralized applications.'
  },
  'BNB': { 
    name: 'BNB', 
    color: 'bg-yellow-100 text-yellow-600',
    price_ghs: 4000,
    price_usd: 320,
    change: '+0.9%',
    trending: 'up' as const,
    description: 'Native token of the Binance ecosystem and BSC network.'
  },
  'USDT': { 
    name: 'Tether', 
    color: 'bg-green-100 text-green-600',
    price_ghs: 12.5,
    price_usd: 1,
    change: '0.0%',
    trending: 'stable' as const,
    description: 'Dollar-pegged stablecoin for stable value transactions.'
  },
  'USDC': { 
    name: 'USD Coin', 
    color: 'bg-blue-100 text-blue-600',
    price_ghs: 12.5,
    price_usd: 1,
    change: '0.0%',
    trending: 'stable' as const,
    description: 'Regulated stablecoin backed by US dollar reserves.'
  }
};

export const CRYPTOCURRENCIES = [
  { symbol: 'BTC', name: 'Bitcoin', price_ghs: 537500, price_usd: 43000 },
  { symbol: 'ETH', name: 'Ethereum', price_ghs: 30000, price_usd: 2400 },
  { symbol: 'BNB', name: 'BNB', price_ghs: 4000, price_usd: 320 },
  { symbol: 'USDT', name: 'Tether', price_ghs: 12.5, price_usd: 1 },
  { symbol: 'USDC', name: 'USD Coin', price_ghs: 12.5, price_usd: 1 }
];

export const PAYMENT_METHOD_TYPES = [
  {
    type: 'momo',
    name: 'Mobile Money',
    description: 'MTN MoMo, Vodafone Cash, AirtelTigo Money',
    icon: 'Smartphone',
    color: 'bg-green-100 text-green-600',
    fields: [
      { name: 'provider', label: 'Provider', type: 'select', options: ['MTN MoMo', 'Vodafone Cash', 'AirtelTigo Money'] },
      { name: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+233 XXX XXX XXX' },
      { name: 'name', label: 'Account Name', type: 'text', placeholder: 'Account holder name' }
    ]
  },
  {
    type: 'bank',
    name: 'Bank Account',
    description: 'Local and international bank accounts',
    icon: 'CreditCard',
    color: 'bg-blue-100 text-blue-600',
    fields: [
      { name: 'bank_name', label: 'Bank Name', type: 'select', options: ['GCB Bank', 'Ecobank', 'Standard Chartered', 'Fidelity Bank', 'Access Bank'] },
      { name: 'account_number', label: 'Account Number', type: 'text', placeholder: 'Account number' },
      { name: 'account_name', label: 'Account Name', type: 'text', placeholder: 'Account holder name' },
      { name: 'branch', label: 'Branch (Optional)', type: 'text', placeholder: 'Branch name' }
    ]
  },
  {
    type: 'card',
    name: 'Debit/Credit Card',
    description: 'Visa, Mastercard, and other cards',
    icon: 'CreditCard',
    color: 'bg-purple-100 text-purple-600',
    fields: [
      { name: 'card_number', label: 'Card Number', type: 'text', placeholder: '•••• •••• •••• ••••' },
      { name: 'card_name', label: 'Cardholder Name', type: 'text', placeholder: 'Name on card' },
      { name: 'expiry', label: 'Expiry Date', type: 'text', placeholder: 'MM/YY' },
      { name: 'cvv', label: 'CVV', type: 'text', placeholder: '•••' }
    ]
  }
];

export const PAYMENT_METHODS = [
  {
    id: 'momo',
    name: 'Mobile Money',
    description: 'MTN MoMo, Vodafone Cash, AirtelTigo',
    icon: 'Smartphone',
    available_balance: 250,
    currency: 'GHS'
  },
  {
    id: 'bank',
    name: 'Bank Transfer',
    description: 'GCB Bank •••• 1234',
    icon: 'CreditCard',
    available_balance: 1500,
    currency: 'GHS'
  }
];

export const WITHDRAWAL_METHODS = [
  {
    id: 'momo',
    name: 'Mobile Money',
    description: 'MTN MoMo, Vodafone Cash, AirtelTigo',
    icon: 'Smartphone',
    fee: '1%',
    processing_time: '5-15 minutes'
  },
  {
    id: 'bank',
    name: 'Bank Transfer',
    description: 'GCB Bank •••• 1234',
    icon: 'CreditCard',
    fee: '0.5%',
    processing_time: '1-3 hours'
  }
];

export const NETWORKS = {
  'mainnet': { 
    name: 'Ethereum', 
    color: 'bg-gray-100 text-gray-700',
    explorer: 'https://etherscan.io',
    symbol: 'ETH'
  },
  'base': { 
    name: 'Base', 
    color: 'bg-blue-100 text-blue-700',
    explorer: 'https://basescan.org',
    symbol: 'BASE'
  },
  'bsc': { 
    name: 'BSC', 
    color: 'bg-yellow-100 text-yellow-700',
    explorer: 'https://bscscan.com',
    symbol: 'BNB'
  }
};

export const CONVERSION_CURRENCIES = [
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' }
];

export const ID_TYPES = [
  { value: 'national_id', label: 'National ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'voters_id', label: 'Voter ID' }
];