import { supabase } from './supabaseClient';

export const stockService = {
  async getProducts(userId) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, quantity, purchase_price, selling_price, category, sku, created_at, updated_at')
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
            quantity: Math.round(Number(product.quantity)) || 0,
            purchase_price: Math.round(Number(product.purchase_price)) || 0,
            selling_price: Math.round(Number(product.selling_price)) || 0,
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
      // S'assurer que les prix sont des nombres entiers
      const sanitizedUpdates = {
        ...updates,
        quantity: updates.quantity !== undefined ? Math.round(Number(updates.quantity)) || 0 : undefined,
        purchase_price: updates.purchase_price !== undefined ? Math.round(Number(updates.purchase_price)) || 0 : undefined,
        selling_price: updates.selling_price !== undefined ? Math.round(Number(updates.selling_price)) || 0 : undefined,
      };

      const { data, error } = await supabase
        .from('products')
        .update(sanitizedUpdates)
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
