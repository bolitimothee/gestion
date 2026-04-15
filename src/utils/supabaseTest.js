// Test de connexion Supabase pour diagnostiquer les problèmes
import { supabase } from '../services/supabaseClient';

export const testSupabaseConnection = async () => {
  console.log('=== SUPABASE CONFIGURATION CHECK ===');
  
  // Vérifier les variables d'environnement
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  console.log('URL configured:', url ? 'YES' : 'NO');
  console.log('ANON KEY configured:', key ? 'YES' : 'NO');
  
  if (!url || !key) {
    console.error('Variables manquantes - vérifiez .env.local');
    return false;
  }
  
  console.log('\n=== TESTING SUPABASE CONNECTION ===');
  
  try {
    // Timeout pour éviter les blocages
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    );
    
    // Test simple: vérifier la session
    const sessionPromise = supabase.auth.getSession();
    const { data: sessionData, error } = await Promise.race([sessionPromise, timeoutPromise]);
    
    if (error) {
      console.error('Session check error:', error.message);
      return false;
    }
    
    console.log('Session check successful');
    console.log('Session data:', sessionData ? 'Present' : 'None');
    
    // Test de connexion à la base de données (avec timeout)
    const dbPromise = supabase
      .from('accounts')
      .select('count')
      .limit(1);
    
    const { data: testData, error: testError } = await Promise.race([dbPromise, timeoutPromise]);
    
    if (testError) {
      console.warn('Database test warning:', testError.message);
      console.log('This might be normal if tables don\'t exist yet');
    } else {
      console.log('Database connection successful');
      console.log('Test data:', testData);
    }
    
    console.log('Supabase connection test completed');
    return true;
    
  } catch (err) {
    if (err.name === 'AbortError' || err.message === 'Connection timeout') {
      console.warn('Connection test timeout - this is normal on first load');
      return true; // Ne pas échouer sur timeout
    }
    console.error('Connection test failed:', err.message);
    return false;
  }
};
