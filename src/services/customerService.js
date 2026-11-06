import { supabase } from './supabaseClient';

export const customerService = {
  async getDebtors(userId) {
    try {
      let { data, error } = await supabase
        .from('clients')
        .select('id, name, balance')
        .eq('user_id', userId)
        .gt('balance', 0);
      if (error?.code === '42P01') {
        ({ data, error } = await supabase.from('customers').select('id, name, balance_fcfa').eq('user_id', userId).gt('balance_fcfa', 0));
      }
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },
  async getCustomers(userId) {
    try {
      let { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error?.code === '42P01') {
        ({ data, error } = await supabase.from('customers').select('*').eq('user_id', userId).order('created_at', { ascending: false }));
      }
      if (error) throw error;
      return { data: (data || []).map((client) => ({ ...client, balance_fcfa: client.balance_fcfa ?? client.balance ?? 0 })), error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async addCustomer(userId, customer) {
    try {
      let { data, error } = await supabase
        .from('clients')
        .insert([
          {
            user_id: userId,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            company_name: customer.company_name,
            balance: customer.balance || customer.balance_fcfa || 0,
            notes: customer.notes,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error?.code === '42P01' || error?.code === '42703') {
        ({ data, error } = await supabase.from('customers').insert([{
          user_id: userId, name: customer.name, email: customer.email, phone: customer.phone,
          address: customer.address, company_name: customer.company_name,
          balance_fcfa: customer.balance_fcfa || 0, notes: customer.notes, created_at: new Date().toISOString(),
        }]).select());
      }
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async updateCustomer(customerId, updates) {
    try {
      let { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', customerId)
        .select();

      if (error?.code === '42P01' || error?.code === '42703') {
        ({ data, error } = await supabase.from('customers').update(updates).eq('id', customerId).select());
      }
      if (error) throw error;
      if (!data?.length) throw new Error('Client introuvable ou modification refusée.');
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async deleteCustomer(customerId) {
    try {
      let { data, error } = await supabase
        .from('clients')
        .delete()
        .eq('id', customerId)
        .select('id');

      if (error?.code === '42P01') {
        ({ data, error } = await supabase.from('customers').delete().eq('id', customerId).select('id'));
      }
      if (error) throw error;
      if (!data?.length) throw new Error('Client introuvable ou suppression refusée.');
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  async getCustomerById(customerId) {
    try {
      let { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error?.code === '42P01') {
        ({ data, error } = await supabase.from('customers').select('*').eq('id', customerId).single());
      }
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};
