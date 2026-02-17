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

      // Insérer la vente
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

      // Décrémenter la quantité du produit
      if (sale.product_id) {
        const { data: productData } = await supabase
          .from('products')
          .select('quantity')
          .eq('id', sale.product_id)
          .single();

        if (productData) {
          const newQuantity = Math.max(0, (productData.quantity || 0) - quantity);
          await supabase
            .from('products')
            .update({ quantity: newQuantity })
            .eq('id', sale.product_id);
        }
      }

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

      // Récupérer l'ancienne vente
      const { data: oldSale } = await supabase
        .from('sales')
        .select('product_id, quantity')
        .eq('id', saleId)
        .single();

      // Mettre à jour la vente
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

      // Ajuster les quantités des produits si changement
      if (oldSale?.product_id && updates.product_id) {
        const quantityDiff = quantity - (oldSale.quantity || 0);
        
        // Mettre à jour l'ancien produit (réincrémenter si on a réduit la vente)
        if (oldSale.product_id === updates.product_id) {
          const { data: product } = await supabase
            .from('products')
            .select('quantity')
            .eq('id', oldSale.product_id)
            .single();
          
          if (product) {
            const newQuantity = (product.quantity || 0) - quantityDiff;
            await supabase
              .from('products')
              .update({ quantity: newQuantity })
              .eq('id', oldSale.product_id);
          }
        } else {
          // Produit changé: réincrémenter l'ancien, décrémenter le nouveau
          const { data: oldProduct } = await supabase
            .from('products')
            .select('quantity')
            .eq('id', oldSale.product_id)
            .single();
          
          if (oldProduct) {
            await supabase
              .from('products')
              .update({ quantity: (oldProduct.quantity || 0) + (oldSale.quantity || 0) })
              .eq('id', oldSale.product_id);
          }
          
          // Décrémenter le nouveau produit
          const { data: newProduct } = await supabase
            .from('products')
            .select('quantity')
            .eq('id', updates.product_id)
            .single();
          
          if (newProduct) {
            await supabase
              .from('products')
              .update({ quantity: (newProduct.quantity || 0) - quantity })
              .eq('id', updates.product_id);
          }
        }
      }

      return { data, error: null };
    } catch (error) {
      console.error('Erreur updateSale:', error);
      return { data: null, error };
    }
  },

  async deleteSale(saleId) {
    try {
      // Récupérer la vente avant de la supprimer pour avoir product_id et quantity
      const { data: saleData, error: fetchError } = await supabase
        .from('sales')
        .select('product_id, quantity')
        .eq('id', saleId)
        .single();

      if (fetchError) throw fetchError;

      // Supprimer la vente
      const { error: deleteError } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId);

      if (deleteError) throw deleteError;

      // Réincrémenter la quantité du produit
      if (saleData?.product_id) {
        const { data: product } = await supabase
          .from('products')
          .select('quantity')
          .eq('id', saleData.product_id)
          .single();

        if (product) {
          const newQuantity = (product.quantity || 0) + (saleData.quantity || 0);
          await supabase
            .from('products')
            .update({ quantity: newQuantity })
            .eq('id', saleData.product_id);
        }
      }

      return { error: null };
    } catch (error) {
      console.error('Erreur deleteSale:', error);
      return { error };
    }
  },
};
