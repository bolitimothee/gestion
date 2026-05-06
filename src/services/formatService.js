/**
 * Service de formatage FCFA - Devise unique
 * Simplifié pour le schéma FCFA uniquement
 */

// Constantes FCFA
const FCFA_SYMBOL = 'FCFA';
const FCFA_CODE = 'XAF';

/**
 * Formate un montant en FCFA
 * @param {number} amount - Le montant à formater
 * @returns {string} - Le montant formaté (ex: "1 234,56 FCFA" ou "1 234 FCFA")
 */
import { formatCurrencyOptimized } from '../utils/performance';

export const formatFCFA = formatCurrencyOptimized;

/**
 * Formate un montant en FCFA (alias pour formatCurrency)
 * @param {number} amount - Le montant à formater
 * @returns {string} - Le montant formaté
 */
export const formatCurrency = formatFCFA;

/**
 * Valide qu'un montant est valide pour FCFA
 * @param {number} amount - Le montant à valider
 * @returns {boolean} - True si valide
 */
export const isValidFCFAAmount = (amount) => {
  return typeof amount === 'number' && 
         amount >= 0 && 
         amount <= 999999999999.99;
};

/**
 * Convertit un string en nombre FCFA
 * @param {string} value - La valeur à convertir
 * @returns {number} - Le nombre converti
 */
export const parseFCFA = (value) => {
  if (typeof value === 'number') return value;
  if (!value || value.trim() === '') return 0;
  
  // Nettoyer le string (retirer espaces et "FCFA")
  const cleanValue = value.replace(/\s/g, '').replace(/FCFA/i, '');
  const parsed = parseFloat(cleanValue);
  
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formate une date en français
 * @param {string|Date} date - La date à formater
 * @returns {string} - La date formatée
 */
export const formatDate = (date) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formate une date et heure complètes
 * @param {string|Date} date - La date à formater
 * @returns {string} - La date/heure formatée
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Calcule le montant total (quantité × prix unitaire)
 * @param {number} quantity - La quantité
 * @param {number} unitPrice - Le prix unitaire
 * @returns {number} - Le montant total
 */
export const calculateTotal = (quantity, unitPrice) => {
  return (quantity || 0) * (unitPrice || 0);
};

/**
 * Calcule la marge bénéficiaire
 * @param {number} sellingPrice - Prix de vente
 * @param {number} purchasePrice - Prix d'achat
 * @returns {number} - La marge
 */
export const calculateMargin = (sellingPrice, purchasePrice) => {
  return (sellingPrice || 0) - (purchasePrice || 0);
};

/**
 * Calcule le pourcentage de marge
 * @param {number} sellingPrice - Prix de vente
 * @param {number} purchasePrice - Prix d'achat
 * @returns {number} - Le pourcentage de marge
 */
export const calculateMarginPercentage = (sellingPrice, purchasePrice) => {
  if (!purchasePrice || purchasePrice === 0) return 0;
  return ((sellingPrice - purchasePrice) / purchasePrice) * 100;
};

/**
 * Calcule le niveau de stock en pourcentage
 * @param {number} quantity - Quantité actuelle
 * @param {number} maxQuantity - Quantité maximale (défaut: 100)
 * @returns {number} - Pourcentage de stock (0-100)
 */
export const calculateStockLevel = (quantity, maxQuantity = 100) => {
  if (!quantity || quantity <= 0) return 0;
  const percentage = (Math.round(Number(quantity)) / Math.round(Number(maxQuantity))) * 100;
  return Math.min(Math.round(percentage * 100) / 100, 100); // Limiter à 100% avec précision
};

/**
 * Détermine le statut du stock
 * @param {number} quantity - Quantité actuelle
 * @param {number} maxQuantity - Quantité maximale
 * @returns {object} - Statut avec niveau, couleur et label
 */
export const getStockStatus = (quantity, maxQuantity = 100) => {
  const level = calculateStockLevel(quantity, maxQuantity);
  
  let status, color, label;
  
  if (level === 0) {
    status = 'empty';
    color = '#ef4444'; // rouge
    label = 'Rupture';
  } else if (level <= 20) {
    status = 'low';
    color = '#f59e0b'; // orange
    label = 'Faible';
  } else if (level <= 50) {
    status = 'medium';
    color = '#eab308'; // jaune
    label = 'Moyen';
  } else if (level <= 80) {
    status = 'good';
    color = '#22c55e'; // vert
    label = 'Bon';
  } else {
    status = 'high';
    color = '#2563eb'; // bleu
    label = 'Élevé';
  }
  
  return { level, status, color, label };
};

/**
 * Obtient la couleur de la quantité en stock selon le niveau
 * @param {number} quantity - Quantité actuelle
 * @param {number} maxQuantity - Quantité maximale (défaut: 100)
 * @returns {string} - Couleur hexadécimale
 */
export const getStockColor = (quantity, maxQuantity = 100) => {
  const status = getStockStatus(quantity, maxQuantity);
  return status.color;
};

/**
 * Exportations par défaut pour compatibilité
 */
export default {
  formatCurrency,
  formatFCFA,
  formatDate,
  formatDateTime,
  calculateTotal,
  calculateMargin,
  calculateMarginPercentage,
  calculateStockLevel,
  getStockStatus,
  getStockColor,
  isValidFCFAAmount,
  parseFCFA
};
