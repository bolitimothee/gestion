# Guide Complet d'Installation Supabase

## 📋 Table des matières
1. [Prérequis](#prérequis)
2. [Créer les tables](#créer-les-tables)
3. [Configurer la sécurité RLS](#configurer-la-sécurité-rls)
4. [Vérifier l'installation](#vérifier-linstallation)
5. [Tester l'application](#tester-lapplication)

---

## Prérequis

✅ Compte Supabase gratuit ([supabase.com](https://supabase.com))
✅ Projet Supabase créé et configuré
✅ Authentification Supabase activée (Email/Mot de passe)

---

## Créer les tables

### Étape 1: Accédez à l'éditeur SQL Supabase

1. Allez sur [app.supabase.com](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **SQL Editor** (menu de gauche)
4. Cliquez sur **Nouvelle requête** ou **New query**

### Étape 2: Copier-coller le script SQL

1. Ouvrez le fichier `SUPABASE_COMPLETE.sql` dans votre dossier projet
2. Copiez **TOUT le contenu** du fichier
3. Collez-le dans l'éditeur SQL de Supabase
4. Cliquez sur **▶️ Exécuter** ou **Run** (bouton noir en haut à droite)

⚠️ **Important**: Ne modifiez rien - exécutez le script tel quel!

### Étape 3: Vérifier l'exécution

Vous devriez voir des messages verts indiquant:
```
✓ CREATE EXTENSION
✓ CREATE TABLE accounts
✓ CREATE TABLE products
✓ CREATE TABLE sales
✓ CREATE TABLE expenses
✓ CREATE INDEX (plusieurs fois)
✓ ALTER TABLE ... ENABLE ROW LEVEL SECURITY
✓ CREATE POLICY (plusieurs fois)
✓ CREATE FUNCTION
✓ CREATE TRIGGER (plusieurs fois)
✓ CREATE VIEW (plusieurs fois)
```

---

## Configurer la sécurité RLS

### Vérifier que RLS est actif

1. Allez dans **Database** → **Tables** (menu de gauche)
2. Cliquez sur chaque table (**accounts**, **products**, **sales**, **expenses**)
3. Ouvrez l'onglet **SQL** ou vérifiez que les **policies** sont présentes

Vous devriez voir sous chaque table:
- `accounts_select_own`
- `accounts_insert_own`
- `accounts_update_own`
- `accounts_delete_own`
- (idem pour products, sales, expenses)

### Les règles de sécurité

Chaque table **ne permet** à un utilisateur d'accéder qu'aux données `user_id = auth.uid()`:

```
- SELECT: Voir uniquement vos propres enregistrements
- INSERT: Créer uniquement avec votre user_id
- UPDATE: Modifier uniquement vos propres données
- DELETE: Supprimer uniquement vos propres données
```

---

## Vérifier l'installation

### Étape 1: Tables créées

Exécutez cette requête SQL pour vérifier:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

Vous devriez voir:
- `accounts`
- `products`
- `sales`
- `expenses`

### Étape 2: Index créés

Exécutez:

```sql
SELECT indexname FROM pg_indexes WHERE schemaname = 'public';
```

Vous devriez voir plusieurs index (idx_products_user_id, idx_sales_*, etc.)

### Étape 3: Polices RLS actives

Exécutez:

```sql
SELECT * FROM pg_policies 
WHERE tablename IN ('accounts', 'products', 'sales', 'expenses');
```

Vous devriez voir 16 politiques (4 par table).

---

## Tester l'application

### Étape 1: Démarrer l'application

```bash
# Dans le terminal, à la racine du projet
npm run dev
```

Votre application démarre sur `http://localhost:5173`

### Étape 2: Créer un compte test

1. Allez sur **http://localhost:5173/login**
2. Vous verrez le message: **"Pour créer un nouveau compte, contactez votre administrateur"**
3. Créez un compte via la console Supabase:
   - Allez dans **Authentication** → **Users**
   - Cliquez sur **+ Add user** ou **Inviter en masse**
   - Entrez: email, mot de passe
   - Cliquez **Inviter**

Ou utilisez l'API d'auth:

```javascript
// Dans la console du navigateur (F12) en tant qu'admin:
fetch('https://YOUR-SUPABASE-URL/auth/v1/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'SecurePassword123'
  })
})
```

### Étape 3: Se connecter

1. Entrez vos identifiants Supabase
2. Vous devriez être redirigé vers le **Dashboard**

### Étape 4: Tester les fonctionnalités

#### 🏪 Stock (Produits)
1. Allez dans **Stock**
2. Cliquez **+ Ajouter un produit**
3. Remplissez:
   - **Nom**: Produit Test
   - **Catégorie**: Électronique
   - **Prix d'achat**: 50
   - **Prix de revente**: 100
   - **Quantité**: 10
   - **SKU**: SKU123
4. Cliquez **Ajouter**
5. Le produit doit s'afficher avec **marge: 50 (50%)**

#### 💰 Ventes
1. Allez dans **Ventes**
2. Cliquez **+ Nouv...elle vente**
3. Sélectionnez le produit créé
4. Entrez quantité: 2
5. Cliquez **Enregistrer**
6. La vente s'affiche dans la table
7. Testez:
   - **Bouton Modifier ✏️**: Changez la quantité
   - **Bouton Supprimer 🗑️**: Supprimez la vente
   - **Exporter en texte ⬇️**: Télécharge historique.txt
   - **Partager WhatsApp 💬**: Ouvre WhatsApp
   - **Partager Email ✉️**: Ouvre votre client email

#### 📊 Finances
1. Allez dans **Finances**
2. **Dépenses totales = dépenses manuelles + coût du stock**
   - Stock: 1 produit × 50 (prix d'achat) = 50
   - Dépense manuelle: 20
   - Total = 70
3. Cliquez **+ Ajouter une dépense**
4. Testez l'ajout de dépenses

#### 🌍 Sélecteur de devise
1. Allez au **Dashboard**
2. En haut de la page: **Sélectionnez une devise**
3. Tous les montants changent:
   - USD → EUR: montant × 0.92
   - USD → GBP: montant × 0.79
   - USD → XAF: montant × 607.50 (Franc CFA)
4. Votre choix est sauvegardé dans localStorage

#### 📱 Responsive
Testez sur mobile ou tablette:
- Appuyez sur **F12** → **Ctrl+Shift+M** (mobile view)
- Les formulaires doivent être en 1 colonne
- Les bouttons ont min 44px × 44px
- Les tables se transforment en cartes
- Le sidebar se cache et glisse quand on clique le menu

---

## Dépannage

### ❌ Erreur: "relation "products" does not exist"

**Cause**: Les tables n'ont pas été créées.

**Solution**:
1. Vérifiez que vous avez exécuté **tout le script SQL**
2. Refraîchissez la page Supabase
3. Vérifiez dans **Database** → **Tables** que les tables existent

### ❌ Erreur: "permission denied for relation accounts"

**Cause**: RLS est actif mais pas configuré correctement.

**Solution**:
1. Vérifiez que les **policies** existent pour chaque table
2. Vérifiez que `auth.uid() = user_id` est présent dans chaque policy

### ❌ Erreur: "CORS Error" ou "Fetch failed"

**Cause**: Problème de configuration Supabase.

**Solution**:
1. Vérifiez votre `supabaseClient.js`:
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://YOUR-PROJECT.supabase.co'
const supabaseAnonKey = 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

2. Les clés doivent venir de **Settings** → **API** dans Supabase

### ❌ Devise ne change pas les montants

**Cause**: Données pas convertibles depuis USD.

**Solution**:
1. Assurez-vous que tous les montants en base sont en USD
2. Vérifiez la console (F12) pour les erreurs
3. Testez avec un autre devise (USD → EUR)

---

## Affichage Responsive 📱

### Points d'arrêt

| Taille | Utilisation | Layout |
|--------|------------|--------|
| 320px - 480px | Téléphone | 1 colonne, stacked |
| 481px - 768px | Tablette | 2 colonnes |
| 769px+ | Ordinateur | Layout complet avec sidebar |

### Taille minimum des boutons

- **Tapotable**: 44px × 44px minimum
- **Font**: Au moins 14px
- **Padding**: Au moins 12px sur mobile

### Styles appliqués automatiquement

Les fichiers CSS appliquent des media queries:
- `Stock.css` @media 480px
- `Sales.css` @media 480px
- `Finances.css` @media 480px
- `Dashboard.css` @media 480px
- `globals.css` @media 480px
- `Navbar.css` @media 480px
- `Sidebar.css` @media 480px (fixed overlay)

---

## Fonctionnalités clés

### ✅ Authentification sécurisée
- OAuth via Supabase Auth
- Pas de self-signup (admin only)
- Tokens JWT automatiques

### ✅ Isolation des données multi-utilisateur
- RLS (Row Level Security) actif
- Chaque utilisateur ne voit que ses données
- Impossible accéder aux données d'un autre utilisateur

### ✅ Gestion du stock automatique
- Stock décrémente automatiquement lors d'une vente
- Stock s'update lors de modification/suppression
- Triggers PostgreSQL gèrent la logique

### ✅ Calcul des finances intégré
- Chiffre d'affaires = Σ ventes
- Dépenses totales = dépenses manuelles + coût du stock
- Bénéfice net = chiffre d'affaires - dépenses totales

### ✅ Multi-devise
- 21 devises supportées (USD, EUR, GBP, XAF, etc.)
- Taux de change prédéfinis
- Sauvegardé dans localStorage par utilisateur

### ✅ Export multi-format
- Téléchargement en .txt
- Partage WhatsApp direct
- Envoi par email

---

## Scripts utiles

### Ajouter un utilisateur via SQL
```sql
-- Note: Impossible avec SQL, utilisez la console Supabase
-- Allez dans Authentication → Users → Add user
```

### Vérifier les données d'un utilisateur
```sql
SELECT * FROM products WHERE user_id = 'UUID_ICI';
SELECT * FROM sales WHERE user_id = 'UUID_ICI';
SELECT * FROM expenses WHERE user_id = 'UUID_ICI';
```

### Supprimer toutes les données d'un utilisateur
```sql
DELETE FROM expenses WHERE user_id = 'UUID_ICI';
DELETE FROM sales WHERE user_id = 'UUID_ICI';
DELETE FROM products WHERE user_id = 'UUID_ICI';
DELETE FROM accounts WHERE user_id = 'UUID_ICI';
```

### Réinitialiser les tables
```sql
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
-- Puis réexécutez le script SUPABASE_COMPLETE.sql
```

---

## Support

en cas de problème:

1. Vérifiez la console Supabase pour les logs
2. Appuyez sur **F12** dans le navigateur pour voir les erreurs JavaScript
3. Vérifiez que vous exécutez avec `npm run dev`
4. Assurez-vous que votre projet Supabase est actif

---

**Instalation réussie! 🎉**

Vous pouvez maintenant:
- ✅ Créer des produits
- ✅ Enregistrer des ventes
- ✅ Gérer vos finances
- ✅ Changer de devise en 1 clic
- ✅ Exporter l'historique
- ✅ Utiliser sur mobile, tablette, ou ordinateur
