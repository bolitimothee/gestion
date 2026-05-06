import { useState, useEffect, useCallback, useRef } from 'react';

// Hook pour optimiser le chargement des données avec cache et debouncing
export function useOptimizedData(fetchFunction) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = useRef(new Map());
  const debounceRef = useRef(null);

  const fetchData = useCallback(async (...args) => {
    // Créer une clé de cache basée sur les arguments
    const cacheKey = JSON.stringify(args);
    
    // Vérifier si les données sont en cache
    if (cacheRef.current.has(cacheKey)) {
      const cachedData = cacheRef.current.get(cacheKey);
      // Cache valide pendant 30 secondes
      if (Date.now() - cachedData.timestamp < 30000) {
        setData(cachedData.data);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction(...args);
      
      // Mettre en cache les résultats
      cacheRef.current.set(cacheKey, {
        data: result.data || result,
        timestamp: Date.now()
      });
      
      setData(result.data || result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction]);

  // Version debounced pour les recherches
  const debouncedFetch = useCallback((...args) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchData(...args);
    }, 300); // 300ms de debounce
  }, [fetchData]);

  // Nettoyer le cache toutes les 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of cacheRef.current.entries()) {
        if (now - value.timestamp > 300000) { // 5 minutes
          cacheRef.current.delete(key);
        }
      }
    }, 60000); // Vérifier chaque minute

    return () => clearInterval(interval);
  }, []);

  return {
    data,
    loading,
    error,
    fetchData,
    debouncedFetch
  };
}

// Hook pour le lazy loading des composants
export function useLazyLoad(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { isVisible, elementRef };
}

// Hook pour optimiser les mises à jour fréquentes
export function useThrottledState(initialValue, delay = 100) {
  const [state, setState] = useState(initialValue);
  const timeoutRef = useRef(null);

  const setThrottledState = useCallback((value) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setState(value);
    }, delay);
  }, [delay]);

  return [state, setThrottledState];
}
