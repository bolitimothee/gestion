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
            amount: expense.amount,
            category: expense.category,
            date: expense.date,
            notes: expense.notes,
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

      const totalExpenses = data.reduce((sum, expense) => sum + expense.amount, 0);
      return { data: totalExpenses, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getFinancialSummary(userId) {
    try {
      // Récupérer les ventes
      const { data: salesData } = await supabase
        .from('sales')
        .select('total_amount')
        .eq('user_id', userId);

      const totalRevenue = salesData?.reduce((sum, sale) => {
        const amount = parseFloat(sale.total_amount) || 0;
        return sum + amount;
      }, 0) || 0;

      // Récupérer les dépenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', userId);

      const totalExpensesAmount = expensesData?.reduce((sum, expense) => {
        const amount = parseFloat(expense.amount) || 0;
        return sum + amount;
      }, 0) || 0;

      // Récupérer le coût d'achat des produits en stock
      const { data: productsData } = await supabase
        .from('products')
        .select('quantity, purchase_price, selling_price')
        .eq('user_id', userId);

      const productCosts = productsData?.reduce((sum, product) => {
        const qty = parseFloat(product.quantity) || 0;
        const price = parseFloat(product.purchase_price) || 0;
        return sum + (qty * price);
      }, 0) || 0;

      const stockValue = productsData?.reduce((sum, product) => {
        const qty = parseFloat(product.quantity) || 0;
        const price = parseFloat(product.selling_price) || 0;
        return sum + (qty * price);
      }, 0) || 0;

      // Les dépenses totales incluent les dépenses enregistrées + le coût d'achat des produits
      const totalExpenses = totalExpensesAmount + productCosts;

      const netProfit = totalRevenue - totalExpenses;

      return {
        data: {
          totalRevenue: isFinite(totalRevenue) ? totalRevenue : 0,
          totalExpenses: isFinite(totalExpenses) ? totalExpenses : 0,
          netProfit: isFinite(netProfit) ? netProfit : 0,
          stockValue: isFinite(stockValue) ? stockValue : 0,
          productCosts: isFinite(productCosts) ? productCosts : 0,
        },
        error: null,
      };
    } catch (error) {
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
        return sum + (product.quantity * product.purchase_price);
      }, 0) || 0;

      return { data: { products: data, totalCost }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};
