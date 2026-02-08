import { useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

/**
 * Hook pour synchroniser les données en temps réel avec Supabase
 * @param {string} table - Nom de la table Supabase
 * @param {string} userId - ID de l'utilisateur
 * @param {function} onDataChange - Callback quand les données changent
 * @param {array} dependencies - Dépendances pour le useEffect
 */
export function useRealtimeSync(table, userId, onDataChange, dependencies = []) {
  useEffect(() => {
    if (!userId || !table || !onDataChange) return;

    // S'abonner aux changements real-time
    const subscription = supabase
      .channel(`${table}-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Écouter INSERT, UPDATE, DELETE
          schema: 'public',
          table: table,
          filter: `user_id=eq.${userId}`, // Filtrer par utilisateur
        },
        (payload) => {
          // Appeler la fonction de rappel avec les changements
          onDataChange(payload);
        }
      )
      .subscribe();

    // Nettoyer l'abonnement au démontage
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [table, userId, onDataChange, ...dependencies]);
}

/**
 * Hook pour synchroniser les données de produits
 */
export function useProductsSync(userId, setProducts) {
  return useRealtimeSync('products', userId, (payload) => {
    if (payload.eventType === 'INSERT') {
      // Ajouter le nouveau produit
      setProducts(prev => [payload.new, ...prev]);
    } else if (payload.eventType === 'UPDATE') {
      // Mettre à jour le produit
      setProducts(prev =>
        prev.map(p => p.id === payload.new.id ? payload.new : p)
      );
    } else if (payload.eventType === 'DELETE') {
      // Supprimer le produit
      setProducts(prev => prev.filter(p => p.id !== payload.old.id));
    }
  });
}

/**
 * Hook pour synchroniser les données de ventes
 */
export function useSalesSync(userId, setSales) {
  return useRealtimeSync('sales', userId, (payload) => {
    if (payload.eventType === 'INSERT') {
      setSales(prev => [payload.new, ...prev]);
    } else if (payload.eventType === 'UPDATE') {
      setSales(prev =>
        prev.map(s => s.id === payload.new.id ? payload.new : s)
      );
    } else if (payload.eventType === 'DELETE') {
      setSales(prev => prev.filter(s => s.id !== payload.old.id));
    }
  });
}

/**
 * Hook pour synchroniser les données de dépenses
 */
export function useExpensesSync(userId, setExpenses) {
  return useRealtimeSync('expenses', userId, (payload) => {
    if (payload.eventType === 'INSERT') {
      setExpenses(prev => [payload.new, ...prev]);
    } else if (payload.eventType === 'UPDATE') {
      setExpenses(prev =>
        prev.map(e => e.id === payload.new.id ? payload.new : e)
      );
    } else if (payload.eventType === 'DELETE') {
      setExpenses(prev => prev.filter(e => e.id !== payload.old.id));
    }
  });
}

/**
 * Hook pour synchroniser les données de compte
 */
export function useAccountSync(userId, setAccount) {
  return useRealtimeSync('accounts', userId, (payload) => {
    if (payload.eventType === 'UPDATE') {
      setAccount(payload.new);
    }
  });
}

/**
 * Hook pour synchroniser les données des clients (si table existe)
 */
export function useCustomersSync(userId, setCustomers) {
  return useRealtimeSync('customers', userId, (payload) => {
    if (payload.eventType === 'INSERT') {
      setCustomers(prev => [payload.new, ...prev]);
    } else if (payload.eventType === 'UPDATE') {
      setCustomers(prev =>
        prev.map(c => c.id === payload.new.id ? payload.new : c)
      );
    } else if (payload.eventType === 'DELETE') {
      setCustomers(prev => prev.filter(c => c.id !== payload.old.id));
    }
  });
}
