# Architecture Technique - Synchronisation Temps Réel

## 📐 Vue d'Ensemble du Système

```
┌─────────────────────────────────────────────────────────────┐
│          Application React Multi-Onglets                    │
├─────────────────────────────────────────────────────────────┤
│  Tab 1         │  Tab 2         │  Tab 3        │  Tab N     │
│  ┌──────────┐  │  ┌──────────┐  │  ┌──────────┐ │  ┌──────────┐
│  │Dashboard │  │  │  Stock   │  │  │  Sales   │ │  │Finances  │
│  └────┬─────┘  │  └────┬─────┘  │  └────┬─────┘ │  └────┬─────┘
│       │        │       │        │       │       │       │
└───────┼────────┴───────┼────────┴───────┼───────┴───────┼──────
        │                │                │               │
        └────────────────┬────────────────┴───────────────┘
                         │
                    useRealtimeSync()
                         │
        ┌────────────────┴────────────────┐
        │   Supabase Real-Time Channel    │
        │  postgres_changes://{user_id}   │
        └────────────────┬────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │  PostgreSQL Database            │
        │  - products                     │
        │  - sales                        │
        │  - expenses                     │
        │  - accounts                     │
        └─────────────────────────────────┘
```

---

## 🔄 Flux de Synchronisation

### Quand un Producteur Crée un Produit:

```
1. Tab 1: User clicks "Ajouter un produit"
   └─> API Call: stockService.addProduct()
   └─> Supabase: INSERT into products TABLE

2. Supabase Détecte: INSERT event
   └─> SELECT user_id FROM products WHERE id = new_id
   └─> POST to Real-Time channel: "5cb23e..."

3. All Tabs Receive Event (real-time_sync hook):
   └─> useProductsSync() [in each component]
   └─> Detects event.eventType === 'INSERT'
   └─> setProducts(prev => [payload.new, ...prev])
   └─> React re-renders with new product

4. Result: Produit visible dans TOUS les onglets
           SANS rechargement
           EN < 2 secondes
```

---

## 📁 Structure des Fichiers Clés

### 1. `src/hooks/useRealtimeSync.js` (110 lignes)

**Fonction Base:**
```javascript
export function useRealtimeSync(table, userId, onDataChange) {
  useEffect(() => {
    if (!userId) return;
    
    const subscription = supabaseClient
      .channel(`${table}:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: table,
        filter: `user_id=eq.${userId}`
      }, onDataChange)
      .subscribe();
    
    return () => subscription.unsubscribe();
  }, [userId, table]);
}
```

**Pattern d'Utilisation:**
```javascript
useRealtimeSync('products', userId, (payload) => {
  // payload.eventType = INSERT, UPDATE, DELETE
  // payload.new = nouvelle donnée
  // payload.old = ancienne donnée
});
```

### 2. `src/pages/Stock.jsx` (Intégration)

**Avant (Local State):**
```javascript
const [products, setProducts] = useState([]);
// ❌ État isolé par onglet

useEffect(() => {
  if (user) loadProducts();
}, [user, loadProducts]);
```

**Après (Real-Time Sync):**
```javascript
const [products, setProducts] = useState([]);

useEffect(() => {
  if (user) loadProducts();
}, [user, loadProducts]);

// ✅ Souscription temps réel
useProductsSync(user?.id, setProducts);

// Quand un produit est ajouté n'importe où:
// [
//   NEW_PRODUCT,  ← Insert au début
//   ...products   ← Produits existants
// ]
```

### 3. `src/pages/Sales.jsx` (Intégration)

```javascript
import { useSalesSync } from '../hooks/useRealtimeSync';

export default function Sales() {
  const [sales, setSales] = useState([]);
  
  const loadData = useCallback(async () => {
    // Load initial data
    const [salesRes, productsRes] = await Promise.all([
      salesService.getSales(user.id),
      stockService.getProducts(user.id),
    ]);
    if (salesRes.data) setSales(salesRes.data);
    if (productsRes.data) setProducts(productsRes.data);
  }, [user]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  // ✅ Sync ventes
  useSalesSync(user?.id, setSales);
  
  // Quand une vente est ajoutée: mise à jour auto
  // Quand une vente est modifiée: remplacement auto
  // Quand une vente est supprimée: suppression auto
}
```

### 4. `src/pages/Finances.jsx` (Intégration)

```javascript
import { useExpensesSync } from '../hooks/useRealtimeSync';

// ✅ Sync dépenses
useExpensesSync(user?.id, setExpenses);

// Mise à jour automatique du résumé financier
```

### 5. `src/pages/Dashboard.jsx` (Intégration)

```javascript
import { useAccountSync } from '../hooks/useRealtimeSync';

// ✅ Sync compte (écoute changements de devise)
useAccountSync(user?.id, (account) => {
  if (account?.preferred_currency) {
    setCurrency(account.preferred_currency);
  }
});

// Quand devise change dans un onglet → tous les onglets mettent à jour
```

---

## 🔐 Sécurité & RLS (Row-Level Security)

### Configuration Supabase RLS:

```sql
-- Table PRODUCTS
CREATE POLICY "Users can view own products"
  ON products
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products"
  ON products
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Applique à: SELECT, INSERT, UPDATE, DELETE
-- Filtre par: auth.uid() = user_id
-- Résultat: Chaque utilisateur ne voit QUE ses données
```

### Flux Sécurisé:

```
Tab 1 (User A):
  └─> INSERT product WHERE user_id = 'user_a_id'
  └─> Supabase RLS: Accepts ✅
  └─> Real-Time: Broadcasts only to user_a subscribers
  
Tab 2 (User B):
  └─> No events received
  └─> User B's products unchanged
  └─> ✅ No data leakage
```

---

## 🔌 Intégration Détaillée par Page

### Stock.jsx - Gestion des Produits

**Événements Écoutés:**
- INSERT: Ajouter un produit
- UPDATE: Modifier quantité/prix
- DELETE: Supprimer un produit

**Implémentation Hook:**
```javascript
useProductsSync(userId, (payload) => {
  if (payload.eventType === 'INSERT') {
    setProducts(prev => [payload.new, ...prev]);
    // Nouveau produit au début de la liste
  } else if (payload.eventType === 'UPDATE') {
    setProducts(prev => prev.map(p =>
      p.id === payload.new.id ? payload.new : p
    ));
    // Produit modifié remplacé en place
  } else if (payload.eventType === 'DELETE') {
    setProducts(prev =>
      prev.filter(p => p.id !== payload.old.id)
    );
    // Produit supprimé retiré
  }
});
```

### Sales.jsx - Enregistrement Ventes

**Événements Écoutés:**
- INSERT: Nouvelle vente enregistrée
- UPDATE: Modification vente (client, date, etc.)
- DELETE: Suppression vente

**Bonus: Conversion Multi-Devise**
```javascript
// Quand devise change (depuis Dashboard)
const convertedSales = convertSalesData(sales, newCurrency);
// Tous les montants convertis automatiquement
```

### Finances.jsx - Gestion Dépenses

**Événements Écoutés:**
- INSERT: Nouvelle dépense
- UPDATE: Modification montant/catégorie
- DELETE: Suppression dépense

**Stats Mise à Jour:**
```javascript
// Résumé financier recalculé automatiquement
// - Total dépenses
// - Profit net
// - Évolution
```

### Dashboard.jsx - Tableau de Bord

**Double Synchronisation:**
1. Account Sync (devise)
2. Stats Sync (produits + ventes + dépenses)

```javascript
// 1. Écouter changement de compte
useAccountSync(userId, (account) => {
  setCurrency(account.preferred_currency);
  // Tous les onglets mettent à jour la devise
});

// 2. Recalculer stats auto
// Quand produit ajouté:
//   └─> Stock value augmente
//   └─> Stats se recalculent
// Quand vente enregistrée:
//   └─> Revenue augmente
//   └─> Profit net recalculé
```

---

## 🔄 Cycle de Vie Complet

### Initialisation (Page Load):

```
1. Component Mount
   └─> useEffect(() => { loadData() }, [user])
   └─> loadProducts() API call
   └─> → setProducts([...])

2. Souscription Real-Time
   └─> useProductsSync(user.id, setProducts)
   └─> Active la souscription Supabase
   └─> Prête pour recevoir événements
   └─> Component Ready ✅
```

### Pendant Session:

```
Tab 1: User adds Product
  └─> API: stockService.addProduct()
  └─> DB: INSERT into products
  └─> Event: postgres_changes {'eventType': 'INSERT'}
  
Supabase Real-Time Routes Event:
  └─> SELECT user_id FROM products WHERE id = X
  └─> Broadcast to channel: "products:{user_id}"
  
Tab 1, 2, 3: useProductsSync Catches Event
  └─> onDataChange(payload) triggered
  └─> Handle INSERT: prepend new product
  └─> setProducts(prev => [new, ...prev])
  
React Re-render:
  └─> All tabs show new product
  └─> No manual refresh needed ✅
```

### Fermeture Component:

```
useEffect Cleanup:
  └─> subscription.unsubscribe()
  └─> Real-Time channel cleaned up
  └─> Memory freed
  └─> No memory leaks ✅
```

---

## 📊 Flux de Données Complet

### Scénario: Utilisateur Ajoute 3 Produits Simultanément

**T=0s: Tab 1 Ajoute Produit A**
```
Tab 1 State: [A]
Tab 2 State: []
Tab 3 State: []
```

**T=0.5s: Supabase INSERT Event**
```
Real-Time: "INSERT product A"
```

**T=1s: Tous Reçoivent Event**
```
Tab 1 State: [A] (pas de changement)
Tab 2 State: [A] ← hook mise à jour
Tab 3 State: [A] ← hook mise à jour
```

**T=1.5s: Tab 2 Ajoute Produit B**
```
Récent State avant insert:
  Tab 1: [A]
  Tab 2: [A]
  Tab 3: [A]

Après insert B:
  Tab 1: [B, A] ← reçoit événement
  Tab 2: [B, A] ← crée = affiche immédiatement
  Tab 3: [B, A] ← reçoit événement
```

**T=2s: Tab 3 Ajoute Produit C**
```
État final:
  Tab 1: [C, B, A] ✅ All visible
  Tab 2: [C, B, A] ✅ All visible
  Tab 3: [C, B, A] ✅ All visible

Time to Sync: ~1.5 secondes max
```

---

## 🛠️ Débogage

### Ajouter Logging:

```javascript
// Dans useRealtimeSync.js
export function useProductsSync(userId, setProducts) {
  return useRealtimeSync('products', userId, (payload) => {
    console.log('🔄 Produit Event:', {
      type: payload.eventType,
      id: payload.new?.id || payload.old?.id,
      timestamp: new Date().toISOString()
    });
    
    if (payload.eventType === 'INSERT') {
      setProducts(prev => [payload.new, ...prev]);
    } else if (payload.eventType === 'UPDATE') {
      setProducts(prev => prev.map(p =>
        p.id === payload.new.id ? payload.new : p
      ));
    } else if (payload.eventType === 'DELETE') {
      setProducts(prev =>
        prev.filter(p => p.id !== payload.old.id)
      );
    }
  });
}
```

### Vérifier Souscriptions:

```javascript
// F12 Console
setInterval(() => {
  console.log('Connected:', supabaseClient.realtime.isConnected());
}, 5000);
```

---

## ✅ Résumé Architecture

| Aspect | Implémentation |
|--------|---|
| **Source** | Supabase PostgreSQL |
| **Real-Time** | postgres_changes channel |
| **Filtrage** | user_id row-level security |
| **React Binding** | useRealtimeSync hook |
| **Pages** | Stock, Sales, Finances, Dashboard |
| **Événements** | INSERT, UPDATE, DELETE |
| **Latence** | ~1-2 secondes |
| **Sécurité** | RLS par utilisateur |
| **Cleanup** | Automatic unsubscribe |
| **État** | Shared across tabs |

---

## 🚀 Optimisations Futures

1. **Debouncing**: Grouper événements rapides
2. **Caching**: localStorage pour offline
3. **Persistence**: Service Worker pour sync offline
4. **Optimistic Updates**: Mettre à jour avant confirmation
5. **Batching**: Combiner plusieurs INSERT
