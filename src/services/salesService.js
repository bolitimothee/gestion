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
      // Valider les données
      const quantity = parseFloat(sale.quantity) || 0;
      const unitPrice = parseFloat(sale.unit_price) || 0;
      const totalAmount = quantity * unitPrice;

      if (!isFinite(totalAmount)) {
        throw new Error('Montant total invalide');
      }

      const { data, error } = await supabase
        .from('sales')
        .insert([
          {
            user_id: userId,
            product_id: sale.product_id || null,
            quantity: quantity,
            unit_price: unitPrice,
            total_amount: totalAmount,
            customer_name: sale.customer_name,
            sale_date: sale.sale_date,
            sale_time: sale.sale_time || null,
            notes: sale.notes || null,
          },
        ])
        .select();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur addSale:', error);
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

      const totalSales = data?.reduce((sum, sale) => {
        const amount = parseFloat(sale.total_amount) || 0;
        return sum + amount;
      }, 0) || 0;
      return { data: isFinite(totalSales) ? totalSales : 0, error: null };
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
      const quantity = parseFloat(updates.quantity) || 0;
      const unitPrice = parseFloat(updates.unit_price) || 0;
      const totalAmount = quantity * unitPrice;

      if (!isFinite(totalAmount)) {
        throw new Error('Montant total invalide');
      }

      const { data, error } = await supabase
        .from('sales')
        .update({
          product_id: updates.product_id || null,
          quantity: quantity,
          unit_price: unitPrice,
          total_amount: totalAmount,
          customer_name: updates.customer_name,
          sale_date: updates.sale_date,
          sale_time: updates.sale_time || null,
          notes: updates.notes || null,
        })
        .eq('id', saleId)
        .select();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur updateSale:', error);
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
