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
      const quantity = parseInt(product.quantity) || 0;
      const { data, error } = await supabase
        .from('products')
        .insert([
          {
            user_id: userId,
            name: product.name,
            description: product.description,
            quantity: quantity,
            initial_quantity: quantity,
            purchase_price: product.purchase_price,
            selling_price: product.selling_price,
            category: product.category,
            sku: product.sku,
          },
        ])
        .select();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur addProduct:', error);
      return { data: null, error };
    }
  },

  async updateProduct(productId, updates) {
    try {
      // Si on met à jour la quantité, on met à jour aussi initial_quantity en même temps si besoin
      const updatedData = { ...updates };
      if (updates.quantity !== undefined && !updates.initial_quantity) {
        // Ne pas écraser initial_quantity si elle est déjà définie
      }
      const { data, error } = await supabase
        .from('products')
        .update(updatedData)
        .eq('id', productId)
        .select();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur updateProduct:', error);
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
        .select('quantity, selling_price')
        .eq('user_id', userId);

      if (error) throw error;

      const totalValue = data?.reduce((sum, product) => {
        const qty = parseFloat(product.quantity) || 0;
        const price = parseFloat(product.selling_price) || 0;
        return sum + (qty * price);
      }, 0) || 0;

      return { data: isFinite(totalValue) ? totalValue : 0, error: null };
    } catch (error) {
      console.error('Erreur getStockValue:', error);
      return { data: null, error };
    }
  },
};
