import { supabase } from './supabaseClient';

export const financeService = {
  async getExpenses(userId) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async addExpense(userId, expense) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([
          {
            user_id: userId,
            description: expense.description,
            amount: Math.round(Number(expense.amount) * 100) / 100,
            category: expense.category,
            date: expense.date,
            notes: expense.notes,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getTotalExpenses(userId) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', userId);

      if (error) throw error;

      const totalExpenses = data.reduce((sum, expense) => sum + Math.round(Number(expense.amount) * 100) / 100, 0);
      return { data: totalExpenses, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getFinancialSummary(userId) {
    try {
      // Récupérer toutes les données en parallèle avec des requêtes optimisées
      const [salesPromise, expensesPromise, productsPromise] = await Promise.all([
        supabase
          .from('sales')
          .select('total_amount, quantity, unit_price, product_id')
          .eq('user_id', userId),
        supabase
          .from('expenses')
          .select('amount')
          .eq('user_id', userId),
        supabase
          .from('products')
          .select('id, quantity, purchase_price, selling_price')
          .eq('user_id', userId)
      ]);

      const { data: salesData } = salesPromise;
      const { data: expensesData } = expensesPromise;
      const { data: productsData } = productsPromise;

      // Calculs optimisés avec Map pour O(1) lookup
      const totalRevenue = salesData?.reduce((sum, sale) => sum + Math.round(Number(sale.total_amount) * 100) / 100, 0) || 0;
      const expenseExpenses = expensesData?.reduce((sum, expense) => sum + Math.round(Number(expense.amount) * 100) / 100, 0) || 0;

      // Pré-créer le Map pour optimiser le calcul du COGS
      const productMap = productsData ? new Map(productsData.map(p => [p.id, p])) : new Map();
      
      // Calculer le COGS et la valeur du stock en une seule passe
      let costOfGoodsSold = 0;
      let stockValue = 0;
      let productCosts = 0;

      if (productsData) {
        // Calculer la valeur du stock et le coût des produits
        stockValue = productsData.reduce((sum, product) => {
          return sum + (Math.round(Number(product.quantity)) * Math.round(Number(product.selling_price)));
        }, 0) || 0;

        productCosts = productsData.reduce((sum, product) => {
          return sum + (Math.round(Number(product.quantity)) * Math.round(Number(product.purchase_price)));
        }, 0) || 0;

        // Calculer le COGS basé sur les ventes réelles
        if (salesData) {
          costOfGoodsSold = salesData.reduce((sum, sale) => {
            const product = productMap.get(sale.product_id);
            if (product) {
              const unitCost = Math.round(Number(product.purchase_price));
              const quantitySold = Math.round(Number(sale.quantity));
              return sum + (unitCost * quantitySold);
            }
            return sum;
          }, 0);
        }
      }

      // Les dépenses totales sont seulement les dépenses enregistrées
      const totalExpenses = expenseExpenses;

      // Le bénéfice net correct: Revenus - Dépenses enregistrées - COGS
      const netProfit = totalRevenue - totalExpenses - costOfGoodsSold;

      return {
        data: {
          totalRevenue,
          totalExpenses,
          netProfit,
          stockValue,
          productCosts,
          expenseExpenses,
          costOfGoodsSold,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error };
    }
  },

  async updateExpense(expenseId, expense) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .update({
          description: expense.description,
          amount: Math.round(Number(expense.amount) * 100) / 100,
          category: expense.category,
          date: expense.date,
          notes: expense.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', expenseId)
        .select();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async deleteExpense(expenseId) {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  async getProductCosts(userId) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, quantity, purchase_price')
        .eq('user_id', userId);

      if (error) throw error;

      const totalCost = data?.reduce((sum, product) => {
        return sum + (Math.round(Number(product.quantity)) * Math.round(Number(product.purchase_price)));
      }, 0) || 0;

      return { data: { products: data, totalCost }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};
