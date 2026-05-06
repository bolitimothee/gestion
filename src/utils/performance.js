// Utilitaires d'optimisation des performances

// Memoization pour les calculs coûteux
export function memoize(fn) {
  const cache = new Map();
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

// Debounce pour les événements fréquents
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle pour limiter la fréquence d'exécution
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Optimisation du formatage monétaire
export const formatCurrencyOptimized = memoize((amount) => {
  if (amount === null || amount === undefined) return '0 FCFA';
  
  const num = Math.round(Number(amount) * 100) / 100;
  
  if (Number.isInteger(num)) {
    return `${Math.floor(num).toLocaleString('fr-FR')} FCFA`;
  }
  
  const rounded = Math.round(num * 100) / 100;
  return `${rounded.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} FCFA`;
});

// Optimisation du formatage de date
export const formatDateOptimized = memoize((dateString) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Date invalide';
  
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
});

// Lazy loading pour les images
export function lazyLoadImage(imgElement, src) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = src;
        img.classList.add('loaded');
        observer.unobserve(img);
      }
    });
  });
  
  observer.observe(imgElement);
}

// Optimisation des requêtes API avec cache
class APICache {
  constructor(ttl = 30000) { // 30 secondes par défaut
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  clear() {
    this.cache.clear();
  }
  
  // Nettoyer automatiquement les entrées expirées
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const apiCache = new APICache();

// Optimisation des animations
export function requestAnimationFrame(callback) {
  return window.requestAnimationFrame(callback);
}

// Optimisation du scrolling
export function smoothScrollTo(element, target, duration = 300) {
  const start = element.scrollTop || window.pageYOffset;
  const change = target - start;
  const startTime = performance.now();
  
  function animateScroll(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const currentScroll = start + change * easeInOutCubic(progress);
    
    if (element.scrollTop !== undefined) {
      element.scrollTop = currentScroll;
    } else {
      window.scrollTo(0, currentScroll);
    }
    
    if (progress < 1) {
      requestAnimationFrame(animateScroll);
    }
  }
  
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  requestAnimationFrame(animateScroll);
}

// Optimisation du rendu des listes
export function virtualizeList(items, itemHeight, containerHeight, scrollTop = 0) {
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 1;
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount, items.length);
  
  return {
    visibleItems: items.slice(startIndex, endIndex),
    startIndex,
    endIndex,
    totalHeight: items.length * itemHeight
  };
}
