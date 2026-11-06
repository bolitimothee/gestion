import { supabase } from './supabaseClient';
import { enqueueOperation, updateOperation } from '../utils/offlineQueue';

const toLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function createSaleRequestId() {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  if (typeof cryptoApi?.getRandomValues !== 'function') {
    throw new Error('Ce navigateur ne permet pas de sécuriser la synchronisation des ventes.');
  }

  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const salesService = {
  async getLast7DaysRevenue(userId) {
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 6);
      const { data, error } = await supabase
        .from('sales')
        .select('sale_date, total_amount')
        .eq('user_id', userId)
        .gte('sale_date', toLocalDateKey(start));
      if (error) throw error;
      const totals = new Map((data || []).map((sale) => [String(sale.sale_date).slice(0, 10), 0]));
      (data || []).forEach((sale) => {
        const date = String(sale.sale_date).slice(0, 10);
        totals.set(date, (totals.get(date) || 0) + Number(sale.total_amount || 0));
      });
      return { data: Array.from({ length: 7 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); const key = toLocalDateKey(date); return { date: key, label: date.toLocaleDateString('fr-FR', { weekday: 'short' }), amount: totals.get(key) || 0 }; }), error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getTopProducts(userId) {
    try {
      const monthStart = new Date();
      monthStart.setHours(0, 0, 0, 0);
      monthStart.setDate(1);
      const { data, error } = await supabase
        .from('sale_items')
        .select('product_id, product_name, quantity, sales!inner(user_id, sale_date)')
        .eq('sales.user_id', userId)
        .gte('sales.sale_date', toLocalDateKey(monthStart));
      if (error) throw error;
      const totals = new Map();
      (data || []).forEach((item) => {
        const key = String(item.product_id || item.product_name);
        const current = totals.get(key) || { name: item.product_name || 'Produit supprimé', quantity: 0 };
        current.quantity += Number(item.quantity || 0);
        totals.set(key, current);
      });
      return { data: Array.from(totals.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5), error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  async getSales(userId) {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*, sale_items(id, product_id, product_name, quantity, unit_price, unit_cost, subtotal)')
        .eq('user_id', userId)
        .order('sale_date', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async createSale(userId, sale) {
    try {
      const totalAmount = Number(sale.total_amount || (sale.quantity * sale.unit_price));
      const paidAmount = Math.max(0, Number(sale.paid_amount ?? totalAmount));
      const balanceDue = Math.max(0, totalAmount - paidAmount);
      const requestId = sale.request_id || createSaleRequestId();
      const items = sale.items || [{
        product_id: sale.product_id,
        product_name: sale.product_name,
        quantity: Number(sale.quantity),
        unit_price: Number(sale.unit_price),
        unit_cost: Number(sale.unit_cost || 0),
        discount: Number(sale.discount || 0),
        subtotal: totalAmount,
      }];

      if (!items.length) {
        throw new Error('La vente doit contenir au moins un article.');
      }

      const itemsWithRequestId = items.map((item, index) => (
        index === 0 ? { ...item, request_id: requestId } : item
      ));
      const saleWithRequestId = { ...sale, request_id: requestId };

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await enqueueOperation({ type: 'create_sale', userId, payload: saleWithRequestId });
        return { data: { queued: true }, error: null, queued: true };
      }

      const { data, error } = await supabase.rpc('create_sale', {
        p_user_id: userId,
        p_items: itemsWithRequestId,
        p_client_id: sale.client_id || null,
        p_client_name: sale.customer_name || sale.client_name || 'Client de passage',
        p_client_phone: sale.client_phone || null,
        p_payment_method: sale.payment_method || 'cash',
        p_total_amount: totalAmount,
        p_paid_amount: paidAmount,
        p_balance_due: balanceDue,
        p_total_discount: Number(sale.total_discount || sale.discount || 0),
        p_notes: sale.notes || null,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      if (error?.code === '42883' || error?.message?.includes('create_sale')) {
        return { data: null, error: new Error('La migration Supabase additive doit être exécutée avant de créer une vente.') };
      }
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
        .select('*, sale_items(id, product_id, product_name, quantity, unit_price, unit_cost, subtotal)')
        .eq('user_id', userId)
        .order('sale_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async updateSale(userId, saleId, updates) {
    try {
      const { data, error } = await supabase.rpc('update_sale', {
        p_user_id: userId,
        p_sale_id: saleId,
        p_product_id: updates.product_id,
        p_quantity: Number(updates.quantity),
        p_client_id: updates.client_id || null,
        p_client_name: updates.customer_name,
        p_sale_date: updates.sale_date,
        p_sale_time: updates.sale_time || null,
        p_payment_method: updates.payment_method || 'cash',
        p_paid_amount: Number(updates.paid_amount || 0),
        p_notes: updates.notes || null,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async deleteSale(saleId) {
    try {
      const { error } = await supabase.rpc('delete_sale', { p_sale_id: saleId });
      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error };
    }
  },
};

export async function syncPendingSale(operation) {
  const payload = { ...(operation.payload || {}) };
  if (!payload.request_id) {
    payload.request_id = createSaleRequestId();
    if (operation.id !== undefined) {
      await updateOperation(operation.id, { payload });
    }
  }

  const result = await salesService.createSale(operation.userId, payload);
  if (result.error || result.queued) {
    throw result.error || new Error('Vente toujours en attente de connexion');
  }
  return result;
}
