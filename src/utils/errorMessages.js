/**
 * Messages d'erreur centralisés
 * Facilite la maintenance et la traduction
 */

export const ERROR_MESSAGES = {
  // Authentification
  AUTH_INVALID_CREDENTIALS: 'Email ou mot de passe incorrect. Si le problème persiste, contactez l\'administrateur.',
  AUTH_CONNECTION_ERROR: 'Impossible de se connecter. Veuillez vérifier votre connexion réseau.',
  AUTH_TIMEOUT: 'Connexion trop longue — vérifiez votre réseau et réessayez.',
  AUTH_SESSION_EXPIRED: 'Votre session a expiré. Veuillez vous reconnecter.',
  AUTH_ACCOUNT_EXPIRED: 'Votre compte a expiré. Veuillez contacter l\'administrateur.',
  
  // Formulaires
  FORM_REQUIRED_FIELDS: 'Tous les champs obligatoires doivent être complétés.',
  FORM_INVALID_EMAIL: 'L\'adresse email n\'est pas valide.',
  FORM_INVALID_PASSWORD: 'Le mot de passe doit contenir au moins 8 caractères.',
  FORM_PASSWORDS_MISMATCH: 'Les mots de passe ne correspondent pas.',
  
  // Produits/Stock
  STOCK_LOAD_ERROR: 'Erreur lors du chargement du stock. Vérifiez que les tables Supabase sont créées.',
  STOCK_ADD_ERROR: 'Erreur lors de l\'ajout du produit.',
  STOCK_UPDATE_ERROR: 'Erreur lors de la modification du produit.',
  STOCK_DELETE_ERROR: 'Erreur lors de la suppression du produit.',
  
  // Ventes
  SALES_LOAD_ERROR: 'Erreur lors du chargement des ventes.',
  SALES_CREATE_ERROR: 'Erreur lors de la création de la vente.',
  SALES_UPDATE_ERROR: 'Erreur lors de la modification de la vente.',
  SALES_DELETE_ERROR: 'Erreur lors de la suppression de la vente.',
  SALES_INSUFFICIENT_STOCK: 'Stock insuffisant pour cette opération.',
  
  // Finances
  FINANCE_LOAD_ERROR: 'Erreur lors du chargement des finances.',
  FINANCE_CREATE_ERROR: 'Erreur lors de la création de la dépense.',
  FINANCE_UPDATE_ERROR: 'Erreur lors de la modification de la dépense.',
  FINANCE_DELETE_ERROR: 'Erreur lors de la suppression de la dépense.',
  
  // API/Supabase
  API_NETWORK_ERROR: 'Erreur réseau. Vérifiez votre connexion et réessayez.',
  API_SERVER_ERROR: 'Erreur serveur. Veuillez contacter l\'administrateur.',
  API_NOT_FOUND: 'La ressource demandée n\'existe pas.',
  API_PERMISSION_DENIED: 'Vous n\'avez pas la permission d\'accéder à cette ressource.',
  
  // Général
  GENERAL_ERROR: 'Une erreur s\'est produite. Veuillez réessayer.',
  SYSTEM_ERROR: 'Erreur système. Veuillez contacter l\'administrateur.',
  UNKNOWN_ERROR: 'Une erreur inconnue s\'est produite.',
  
  // Export
  EXPORT_ERROR: 'Erreur lors de l\'export des données.',
  EXPORT_NO_DATA: 'Aucune donnée à exporter.',
};

/**
 * Utility function pour obtenir un message d'erreur
 * @param {string} key - Clé du message d'erreur
 * @param {string} fallback - Message par défaut si la clé n'existe pas
 * @returns {string} Message d'erreur localisé
 */
export function getErrorMessage(key, fallback = ERROR_MESSAGES.GENERAL_ERROR) {
  return ERROR_MESSAGES[key] || fallback;
}

/**
 * Logger en développement seulement
 * @param {string} level - 'log', 'warn', 'error', 'debug'
 * @param {string} context - Contexte du log (ex: '[AuthService]')
 * @param {any} data - Données à logger
 */
export function devLog(level = 'log', context = '', data = null) {
  if (import.meta.env.MODE !== 'development') return;
  
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[${timestamp}] ${context}`;
  
  switch (level) {
    case 'error':
      console.error(prefix, data);
      break;
    case 'warn':
      console.warn(prefix, data);
      break;
    case 'debug':
      console.debug(prefix, data);
      break;
    case 'log':
    default:
      console.log(prefix, data);
  }
}

/**
 * Mapper les erreurs Supabase
 * @param {Error} error - Erreur Supabase
 * @returns {string} Message d'erreur utilisateur
 */
export function mapSupabaseError(error) {
  if (!error) return ERROR_MESSAGES.GENERAL_ERROR;
  
  const message = error.message?.toLowerCase() || '';
  const code = error.code || '';
  
  // Erreurs d'authentification
  if (code === 'invalid_credentials' || message.includes('invalid')) {
    return ERROR_MESSAGES.AUTH_INVALID_CREDENTIALS;
  }
  
  // Erreurs de réseau
  if (message.includes('network') || message.includes('fetch')) {
    return ERROR_MESSAGES.API_NETWORK_ERROR;
  }
  
  // Erreurs de permission
  if (code === 'PGRST116' || message.includes('permission')) {
    return ERROR_MESSAGES.API_PERMISSION_DENIED;
  }
  
  // Erreur de ressource non trouvée
  if (code === 'PGRST116' || message.includes('not found')) {
    return ERROR_MESSAGES.API_NOT_FOUND;
  }
  
  // Erreur serveur
  if (error.status >= 500) {
    return ERROR_MESSAGES.API_SERVER_ERROR;
  }
  
  // Erreur client
  if (error.status >= 400 && error.status < 500) {
    return ERROR_MESSAGES.API_NETWORK_ERROR;
  }
  
  return ERROR_MESSAGES.GENERAL_ERROR;
}

export default {
  ERROR_MESSAGES,
  getErrorMessage,
  devLog,
  mapSupabaseError,
};
