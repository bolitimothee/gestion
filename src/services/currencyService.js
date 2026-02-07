// Taux de change par rapport à USD (mis à jour manuellement)
const EXCHANGE_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.52,
  CHF: 0.88,
  CNY: 7.24,
  JPY: 149.50,
  INR: 83.12,
  BRL: 4.97,
  XAF: 607.50, // Franc CFA Afrique Centrale
  XOF: 607.50, // Franc CFA Afrique Ouest
  MAD: 10.10,
  ZAR: 18.75,
  KES: 156.50,
  NGN: 1550.00,
  GHS: 12.50,
  AOA: 833.50,
  MZN: 63.75,
  RWF: 1305.00,
  TZS: 2650.00,
};

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  CNY: '¥',
  JPY: '¥',
  INR: '₹',
  BRL: 'R$',
  XAF: 'FCFA',
  XOF: 'CFA',
  MAD: 'د.م.',
  ZAR: 'R',
  KES: 'KSh',
  NGN: '₦',
  GHS: '₵',
  AOA: 'Kz',
  MZN: 'MT',
  RWF: 'FRw',
  TZS: 'TSh',
};

const CURRENCY_NAMES = {
  USD: 'Dollar américain',
  EUR: 'Euro',
  GBP: 'Livre sterling',
  CAD: 'Dollar canadien',
  AUD: 'Dollar australien',
  CHF: 'Franc suisse',
  CNY: 'Yuan chinois',
  JPY: 'Yen japonais',
  INR: 'Roupie indienne',
  BRL: 'Real brésilien',
  XAF: 'Franc CFA BEAC',
  XOF: 'Franc CFA WAEMU',
  MAD: 'Dirham marocain',
  ZAR: 'Rand sud-africain',
  KES: 'Shilling kenyan',
  NGN: 'Naira nigérian',
  GHS: 'Cedi ghanéen',
  AOA: 'Kwanza angolais',
  MZN: 'Metical mozambicain',
  RWF: 'Franc rwandais',
  TZS: 'Shilling tanzanien',
};

// Devise par défaut
const DEFAULT_CURRENCY = 'USD';

/**
 * Récupère la devise préférée de l'utilisateur depuis le localStorage
 */
export const getUserCurrency = () => {
  const stored = localStorage.getItem('userCurrency');
  return stored || DEFAULT_CURRENCY;
};

/**
 * Sauvegarde la devise préférée de l'utilisateur
 */
export const setUserCurrency = (currency) => {
  if (EXCHANGE_RATES[currency]) {
    localStorage.setItem('userCurrency', currency);
    return true;
  }
  return false;
};

/**
 * Convertit un montant d'une devise à une autre
 * @param {number} amount - Le montant à convertir
 * @param {string} fromCurrency - Devise source (par défaut USD)
 * @param {string} toCurrency - Devise cible
 * @returns {number} - Le montant converti
 */
export const convertCurrency = (amount, fromCurrency = 'USD', toCurrency = 'USD') => {
  if (!EXCHANGE_RATES[fromCurrency] || !EXCHANGE_RATES[toCurrency]) {
    console.warn(`Devise inconnue: ${fromCurrency} ou ${toCurrency}`);
    return amount;
  }

  // Convertir en USD en premier, puis vers la devise cible
  const amountInUSD = amount / EXCHANGE_RATES[fromCurrency];
  const convertedAmount = amountInUSD * EXCHANGE_RATES[toCurrency];
  
  return Number(convertedAmount.toFixed(2));
};

/**
 * Formate un montant avec le symbole de devise approprié
 * @param {number} amount - Le montant à formater
 * @param {string} currency - Le code devise
 * @returns {string} - Le montant formaté (ex: "1,234.56 EUR")
 */
export const formatCurrencyAmount = (amount, currency = DEFAULT_CURRENCY) => {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formatted = Number(amount).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  // Placer le symbole selon la devise
  if (['EUR', 'XAF', 'XOF', 'MAD', 'AOA', 'MZN', 'RWF'].includes(currency)) {
    return `${formatted} ${symbol}`;
  }
  
  return `${symbol} ${formatted}`;
};

/**
 * Récupère la liste de toutes les devises disponibles
 * @returns {array} - Liste des devises avec code et nom
 */
export const getAvailableCurrencies = () => {
  return Object.keys(EXCHANGE_RATES).map((code) => ({
    code,
    name: CURRENCY_NAMES[code] || code,
    symbol: CURRENCY_SYMBOLS[code] || code,
  })).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
};

/**
 * Obtient le taux de change pour une devise
 * @param {string} currency - Le code devise
 * @returns {number} - Le taux par rapport à USD
 */
export const getExchangeRate = (currency = DEFAULT_CURRENCY) => {
  return EXCHANGE_RATES[currency] || 1;
};

/**
 * Convertit un objet financier complet vers une devise
 * @param {object} financial - Les données financières {totalRevenue, totalExpenses, netProfit}
 * @param {string} targetCurrency - La devise cible
 * @returns {object} - Les données converties
 */
export const convertFinancialData = (financial, targetCurrency = DEFAULT_CURRENCY) => {
  return {
    totalRevenue: convertCurrency(financial.totalRevenue || 0, 'USD', targetCurrency),
    totalExpenses: convertCurrency(financial.totalExpenses || 0, 'USD', targetCurrency),
    netProfit: convertCurrency(financial.netProfit || 0, 'USD', targetCurrency),
    stockValue: convertCurrency(financial.stockValue || 0, 'USD', targetCurrency),
    productCosts: convertCurrency(financial.productCosts || 0, 'USD', targetCurrency),
    expenseExpenses: convertCurrency(financial.expenseExpenses || 0, 'USD', targetCurrency),
  };
};

/**
 * Récupère le symbole de devise
 */
export const getCurrencySymbol = (currency = DEFAULT_CURRENCY) => {
  return CURRENCY_SYMBOLS[currency] || currency;
};

/**
 * Récupère le nom complet de la devise
 */
export const getCurrencyName = (currency = DEFAULT_CURRENCY) => {
  return CURRENCY_NAMES[currency] || currency;
};
