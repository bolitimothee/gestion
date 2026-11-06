import { supabase } from './supabaseClient';
import logger from '../utils/logger';

async function recordStockMove({ userId, productId, type, quantity, quantityBefore, quantityAfter, reason, referenceId, referenceType }) {
  const { error } = await supabase
    .from('stock_moves')
    .insert({
      user_id: userId,
      product_id: productId,
      type,
      quantity,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      reason: reason || null,
      reference_id: referenceId || null,
      reference_type: referenceType || null,
    });

  if (error) {
    logger.warn('Mouvement de stock non enregistré. Exécutez la migration additive:', error);
  }
  return { error };
}

export const stockService = {
  async getStockAlerts(userId) {
    try {
      let { data, error } = await supabase
        .from('products')
        .select('id, name, quantity, min_stock')
        .eq('user_id', userId)
        .eq('is_active', true);
      if (error?.code === '42703') {
        ({ data, error } = await supabase.from('products').select('id, name, quantity').eq('user_id', userId));
      }
      if (error) throw error;
      const products = data || [];
      return {
        data: {
          out: products.filter((product) => Number(product.quantity) <= 0),
          low: products.filter((product) => Number(product.quantity) > 0 && Number(product.quantity) <= Number(product.min_stock ?? 5)),
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error };
    }
  },
  async getProducts(userId) {
    try {
      let { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error?.code === '42703') {
        ({ data, error } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }));
      }
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async addProduct(userId, product) {
    try {
      let { data, error } = await supabase
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
            min_stock: Math.max(0, Math.round(Number(product.min_stock ?? 5))),
            is_active: true,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error?.code === '42703') {
        ({ data, error } = await supabase
          .from('products')
          .insert([{
            user_id: userId,
            name: product.name,
            description: product.description,
            quantity: Math.round(Number(product.quantity)) || 0,
            purchase_price: Math.round(Number(product.purchase_price)) || 0,
            selling_price: Math.round(Number(product.selling_price)) || 0,
            category: product.category,
            sku: product.sku,
            created_at: new Date().toISOString(),
          }])
          .select());
      }
      if (error) throw error;
      const createdProduct = data?.[0];
      if (createdProduct && createdProduct.quantity > 0) {
        await recordStockMove({
          userId,
          productId: createdProduct.id,
          type: 'in',
          quantity: createdProduct.quantity,
          quantityBefore: 0,
          quantityAfter: createdProduct.quantity,
          reason: 'initial_stock',
          referenceId: createdProduct.id,
          referenceType: 'product',
        });
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async updateProduct(productId, updates) {
    try {
      let previousProduct = null;
      if (updates.quantity !== undefined) {
        const { data, error: previousError } = await supabase
          .from('products')
          .select('id, user_id, quantity')
          .eq('id', productId)
          .single();
        if (previousError) throw previousError;
        previousProduct = data;
      }

      // S'assurer que les prix sont des nombres entiers
      const sanitizedUpdates = {
        ...updates,
        quantity: updates.quantity !== undefined ? Math.round(Number(updates.quantity)) || 0 : undefined,
        purchase_price: updates.purchase_price !== undefined ? Math.round(Number(updates.purchase_price)) || 0 : undefined,
        selling_price: updates.selling_price !== undefined ? Math.round(Number(updates.selling_price)) || 0 : undefined,
        min_stock: updates.min_stock !== undefined ? Math.max(0, Math.round(Number(updates.min_stock))) : undefined,
      };

      let { data, error } = await supabase
        .from('products')
        .update(sanitizedUpdates)
        .eq('id', productId)
        .select();

      if (error?.code === '42703') {
        const legacyUpdates = { ...sanitizedUpdates };
        delete legacyUpdates.min_stock;
        ({ data, error } = await supabase
          .from('products')
          .update(legacyUpdates)
          .eq('id', productId)
          .select());
      }
        if (error) throw error;
        if (!data?.length) throw new Error('Produit introuvable ou modification refusée.');
      if (previousProduct && updates.quantity !== undefined) {
        const quantityAfter = sanitizedUpdates.quantity;
        const difference = quantityAfter - Number(previousProduct.quantity || 0);
        if (difference !== 0) {
          await recordStockMove({
            userId: previousProduct.user_id,
            productId,
            type: 'adjust',
            quantity: difference,
            quantityBefore: Number(previousProduct.quantity || 0),
            quantityAfter,
            reason: 'manual_adjustment',
            referenceId: productId,
            referenceType: 'product',
          });
        }
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async deleteProduct(productId) {
    try {
      let { data, error } = await supabase
        .from('products')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', productId)
        .select('id');

      if (error?.code === '42703') {
        ({ data, error } = await supabase
          .from('products')
          .delete()
          .eq('id', productId)
          .select('id'));
      }
      if (error) throw error;
      if (!data?.length) throw new Error('Produit introuvable ou suppression refusée.');
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  async getStockMoves(userId) {
    try {
      const { data, error } = await supabase
        .from('stock_moves')
        .select('*, products(name, sku)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async restoreProduct(productId) {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', productId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  async hardDeleteProduct(productId) {
    try {
      const { data, error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .select('id');

      if (error) throw error;
      if (!data?.length) throw new Error('Produit introuvable ou suppression refusée.');
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  async getStockValue(userId) {
    try {
      let { data, error } = await supabase
        .from('products')
        .select('quantity, purchase_price')
        .eq('user_id', userId);

      if (error?.code === '42703') {
        ({ data, error } = await supabase
          .from('products')
          .select('quantity, purchase_price')
          .eq('user_id', userId));
      }
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
