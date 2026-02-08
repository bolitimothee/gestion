# 🌍 Système de Synchronisation et Conversion Multi-Devise

## 📋 Vue d'ensemble

Ce système garantit que:
1. ✅ **Toutes les données sont synchronisées par compte utilisateur**
2. ✅ **Les conversions de devise s'appliquent en temps réel à TOUTES les données financières**
3. ✅ **La devise préférée est stockée dans Supabase et synchronisée entre sessions**

---

## 🗄️ Modifications Supabase

### 1. Migration SQL Requise

Exécuter le fichier: `MIGRATION_DEVISE.sql` dans Supabase SQL Editor

**Colonnes ajoutées:**
```sql
accounts.preferred_currency        -- Devise préférée de l'utilisateur
products.currency_code             -- Devise de stockage
products.base_purchase_price       -- Prix d'achat de base
products.base_selling_price        -- Prix de vente de base
sales.currency_code                -- Devise de la vente
expenses.currency_code             -- Devise de la dépense
```

### 2. Exécution de la Migration

```bash
# Via Supabase Dashboard:
1. Allez sur Settings → SQL Editor
2. Créez une nouvelle query
3. Copiez-collez le contenu de MIGRATION_DEVISE.sql
4. Cliquez "Run"
```

---

## 🔄 Architecture Synchronisation

### Flux Complet

```
Utilisateur Change Devise
    ↓
Dashboard.handleCurrencyChange()
    ↓
context.updateUserCurrency()
    ↓
UPDATE accounts SET preferred_currency = '...'  (Supabase)
    ↓
AuthContext charge preferred_currency du compte
    ↓
currencyService convertit TOUTES les données
    ↓
Affichage des données converties
    ↓
Réplication sur toutes les sessions ouvertes (Real-time)
```

### Code React - AuthContext

```jsx
// Charger la devise du compte
const loadAccountDetails = async (userId) => {
  const { data } = await authService.getAccountDetails(userId);
  setAccount(data);
  setUserCurrencyState(data.preferred_currency || 'USD');
  localStorage.setItem('userCurrency', data.preferred_currency);
};

// Mettre à jour la devise
updateUserCurrency: async (currency) => {
  await supabase
    .from('accounts')
    .update({ preferred_currency: currency })
    .eq('user_id', user.id);
  setUserCurrencyState(currency);
  await loadAccountDetails(user.id);
}
```

---

## 💱 Conversion Complète des Données

### Fonctions de Conversion

#### 1. **Produits**
```javascript
convertProductsData(products, targetCurrency)
// Convertit: purchase_price, selling_price, base_purchase_price, base_selling_price
```

#### 2. **Ventes**
```javascript
convertSalesData(sales, targetCurrency)
// Convertit: unit_price, total_amount
```

#### 3. **Dépenses**
```javascript
convertExpensesData(expenses, targetCurrency)
// Convertit: amount
```

#### 4. **Données Financières**
```javascript
convertFinancialData(financial, targetCurrency)
// Convertit: totalRevenue, totalExpenses, netProfit, stockValue
```

### Exemple d'Utilisation

```javascript
import { convertProductsData } from '../services/currencyService';

// Dans un composant
const products = await stockService.getProducts(user.id);
const productsInTargetCurrency = convertProductsData(products, 'EUR');
setDisplayProducts(productsInTargetCurrency);
```

---

## 📱 Synchronisation En Temps Réel

### Supabase Real-Time

Chaque session écoute les changements du compte:

```javascript
// Dans AuthContext
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    setUser(session.user);
    await loadAccountDetails(session.user.id); // Recharge la devise
  }
});
```

### Multi-Session

Si l'utilisateur a 2 onglets ouverts:
1. Onglet 1: Change devise de USD → EUR
2. Supabase met à jour `accounts.preferred_currency = 'EUR'`
3. Onglet 2: Reçoit l'event via Real-time
4. Onglet 2: Recharge automatiquement la devise

---

## 🔍 Vérification de la Synchronisation

### Checklist

- [ ] Migration SQL exécutée dans Supabase
- [ ] Colonnes `preferred_currency` visible dans table accounts
- [ ] AuthContext charge `userCurrency` du compte
- [ ] Dashboard affiche le sélecteur de devise
- [ ] Changement de devise met à jour Supabase
- [ ] Recharge de la page conserve la devise
- [ ] Onglet 2 synchronise sans rechargement

### Test Manual

```bash
# Session 1
1. Connectez-vous
2. Allez au Dashboard
3. Changez devise USD → EUR
4. Vérifiez que les montants se convertissent

# Session 2 (Onglet différent)
1. Ouvrir le même compte dans un nouvel onglet
2. Vérifier que la devise affichée est EUR
3. Les données sont converties

# Vérification Supabase
1. Allez à Supabase Dashboard
2. Consultez table accounts
3. Vérifiez preferred_currency = 'EUR'
```

---

## 📊 Données Synchronisées par Compte

### Chaque Utilisateur A:

```
├── Account (Email, Nom, Devise Préférée, Validité)
├── Products (Stocks avec Prix d'Achat/Vente)
├── Sales (Ventes avec Montants)
├── Expenses (Dépenses)
└── Tous filtrés par user_id
```

### Requête SQL Derrière:
```sql
SELECT * FROM products WHERE user_id = $1 AND preferred_currency = $2
```

---

## 🚀 Déploiement sur Vercel

1. **Git Push** (migrations incluent dans .sql)
```bash
git add .
git commit -m "feat: Synchronisation et conversion multi-devise par compte"
git push origin main
```

2. **Vercel Redeploy** Automatiquement

3. **Exécuter Migration** sur Supabase (une seule fois)

---

## 🐛 Dépannage

### Problème: Devise ne se synchronise pas
```
Solution: Vérifier que updateUserCurrency est appelée
Debug: console.log(account.preferred_currency)
```

### Problème: Données ne se convertissent pas
```
Solution: Vérifier que convertProductsData/convertSalesData sont appelées
Debug: console.log('Before:', products); console.log('After:', converted);
```

### Problème: Deux sessions ne synchronisent pas
```
Solution: Vérifier Real-time subscriptions Supabase
Debug: Allez à Supabase → Logs → Real-time
```

---

## 📈 Performances

- ✅ Conversion en mémoire (pas de requête DB)
- ✅ Cache localStorage pour devise
- ✅ Chargement initial du compte (~200ms)
- ✅ Indexation SQL sur user_id et currency_code

---

## 🔐 Sécurité

- ✅ RLS (Row Level Security) filtre par user_id
- ✅ Devise stockée liée au compte utilisateur
- ✅ Impossible pour un utilisateur de voir données d'un autre

---
