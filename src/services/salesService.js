import { supabase } from './supabaseClient';

export const salesService = {
  async getSales(userId) {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('id, product_id, customer_id, quantity, unit_price, total_amount, sale_date, created_at')
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
      // Ajouter la vente
      const { data, error } = await supabase
        .from('sales')
        .insert([
          {
            user_id: userId,
            product_id: sale.product_id,
            customer_id: sale.customer_id || null,
            quantity: sale.quantity,
            unit_price: sale.unit_price,
            total_amount: sale.quantity * sale.unit_price,
            customer_name: sale.customer_name,
            sale_date: sale.sale_date,
            sale_time: sale.sale_time,
            notes: sale.notes,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      // Mettre à jour le stock du produit
      const { data: currentProduct, error: fetchError } = await supabase
        .from('products')
        .select('quantity')
        .eq('id', sale.product_id)
        .eq('user_id', userId)
        .single();

      if (!fetchError && currentProduct) {
        const newQuantity = Math.max(0, currentProduct.quantity - sale.quantity);
        const { error: stockError } = await supabase
          .from('products')
          .update({ quantity: newQuantity })
          .eq('id', sale.product_id)
          .eq('user_id', userId);

        if (stockError) {
          console.warn('Erreur mise à jour stock:', stockError);
        }
      } else {
        console.warn('Erreur récupération produit pour mise à jour stock:', fetchError);
      }

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
      // Récupérer la vente originale pour gérer le stock
      const { data: originalSale, error: fetchError } = await supabase
        .from('sales')
        .select('product_id, quantity')
        .eq('id', saleId)
        .single();

      if (fetchError) throw fetchError;

      const totalAmount = updates.quantity * updates.unit_price;
      const { data, error } = await supabase
        .from('sales')
        .update({
          product_id: updates.product_id,
          customer_id: updates.customer_id || null,
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

      // Gérer le stock si le produit ou la quantité a changé
      if (originalSale) {
        // Si le produit a changé, remettre le stock de l'ancien produit
        if (originalSale.product_id !== updates.product_id) {
          // Remettre le stock de l'ancien produit
          const { data: oldProduct, error: oldProductError } = await supabase
            .from('products')
            .select('quantity')
            .eq('id', originalSale.product_id)
            .single();

          if (!oldProductError && oldProduct) {
            const newOldQuantity = oldProduct.quantity + originalSale.quantity;
            await supabase
              .from('products')
              .update({ quantity: newOldQuantity })
              .eq('id', originalSale.product_id);
          }

          // Déduire le stock du nouveau produit
          const { data: newProduct, error: newProductError } = await supabase
            .from('products')
            .select('quantity')
            .eq('id', updates.product_id)
            .single();

          if (!newProductError && newProduct) {
            const newNewQuantity = Math.max(0, newProduct.quantity - updates.quantity);
            await supabase
              .from('products')
              .update({ quantity: newNewQuantity })
              .eq('id', updates.product_id);
          }
        } else if (originalSale.quantity !== updates.quantity) {
          // Si seulement la quantité a changé, ajuster le stock
          const quantityDiff = originalSale.quantity - updates.quantity;
          const { data: currentProduct, error: productError } = await supabase
            .from('products')
            .select('quantity')
            .eq('id', updates.product_id)
            .single();

          if (!productError && currentProduct) {
            const newQuantity = currentProduct.quantity + quantityDiff;
            await supabase
              .from('products')
              .update({ quantity: Math.max(0, newQuantity) })
              .eq('id', updates.product_id);
          }
        }
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async deleteSale(saleId) {
    try {
      // Récupérer les détails de la vente avant suppression
      const { data: saleData, error: fetchError } = await supabase
        .from('sales')
        .select('product_id, quantity')
        .eq('id', saleId)
        .single();

      if (fetchError) throw fetchError;

      // Supprimer la vente
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId);

      if (error) throw error;

      // Remettre le stock en ajoutant la quantité vendue
      if (saleData && saleData.product_id) {
        const { data: currentProduct, error: productError } = await supabase
          .from('products')
          .select('quantity')
          .eq('id', saleData.product_id)
          .single();

        if (!productError && currentProduct) {
          const newQuantity = currentProduct.quantity + saleData.quantity;
          const { error: stockError } = await supabase
            .from('products')
            .update({ quantity: newQuantity })
            .eq('id', saleData.product_id);

          if (stockError) {
            console.warn('Erreur remise en stock:', stockError);
          }
        }
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  },
};
