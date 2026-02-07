# ✅ CHECKLIST COMPLÈTE - DÉPLOIEMENT PRODUCTION

## 📋 Phase 1: Préparation (5 min)

- [ ] Compte Supabase créé sur [supabase.com](https://supabase.com)
- [ ] Projet Supabase configuré et actif
- [ ] Authentification Email/Mot de passe activée dans Supabase
- [ ] Clés d'API récupérées (Settings → API)
- [ ] `supabaseClient.js` mis à jour avec les bonnes clés

## 📋 Phase 2: Installation Base de Données (10 min)

### Fichier SQL à utiliser
- [ ] Ouvrir `SUPABASE_COMPLETE.sql` dans VS Code
- [ ] Copier **TOUT** le contenu (Ctrl+A, Ctrl+C)

### Exécution dans Supabase
1. [ ] Aller sur [app.supabase.com](https://app.supabase.com)
2. [ ] Sélectionner le projet
3. [ ] Aller dans **SQL Editor** (menu gauche)
4. [ ] Cliquer **New query**
5. [ ] Coller le SQL (Ctrl+V)
6. [ ] Cliquer **RUN** (bouton noir)
7. [ ] Attendre les messages verts ✓

### Vérification des tables
- [ ] Aller dans **Database** → **Tables**
- [ ] Voir les 4 tables: `accounts`, `products`, `sales`, `expenses`
- [ ] Cliquer chaque table, vérifier les colonnes:

**accounts**: id, user_id, account_name, email, validity_date, is_active, created_at, updated_at
**products**: id, user_id, name, category, purchase_price, selling_price, quantity, description, sku, created_at, updated_at
**sales**: id, user_id, product_id, quantity, unit_price, total_amount, customer_name, sale_date, notes, created_at, updated_at
**expenses**: id, user_id, description, amount, category, date, notes, created_at, updated_at

### Vérification des policies RLS
- [ ] Cliquer sur chaque table
- [ ] Vérifier onglet **Policies** contient 4 policies par table (select_own, insert_own, update_own, delete_own)
- [ ] Total: 16 policies (4 × 4 tables)

### Vérification des index
- [ ] Exécuter cette requête SQL:
```sql
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;
```
- [ ] Voir au minimum 9 index (idx_*_user_id, idx_*_date, idx_*_product_id, idx_*_created_at)

### Vérification des triggers
- [ ] Exécuter cette requête SQL:
```sql
SELECT tgname FROM pg_trigger WHERE tgname LIKE '%_updated_at%' OR tgname LIKE '%quantity%';
```
- [ ] Voir 5 triggers: update_accounts_updated_at, update_products_updated_at, update_sales_updated_at, update_expenses_updated_at, update_product_quantity_trigger

## 📋 Phase 3: Configuration Application (5 min)

### Vérifier les fichiers modifiés
- [ ] `src/services/currencyService.js` existe (nouveau fichier)
- [ ] `src/pages/Dashboard.jsx` important du currencyService
- [ ] `src/styles/globals.css` contient @media (max-width: 480px)
- [ ] `src/pages/Stock.css` contient styles mobiles
- [ ] `src/pages/Sales.css` contient styles mobiles
- [ ] `src/pages/Finances.css` contient styles mobiles

### Vérifier le code source
- [ ] Lancer: `npm run dev`
- [ ] Application démarre sur http://localhost:5173
- [ ] Page de login pas d'erreur dans console (F12)

## 📋 Phase 4: Teste Authentification (5 min)

### Créer un compte test
- [ ] Aller dans Supabase → **Authentication** → **Users**
- [ ] Cliquer **Add user** ou **Invite**
- [ ] Entrer email et mot de passe
- [ ] Cliquer **Send invite** ou **Create**

### Tester le login
- [ ] Ouvrir http://localhost:5173/login
- [ ] Voir le message: "Pour créer un nouveau compte, contactez votre administrateur"
- [ ] Entrer email et mot de passe du compte créé
- [ ] Cliquer **Se connecter**
- [ ] Attendre 2 secondes
- [ ] Être automatiquement redirigé vers `/dashboard`

### Vérifier la session
- [ ] Ouvrir F12 → Console
- [ ] Vérifier que pas d'erreur rouge
- [ ] Voir le dashboard avec les statistiques
- [ ] Cliquer **Déconnexion** → redirection vers /login

## 📋 Phase 5: Test Stock (5 min)

### Ajouter un produit
1. [ ] Aller dans **Stock**
2. [ ] Cliquer **+ Ajouter un produit**
3. [ ] Entrer:
   - Nom: "Test Produit"
   - Catégorie: "Test"
   - Prix d'achat: 100
   - Prix de revente: 150
   - Quantité: 5
   - SKU: "TEST001"
4. [ ] Cliquer **Ajouter**
5. [ ] Vérifier le produit s'affiche avec:
   - Nom "Test Produit"
   - Prix d'achat 100
   - Prix de revente 150
   - **Marge: 50 (33.3%)**
   - Quantité restante: 5

### Tester édition produit
- [ ] Cliquer **✏️ Modifier** sur le produit
- [ ] Changer quantité à 10
- [ ] Cliquer **Mettre à jour**
- [ ] Vérifier la quantité passe à 10

### Tester suppression produit
- [ ] Cliquer **🗑️ Supprimer** sur un autre produit test
- [ ] Confirmer la suppression
- [ ] Produit disparaît

## 📋 Phase 6: Test Ventes (5 min)

### Enregistrer une vente
1. [ ] Aller dans **Ventes**
2. [ ] Cliquer **+ Nouvelle vente**
3. [ ] Sélectionner le produit créé
4. [ ] Entrer:
   - Quantité: 2
   - Client: "Jean Dupont"
5. [ ] Cliquer **Enregistrer**
6. [ ] Voir la vente dans la table avec:
   - Client: "Jean Dupont"
   - Montant: 150 × 2 = 300
   - Date: (aujourd'hui)

### Vérifier le stock a décrémenté
- [ ] Aller dans **Stock**
- [ ] Vérifier que le produit a quantité: 5 - 2 = 3

### Tester modification vente
- [ ] Aller dans **Ventes**
- [ ] Cliquer **✏️** sur la vente
- [ ] Changer quantité à 1
- [ ] Cliquer **Mettre à jour**
- [ ] Vérifier montant devient 150 × 1 = 150
- [ ] Stock du produit passe à 4 (5 - 1)

### Tester suppression vente
- [ ] Cliquer **🗑️** sur une vente
- [ ] Confirmer la suppression
- [ ] Stock du produit augmente de nouveau

### Tester exports
- [ ] Cliquer **⬇️ Télécharger** → Doit télécharger `historique_ventes_YYYY-MM-DD.txt`
- [ ] Cliquer **💬 WhatsApp** → Doit ouvrir https://wa.me/?text=...
- [ ] Cliquer **✉️ Email** → Doit ouvrir client email avec sujet et body

## 📋 Phase 7: Test Finances (5 min)

### Vérifier les statistiques
1. [ ] Aller dans **Dashboard**
2. [ ] Voir les 4 cartes:
   - **Chiffre d'Affaires**: 300 (de la vente 150×2)
   - **Dépenses Totales**: productCosts + expenses manuelles
   - **Bénéfice Net**: 300 - dépenses
   - **Ventes Totales**: nombre de ventes (1)

### Ajouter une dépense manuelle
1. [ ] Aller dans **Finances**
2. [ ] Cliquer **+ Ajouter une dépense**
3. [ ] Entrer:
   - Description: "Loyer boutique"
   - Montant: 500
   - Catégorie: "Loyer"
4. [ ] Cliquer **Ajouter**
5. [ ] Dépense s'affiche dans la table
6. [ ] Aller au **Dashboard**
7. [ ] **Dépenses Totales** augmente de 500

### Vérifier le calcul des finances
- [ ] **Formule des dépenses totales**:
  - Dépenses manuelles: 500
  - Coût du stock: 100 × 3 (produit restant) = 300
  - **Total: 800**
- [ ] **Bénéfice net**: 300 (revenue) - 800 (expenses) = -500

## 📋 Phase 8: Test Multi-Devise (5 min)

### Ajouter multi-devise
1. [ ] Aller au **Dashboard**
2. [ ] En haut, voir: **Sélectionnez une devise**
3. [ ] Défaut: USD
4. [ ] Cliquer sur le select
5. [ ] Voir la liste: USD, EUR, GBP, CAD, XAF, XOF, MAD, ZAR, KES, NGN, GHS, AOA, MZN, RWF, TZS, etc.

### Tester conversion EUR
1. [ ] Sélectionner **EUR - Euro**
2. [ ] **Chiffre d'Affaires** change: 300 USD × 0.92 = 276 EUR
3. [ ] **Dépenses Totales** changent: 800 × 0.92 = 736 EUR
4. [ ] **Bénéfice net** change: 276 - 736 = -460 EUR
5. [ ] Rafraîchir la page (F5)
6. [ ] Devise restait EUR (sauvegardée dans localStorage)

### Tester d'autres devises
- [ ] Sélectionner **GBP - £** → montants × 0.79
- [ ] Sélectionner **XAF - Franc CFA** → montants × 607.50
- [ ] Sélectionner **JPY - ¥** → montants × 149.50
- [ ] Tous les montants se convertissent correctement

## 📋 Phase 9: Test Responsive Mobile (5 min)

### Ouvrir mode mobile
1. [ ] Appuyer **F12** (Developer Tools)
2. [ ] Appuyer **Ctrl+Shift+M** (ou cliquer l'icon mobile)
3. [ ] Sélectionner **iPhone 12** ou **375px width**

### Tester Dashboard sur mobile
- [ ] Devise selector visible
- [ ] Cartes statistiques empilées 1 colonne
- [ ] Dernieres ventes: tableau → cartes (avec data-label)

### Tester Stock sur mobile
- [ ] Page header: h1 puis bouton (pas côte à côte)
- [ ] Produits: cards full-width avec padding confortable
- [ ] Margin affichée en vert box
- [ ] Formulaire: 1 colonne, inputs 16px font
- [ ] Buttons 44px × 44px minimum

### Tester Sales sur mobile
- [ ] Export buttons: column stacked (pas row)
- [ ] Formulaire: 1 colonne, spacing 12px
- [ ] Table: thead hidden, chaque row = card avec data-label
- [ ] Actions: buttons côte à côte en bas

### Tester Finances sur mobile
- [ ] Expenses form: 1 colonne
- [ ] Inputs: 16px font pour éviter zoom
- [ ] Dépenses table: card display

### Tester Sidebar sur mobile
- [ ] Menu toggle visible en haut à gauche (3 lignes)
- [ ] Cliquer toggle → sidebar glisse depuis gauche (overlay)
- [ ] Cliquer un lien → sidebar se ferme
- [ ] Smooth animation (transition 0.3s)

### Tester Navbar sur mobile
- [ ] Logo petite (18px)
- [ ] Logout icon absent sur très petit écran (320px)
- [ ] Responsive bien

## 📋 Phase 10: Test Sécurité Multi-Utilisateur (5 min)

### Créer 2e utilisateur
- [ ] Dans Supabase → Users → Add user
- [ ] Email: user2@test.com, Password: Test123!

### Tester isolation des données
1. [ ] Utilisateur 1:
   - [ ] Créer 3 produits différents
   - [ ] Enregistrer 2 ventes
   - [ ] Ajouter 1 dépense
   - [ ] Voir dashboard avec ces données
2. [ ] Déconnexion
3. [ ] Utilisateur 2:
   - [ ] Login
   - [ ] Aller Stock → Voir 0 produits (pas ceux de user1!)
   - [ ] Aller Ventes → Voir 0 ventes
   - [ ] Aller Finances → Voir 0 dépenses
   - [ ] Créer ses propres données
4. [ ] Utilisateur 1 se reconnecte:
   - [ ] Voir ses données originales
   - [ ] Pas les données de user2

### Tester RLS sécurité (Optionnel Advanced)
- [ ] F12 → Console
- [ ] Exécuter:
```javascript
// Essayer d'accéder aux produits d'un autre utilisateur
const { data, error } = await supabase
  .from('products')
  .select('*')
  .eq('user_id', 'uuid-different');

// Doit retourner erreur de permission
```

## 📋 Phase 11: Vérification finale (5 min)

### Pas d'erreurs console
- [ ] F12 → Console tab
- [ ] Aucun message rouge
- [ ] Aucun warning lié à l'app

### Performance
- [ ] Page dashboard → chargement < 3 secondes
- [ ] Stock page → chargement < 2 secondes
- [ ] Ventes page → chargement < 2 secondes
- [ ] Click edit/add → réponse < 1 seconde

### Navigation fluide
- [ ] Cliquer entre pages → transitions smooth
- [ ] Pas de lag ou freeze
- [ ] Sidebar fonctionne bien

### Données persiste
- [ ] Ajouter un produit
- [ ] Rafraîchir page (F5)
- [ ] Produit encore visible
- [ ] Déconnexion/reconnexion
- [ ] Produit encore présent

## 📋 Phase 12: Clean Up (2 min)

### Supprimer les données de test
- [ ] Aller Dashboard
- [ ] Supprimer tous les produits de test
- [ ] Supprimer toutes les ventes de test
- [ ] Supprimer tous les dépenses de test
- [ ] Ou exécuter requête SQL pour reset:

```sql
-- Supprimer données user1 test
DELETE FROM expenses WHERE user_id = 'UUID_TEST_USER';
DELETE FROM sales WHERE user_id = 'UUID_TEST_USER';
DELETE FROM products WHERE user_id = 'UUID_TEST_USER';
DELETE FROM accounts WHERE user_id = 'UUID_TEST_USER';
```

## 📋 Phase 13: Documentation (2 min)

### Fichiers disponibles
- [ ] `GUIDE_SUPABASE.md` - Installation détaillée
- [ ] `RESUME_MODIFICATIONS.md` - Résumé complet des changements
- [ ] `SUPABASE_COMPLETE.sql` - Script production-ready
- [ ] `SUPABASE_MIGRATIONS.sql` - Migrations pour tables existantes

### Sauvegarder les clés
- [ ] Copier SUPABASE_URL et ANON_KEY
- [ ] Sauvegarder dans un endroit sûr (1Password, LastPass, etc)
- [ ] ⚠️ NE PAS commit en Git!!!

## 📋 Phase 14: Déploiement (Optionnel)

### Si déploiement en production
- [ ] Vérifier les variables d'environnement
- [ ] Vérifier les clés Supabase correctes
- [ ] Vérifier RLS est actif
- [ ] Vérifier triggers sont actifs
- [ ] Tester authentification
- [ ] Tester import/export
- [ ] Faire audit sécurité

## ✅ RÉSUMÉ

|Item|Statut|
|---|---|
|SQL exécuté et vérified|  ✅|
|4 tables créées|  ✅|
|16 policies RLS|  ✅|
|5 triggers actifs|  ✅|
|9 index optimisés|  ✅|
|Responsive mobile OK|  ✅|
|Multi-devise OK|  ✅|
|Auth sécurisée|  ✅|
|CRUD complet OK|  ✅|
|Export multi-format OK|  ✅|
|Isolation données OK|  ✅|
|Documentation complète|  ✅|

## 🎉 APPLICATION PRÊTE EN PRODUCTION!

**Prochaines étapes**:
1. Former les utilisateurs
2. Créer les comptes utilisateurs via Supabase Admin Panel
3. Commencer à entrer les données
4. Monitorer les performances
5. Planifier les mises à jour futures

**Support**:
- Vérifier les logs Supabase
- Appuyer F12 pour console JavaScript
- Checker ce README pour dépannage

**Merci d'utiliser cette application! 🙏**
