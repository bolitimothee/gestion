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
      const amount = parseFloat(expense.amount) || 0;
      if (!isFinite(amount)) {
        throw new Error('Montant invalide');
      }
      
      const { data, error } = await supabase
        .from('expenses')
        .insert([
          {
            user_id: userId,
            description: expense.description,
            amount: amount,
            category: expense.category,
            date: expense.date,
            notes: expense.notes || null,
          },
        ])
        .select();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur addExpense:', error);
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
      console.error('Erreur deleteExpense:', error);
      return { error };
    }
  },

  async getTotalExpenses(userId) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', userId);

      if (error) throw error;

      const totalExpenses = data?.reduce((sum, expense) => {
        const amount = parseFloat(expense.amount) || 0;
        return sum + amount;
      }, 0) || 0;
      return { data: isFinite(totalExpenses) ? totalExpenses : 0, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getFinancialSummary(userId) {
    try {
      // Récupérer les ventes avec product_id et quantity
      const { data: salesData } = await supabase
        .from('sales')
        .select('product_id, quantity, total_amount')
        .eq('user_id', userId);

      const totalRevenue = salesData?.reduce((sum, sale) => {
        const amount = parseFloat(sale.total_amount) || 0;
        return sum + amount;
      }, 0) || 0;

      // Récupérer les dépenses enregistrées
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', userId);

      const totalExpensesAmount = expensesData?.reduce((sum, expense) => {
        const amount = parseFloat(expense.amount) || 0;
        return sum + amount;
      }, 0) || 0;

      // Récupérer les produits avec leurs prix d'achat
      const { data: productsData } = await supabase
        .from('products')
        .select('id, quantity, purchase_price, selling_price')
        .eq('user_id', userId);

      // Calculer le Coût des Marchandises Vendues (COGS) basé sur les ventes
      const COGS = salesData?.reduce((sum, sale) => {
        const product = productsData?.find((p) => p.id === sale.product_id);
        const qty = parseFloat(sale.quantity) || 0;
        const purchasePrice = parseFloat(product?.purchase_price) || 0;
        return sum + (qty * purchasePrice);
      }, 0) || 0;

      // Valeur du stock (basée sur le prix de vente)
      const stockValue = productsData?.reduce((sum, product) => {
        const qty = parseFloat(product.quantity) || 0;
        const price = parseFloat(product.selling_price) || 0;
        return sum + (qty * price);
      }, 0) || 0;

      // Coût du stock actuel (basé sur le prix d'achat)
      const stockCost = productsData?.reduce((sum, product) => {
        const qty = parseFloat(product.quantity) || 0;
        const price = parseFloat(product.purchase_price) || 0;
        return sum + (qty * price);
      }, 0) || 0;

      // Profit Net = Revenu - COGS - Dépenses
      const netProfit = totalRevenue - COGS - totalExpensesAmount;

      return {
        data: {
          totalRevenue: isFinite(totalRevenue) ? totalRevenue : 0,
          totalExpenses: isFinite(totalExpensesAmount) ? totalExpensesAmount : 0,
          COGS: isFinite(COGS) ? COGS : 0,
          netProfit: isFinite(netProfit) ? netProfit : 0,
          stockValue: isFinite(stockValue) ? stockValue : 0,
          stockCost: isFinite(stockCost) ? stockCost : 0,
        },
        error: null,
      };
    } catch (error) {
      console.error('Erreur getFinancialSummary:', error);
      return { data: null, error };
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
        const qty = parseFloat(product.quantity) || 0;
        const price = parseFloat(product.purchase_price) || 0;
        return sum + (qty * price);
      }, 0) || 0;

      return { data: { products: data, totalCost: isFinite(totalCost) ? totalCost : 0 }, error: null };
    } catch (error) {
      console.error('Erreur getProductCosts:', error);
      return { data: null, error };
    }
  },
};
