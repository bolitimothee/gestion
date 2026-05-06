import { useState, useEffect, useCallback, useRef } from 'react';

export const useDataOptimization = (fetchFunction, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const cacheRef = useRef(new Map());
  const abortControllerRef = useRef(null);

  const fetchData = useCallback(async (...args) => {
    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Créer un nouvel AbortController
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    // Vérifier le cache (5 minutes)
    const cacheKey = JSON.stringify(args);
    const cached = cacheRef.current.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < 300000) {
      setData(cached.data);
      setLoading(false);
      setError(null);
      return cached.data;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction(...args, { signal });
      
      // Mettre en cache le résultat
      cacheRef.current.set(cacheKey, {
        data: result,
        timestamp: now
      });

      setData(result);
      setLastFetch(now);
      return result;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Requête annulée');
        return null;
      }
      console.error('Erreur de chargement:', err);
      setError(err.message || 'Erreur lors du chargement des données');
      throw err;
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [fetchFunction]);

  useEffect(() => {
    fetchData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  const invalidateCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    invalidateCache,
    lastFetch
  };
};
