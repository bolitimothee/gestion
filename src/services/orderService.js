import { supabase } from './supabaseClient';

export const orderService = {
  async createOrder(userId, order, items) {
    try {
      const { data, error } = await supabase.rpc('create_order', {
        p_user_id: userId,
        p_reference: order.reference || `CMD-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
        p_client_id: order.client_id || null,
        p_client_name: order.client_name,
        p_client_phone: order.client_phone || null,
        p_order_date: order.order_date,
        p_notes: order.notes || null,
        p_items: items.map((item) => ({ product_id: item.product_id, quantity: Number(item.quantity) })),
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getOrderItems(orderId) {
    try {
      const { data, error } = await supabase.from('order_items').select('*').eq('order_id', orderId).order('id');
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async deliverOrder(userId, orderId, payment) {
    try {
      const { data, error } = await supabase.rpc('deliver_order', {
        p_user_id: userId,
        p_order_id: orderId,
        p_payment_method: payment.payment_method,
        p_paid_amount: Number(payment.paid_amount),
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  async getPendingCount(userId) {
    try {
      const { count, error } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'pending');
      if (error) throw error;
      return { data: count || 0, error: null };
    } catch (error) {
      return { data: 0, error };
    }
  },
  async getOrders(userId) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('order_date', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async updateStatus(orderId, status) {
    try {
      if (status === 'delivered') {
        throw new Error('Une commande doit être livrée avec l’opération de livraison.');
      }

      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .eq('status', 'pending')
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};
