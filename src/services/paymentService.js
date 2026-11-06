import { supabase } from './supabaseClient';
import logger from '../utils/logger';

function reportError(operation, error) {
  logger.error(`Erreur ${operation}:`, error);
  return { data: null, error };
}

export const paymentService = {
  async getClientDebts(userId, clientId) {
    try {
      const [salesResult, clientResult] = await Promise.all([
        supabase
          .from('sales')
          .select('id, reference, sale_date, total_amount, paid_amount, balance_due, payment_status')
          .eq('user_id', userId)
          .eq('client_id', clientId)
          .eq('status', 'completed')
          .gt('balance_due', 0)
          .order('sale_date', { ascending: true })
          .order('id', { ascending: true }),
        supabase.from('clients').select('opening_balance').eq('user_id', userId).eq('id', clientId).single(),
      ]);
      if (salesResult.error) throw salesResult.error;
      if (clientResult.error) throw clientResult.error;

      const openingBalance = Number(clientResult.data?.opening_balance || 0);
      const openingDebt = openingBalance > 0 ? [{
        id: `opening-${clientId}`,
        reference: 'Solde antérieur',
        sale_date: null,
        total_amount: openingBalance,
        paid_amount: 0,
        balance_due: openingBalance,
        payment_status: 'unpaid',
      }] : [];
      return { data: [...openingDebt, ...(salesResult.data || [])], error: null };
    } catch (error) {
      return reportError('chargement des créances client', error);
    }
  },

  async getClientPayments(userId, clientId) {
    try {
      const { data: payments, error } = await supabase
        .from('payments')
        .select('id, sale_id, sales(reference), amount, method, reference, payment_date, notes, created_at')
        .eq('user_id', userId)
        .eq('client_id', clientId)
        .order('payment_date', { ascending: false })
        .order('id', { ascending: false });
      if (error) throw error;

      const paymentIds = (payments || []).map((payment) => payment.id);
      if (!paymentIds.length) return { data: [], error: null };

      const { data: allocations, error: allocationsError } = await supabase
        .from('payment_allocations')
        .select('payment_id, sale_id, amount, sales(reference)')
        .in('payment_id', paymentIds);
      if (allocationsError) throw allocationsError;

      const allocationsByPayment = new Map();
      (allocations || []).forEach((allocation) => {
        const current = allocationsByPayment.get(allocation.payment_id) || [];
        current.push(allocation);
        allocationsByPayment.set(allocation.payment_id, current);
      });

      return {
        data: (payments || []).map((payment) => ({
          ...payment,
          allocations: allocationsByPayment.get(payment.id) || [],
        })),
        error: null,
      };
    } catch (error) {
      return reportError('chargement des paiements client', error);
    }
  },

  async registerPayment(userId, clientId, paymentData) {
    try {
      const { data, error } = await supabase.rpc('register_payment', {
        p_user_id: userId,
        p_client_id: clientId,
        p_amount: Number(paymentData.amount),
        p_method: paymentData.method,
        p_reference: paymentData.reference || null,
        p_payment_date: paymentData.paymentDate,
        p_notes: paymentData.notes || null,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return reportError('encaissement du paiement client', error);
    }
  },

  async getTotalReceivables(userId) {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('balance')
        .eq('user_id', userId);
      if (error) throw error;
      const total = (data || []).reduce((sum, client) => sum + Number(client.balance || 0), 0);
      return { data: total, error: null };
    } catch (error) {
      return reportError('calcul du total des créances', error);
    }
  },

  async recalculateClientBalance(userId, clientId) {
    try {
      const { data, error } = await supabase.rpc('recalculate_client_balance', {
        p_user_id: userId,
        p_client_id: clientId,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return reportError('recalcul du solde client', error);
    }
  },
};