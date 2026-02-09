-- ========================================
-- SQL FINAL COMPLET POUR SUPABASE
-- Gestion Commerce - Synchronisation Temps Réel & Multi-Devise
-- ========================================
-- Ce SQL crée/modifie la structure complète de la base de données
-- Il est sûr de l'exécuter - il contient IF NOT EXISTS et IF EXISTS
-- Date: 2026-02-09
-- ========================================

-- ========================================
-- 1. TABLE ACCOUNTS (Comptes Utilisateurs)
-- ========================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(255),
  email VARCHAR(255),
  business_name VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  preferred_currency VARCHAR(3) DEFAULT 'USD' COMMENT 'Devise préférée de l''utilisateur (USD, EUR, XAF, MAD, etc.)',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
) COMMENT 'Comptes utilisateurs avec préférence de devise';

-- ========================================
-- 2. TABLE PRODUCTS (Produits/Stocks)
-- ========================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  sku VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 0,
  purchase_price DECIMAL(12, 2) NOT NULL COMMENT 'Prix d''achat dans la devise configurée',
  selling_price DECIMAL(12, 2) NOT NULL COMMENT 'Prix de vente dans la devise configurée',
  base_purchase_price DECIMAL(12, 2) COMMENT 'Prix d''achat en USD (pour reconversion)',
  base_selling_price DECIMAL(12, 2) COMMENT 'Prix de vente en USD (pour reconversion)',
  currency_code VARCHAR(3) DEFAULT 'USD' COMMENT 'Devise du produit',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
) COMMENT 'Stock de produits avec support multi-devise';

-- ========================================
-- 3. TABLE SALES (Ventes)
-- ========================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL COMMENT 'Prix unitaire au moment de la vente',
  total_amount DECIMAL(12, 2) NOT NULL COMMENT 'Montant total (quantity × unit_price)',
  sale_date DATE NOT NULL,
  sale_time TIME,
  currency_code VARCHAR(3) DEFAULT 'USD' COMMENT 'Devise de la vente',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
) COMMENT 'Transactions de vente avec support multi-devise';

-- ========================================
-- 4. TABLE EXPENSES (Dépenses/Frais)
-- ========================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL COMMENT 'Montant de la dépense',
  category VARCHAR(100),
  date DATE NOT NULL,
  currency_code VARCHAR(3) DEFAULT 'USD' COMMENT 'Devise de la dépense',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
) COMMENT 'Dépenses/frais avec support multi-devise';

-- ========================================
-- 5. TABLE CUSTOMERS (Clients) - FUTURE
-- ========================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  total_purchases DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
) COMMENT 'Base de données clients (préparé pour future expansion)';

-- ========================================
-- 6. INDICES POUR PERFORMANCE
-- ========================================

-- Indices sur user_id (pour RLS et filtrage rapide)
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);

-- Indices sur devise (pour conversion rapide)
CREATE INDEX IF NOT EXISTS idx_products_currency ON products(currency_code);
CREATE INDEX IF NOT EXISTS idx_sales_currency ON sales(currency_code);
CREATE INDEX IF NOT EXISTS idx_expenses_currency ON expenses(currency_code);

-- Indices sur dates (pour tri/filtrage)
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);

-- Indices composites (user_id + date pour requêtes optimisées)
CREATE INDEX IF NOT EXISTS idx_sales_user_date ON sales(user_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date DESC);

-- ========================================
-- 7. ROW-LEVEL SECURITY (RLS) - SÉCURITÉ
-- ========================================

-- Activer RLS sur toutes les tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- ========================================
-- POLICIES ACCOUNTS
-- ========================================
DROP POLICY IF EXISTS accounts_select_policy ON accounts;
CREATE POLICY accounts_select_policy
  ON accounts
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS accounts_insert_policy ON accounts;
CREATE POLICY accounts_insert_policy
  ON accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS accounts_update_policy ON accounts;
CREATE POLICY accounts_update_policy
  ON accounts
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS accounts_delete_policy ON accounts;
CREATE POLICY accounts_delete_policy
  ON accounts
  FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- POLICIES PRODUCTS
-- ========================================
DROP POLICY IF EXISTS products_select_policy ON products;
CREATE POLICY products_select_policy
  ON products
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS products_insert_policy ON products;
CREATE POLICY products_insert_policy
  ON products
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS products_update_policy ON products;
CREATE POLICY products_update_policy
  ON products
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS products_delete_policy ON products;
CREATE POLICY products_delete_policy
  ON products
  FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- POLICIES SALES
-- ========================================
DROP POLICY IF EXISTS sales_select_policy ON sales;
CREATE POLICY sales_select_policy
  ON sales
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS sales_insert_policy ON sales;
CREATE POLICY sales_insert_policy
  ON sales
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS sales_update_policy ON sales;
CREATE POLICY sales_update_policy
  ON sales
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS sales_delete_policy ON sales;
CREATE POLICY sales_delete_policy
  ON sales
  FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- POLICIES EXPENSES
-- ========================================
DROP POLICY IF EXISTS expenses_select_policy ON expenses;
CREATE POLICY expenses_select_policy
  ON expenses
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS expenses_insert_policy ON expenses;
CREATE POLICY expenses_insert_policy
  ON expenses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS expenses_update_policy ON expenses;
CREATE POLICY expenses_update_policy
  ON expenses
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS expenses_delete_policy ON expenses;
CREATE POLICY expenses_delete_policy
  ON expenses
  FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- POLICIES CUSTOMERS
-- ========================================
DROP POLICY IF EXISTS customers_select_policy ON customers;
CREATE POLICY customers_select_policy
  ON customers
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS customers_insert_policy ON customers;
CREATE POLICY customers_insert_policy
  ON customers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS customers_update_policy ON customers;
CREATE POLICY customers_update_policy
  ON customers
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS customers_delete_policy ON customers;
CREATE POLICY customers_delete_policy
  ON customers
  FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- 8. FONCTIONS/TRIGGERS (OPTIONNEL)
-- ========================================

-- Fonction pour auto-mettre à jour le timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger à accounts
DROP TRIGGER IF EXISTS accounts_updated_at_trigger ON accounts;
CREATE TRIGGER accounts_updated_at_trigger
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Appliquer le trigger à products
DROP TRIGGER IF EXISTS products_updated_at_trigger ON products;
CREATE TRIGGER products_updated_at_trigger
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Appliquer le trigger à sales
DROP TRIGGER IF EXISTS sales_updated_at_trigger ON sales;
CREATE TRIGGER sales_updated_at_trigger
  BEFORE UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Appliquer le trigger à expenses
DROP TRIGGER IF EXISTS expenses_updated_at_trigger ON expenses;
CREATE TRIGGER expenses_updated_at_trigger
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Appliquer le trigger à customers
DROP TRIGGER IF EXISTS customers_updated_at_trigger ON customers;
CREATE TRIGGER customers_updated_at_trigger
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 9. CONFIGURATION RÉPLICATION (Optionnel)
-- ========================================
-- Activer la réplication pour les subscriptions Real-Time
-- (par défaut activé dans Supabase, cette section est documentaire)

-- Pour activer les subscriptions Supabase Real-Time:
-- Aller dans: Supabase Dashboard → Settings → Replication
-- Activer "Enable replication for this table"
-- Ensuite les changements seront transmis en temps réel

-- ========================================
-- 10. DONNÉES DE TEST (OPTIONNEL)
-- ========================================
-- Décommenter pour ajouter des données de test

/*
-- Insérer un compte test
INSERT INTO accounts (user_id, username, email, business_name, preferred_currency)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'Administrateur',
  'admin@example.com',
  'Ma Boutique Test',
  'USD'
) ON CONFLICT (user_id) DO NOTHING;

-- Insérer des produits test
INSERT INTO products (user_id, name, category, quantity, purchase_price, selling_price, currency_code)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'Produit Test 1',
  'Électronique',
  50,
  100.00,
  150.00,
  'USD'
) ON CONFLICT DO NOTHING;
*/

-- ========================================
-- VÉRIFICATIONS ET INFOS UTILES
-- ========================================
-- Après exécution, vérifiez:
-- 1. \dt - Lister toutes les tables
-- 2. SELECT * FROM information_schema.tables WHERE table_schema = 'public';
-- 3. Vérifier les index: SELECT * FROM pg_indexes WHERE schemaname = 'public';
-- 4. Tester RLS avec SELECT * FROM products (doit retourner 0 lignes sans authentification)

-- ========================================
-- SUPPORT MULTI-DEVISE
-- ========================================
-- Devises supportées dans l'application (21 devises):
-- USD, EUR, GBP, JPY, AUD, CAD, CHF, CNY, INR, KRW, 
-- BRL, MXN, ZAR, SGD, HKD, SEK, NOK, NZD, XAF, MAD, INR

-- La colonne preferred_currency dans accounts stocke le code devise (ex: 'EUR')
-- Les colonnes currency_code dans products/sales/expenses stockent la devise de chaque enregistrement
-- Les colonnes base_* stockent les valeurs en USD pour reconversion
-- La conversion se fait côté React avec la fonction convertFinancialData()

-- ========================================
-- SYNCHRONISATION TEMPS RÉEL
-- ========================================
-- Ces tables supportent la synchronisation Supabase Real-Time:
-- - Les app peuvent s'abonner à: realtime.products, realtime.sales, realtime.expenses, realtime.accounts
-- - Les événements: INSERT, UPDATE, DELETE sont transmis en temps réel
-- - Filtrage par user_id garantit l'isolation des données

-- Exemple d'abonnement côté React:
-- supabaseClient
--   .channel(`products:user_${user_id}`)
--   .on('postgres_changes', {
--     event: '*',
--     schema: 'public',
--     table: 'products',
--     filter: `user_id=eq.${user_id}`
--   }, (payload) => console.log(payload))
--   .subscribe()

-- ========================================
-- FIN DU SQL - Tout est prêt!
-- ========================================
