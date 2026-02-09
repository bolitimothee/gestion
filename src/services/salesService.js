import { supabase } from './supabaseClient';

export const salesService = {
  async getSales(userId) {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', userId)
        .order('sale_date', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async addSale(userId, sale) {
    try {
      const { data, error } = await supabase
        .from('sales')
        .insert([
          {
            user_id: userId,
            product_id: sale.product_id,
            quantity: sale.quantity,
            unit_price: sale.unit_price,
            total_amount: sale.quantity * sale.unit_price,
            customer_name: sale.customer_name,
            sale_date: sale.sale_date,
            sale_time: sale.sale_time,
            notes: sale.notes,
            currency_code: 'USD',
          },
        ])
        .select();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getTotalSales(userId) {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('total_amount')
        .eq('user_id', userId);

      if (error) throw error;

      const totalSales = data.reduce((sum, sale) => sum + sale.total_amount, 0);
      return { data: totalSales, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getSalesCount(userId) {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('id')
        .eq('user_id', userId);

      if (error) throw error;
      return { data: data.length, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getRecentSales(userId, limit = 5) {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', userId)
        .order('sale_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async updateSale(saleId, updates) {
    try {
      const totalAmount = updates.quantity * updates.unit_price;
      const { data, error } = await supabase
        .from('sales')
        .update({
          product_id: updates.product_id,
          quantity: updates.quantity,
          unit_price: updates.unit_price,
          total_amount: totalAmount,
          customer_name: updates.customer_name,
          sale_date: updates.sale_date,
          sale_time: updates.sale_time,
          notes: updates.notes,
        })
        .eq('id', saleId)
        .select();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async deleteSale(saleId) {
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },
};
