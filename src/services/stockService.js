import { supabase } from './supabaseClient';

export const stockService = {
  async getProducts(userId) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async addProduct(userId, product) {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([
          {
            user_id: userId,
            name: product.name,
            description: product.description,
            quantity: product.quantity,
            purchase_price: product.purchase_price,
            selling_price: product.selling_price,
            category: product.category,
            sku: product.sku,
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

  async updateProduct(productId, updates) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', productId)
        .select();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async deleteProduct(productId) {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  async getStockValue(userId) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('quantity, purchase_price')
        .eq('user_id', userId);

      if (error) throw error;

      const totalValue = data.reduce((sum, product) => {
        return sum + (product.quantity * product.purchase_price);
      }, 0);

      return { data: totalValue, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};
