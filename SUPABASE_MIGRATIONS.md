# 🔧 MISE À JOUR SUPABASE REQUISE

## ✅ SI VOS TABLES EXISTENT DÉJÀ AVEC `unit_price`

### 1. **Ajouter les colonnes manquantes**

```sql
-- Ajouter purchase_price si elle n'existe pas
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS purchase_price NUMERIC DEFAULT 0;

-- Ajouter selling_price si elle n'existe pas
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS selling_price NUMERIC DEFAULT 0;
```

### 2. **Migrer les données depuis unit_price**

```sql
-- Copier unit_price vers selling_price
UPDATE products 
SET selling_price = unit_price 
WHERE selling_price = 0 AND unit_price IS NOT NULL;

-- Définir purchase_price (80% du selling_price comme base)
UPDATE products 
SET purchase_price = selling_price * 0.8 
WHERE purchase_price = 0 AND selling_price > 0;
```

### 3. **Vérifier les migrations**

```sql
-- Vérifier que les données sont bien migrées
SELECT id, name, unit_price, purchase_price, selling_price FROM products LIMIT 10;
```

### 4. **Optionnel: Supprimer unit_price**

```sql
-- ⚠️ OPTIONNEL - Seulement après vérification
-- ALTER TABLE products DROP COLUMN unit_price;
```

---

## ✅ SI VOUS CRÉEZ UNE NOUVELLE BASE

### Créer la table `products` complètement:

```sql
CREATE TABLE products (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  purchase_price NUMERIC NOT NULL,
  selling_price NUMERIC NOT NULL,
  quantity INTEGER DEFAULT 0,
  sku VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
```

### Créer la table `sales` complètement:

```sql
CREATE TABLE sales (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  sale_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_sales_user_id ON sales(user_id);
CREATE INDEX idx_sales_sale_date ON sales(sale_date DESC);
CREATE INDEX idx_sales_product_id ON sales(product_id);
```

### Créer la table `expenses` complètement:

```sql
CREATE TABLE expenses (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  amount NUMERIC NOT NULL,
  category VARCHAR(100),
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date DESC);
```

### Créer la table `accounts` complètement:

```sql
CREATE TABLE accounts (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  validity_date TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '1 year',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
```

---

## 🔒 ROW LEVEL SECURITY (RLS)

### Activer RLS sur toutes les tables:

```sql
-- PRODUCTS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own products"
  ON products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their products"
  ON products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their products"
  ON products FOR DELETE
  USING (auth.uid() = user_id);

-- SALES
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their sales"
  ON sales FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert sales"
  ON sales FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update sales"
  ON sales FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete sales"
  ON sales FOR DELETE
  USING (auth.uid() = user_id);

-- EXPENSES
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their expenses"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update expenses"
  ON expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete expenses"
  ON expenses FOR DELETE
  USING (auth.uid() = user_id);

-- ACCOUNTS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their account"
  ON accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their account"
  ON accounts FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## 🧪 TEST DES TABLE APRÈS MIGRATION

```sql
-- Vérifier structure products
\d products

-- Vérifier données
SELECT COUNT(*) FROM products;
SELECT * FROM products LIMIT 5;

-- Vérifier migrazione
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN purchase_price = 0 THEN 1 END) as missing_purchase,
  COUNT(CASE WHEN selling_price = 0 THEN 1 END) as missing_selling
FROM products;
```

---

## ⚠️ IMPORTANT À RETENIR

1. **Ne jamais supprimer `unit_price` sans backup**
   - Gardez-le pendant 2-3 semaines
   - Vérifiez que tout fonctionne d'abord

2. **Tester les migrations en local d'abord**
   - Utilisez l'environnement de staging
   - Faites un backup avant

3. **Les données existantes**
   - Utiliser les migrations pour copier les valeurs
   - Vérifier la cohérence des prix

4. **Les RLS policies**
   - Essentielles pour la sécurité
   - Vérifier après les ajouter

---

## 📋 CHECKLIST SUPABASE

- [ ] Tables produits, ventes, dépenses, comptes créées
- [ ] Colonnes `purchase_price` et `selling_price` existent
- [ ] Données migrées de `unit_price` si nécessaire
- [ ] RLS actifs sur toutes les tables
- [ ] Policies créées pour chaque utilisateur
- [ ] Index créés pour les requêtes fréquentes
- [ ] Tests de sélection/insertion/mise à jour fonctionnent
- [ ] Génération des comptes administrateur fonctionnelle

---

## 🔐 CRÉER UN UTILISATEUR ADMIN

```sql
-- Dans Supabase Auth, créer un nouvel utilisateur avec:
Email: admin@gestion-commerce.com
Mot de passe: [mot de passe fort]

-- Puis dans la table accounts, ajouter:
INSERT INTO accounts (user_id, account_name, email, validity_date, is_active)
VALUES (
  '[user_id_du_nouvel_utilisateur]',
  'Admin Commerce',
  'admin@gestion-commerce.com',
  NOW() + INTERVAL '1 year',
  TRUE
);
```

---

## 📞 EN CAS DE PROBLÈME

**Erreur "Relation not found"?**
- La table n'existe pas
- Créez-la avec les scripts ci-dessus

**Erreur "RLS policy violation"?**
- RLS doit autoriser les opérations
- Vérifiez les policies

**Migration échouée?**
- Vérifiez la console Supabase
- Regardez les logs d'erreur détaillés

