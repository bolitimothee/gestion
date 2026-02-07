-- =====================================================
-- APPLICATION DE GESTION COMMERCIALE - SQL COMPLET
-- Supabase PostgreSQL Database
-- =====================================================
-- Description: Script SQL complet pour créer et configurer
-- la base de données avec toutes les fonctionnalités
-- =====================================================

-- =====================================================
-- 1. EXTENSION POUR LES UUID (Si nécessaire)
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 2. CRÉATION DES TABLES
-- =====================================================

-- ===== TABLE: accounts (Comptes utilisateurs) =====
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  account_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  validity_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===== TABLE: products (Produits/Stock) =====
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  sku VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===== TABLE: sales (Ventes) =====
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  customer_name VARCHAR(255),
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===== TABLE: expenses (Dépenses) =====
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  category VARCHAR(100),
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. CRÉATION DES INDEX (Pour les performances)
-- =====================================================

-- Index sur user_id pour les tables principales
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

-- Index sur les dates pour les requêtes de plage
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(user_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(user_id, date DESC);

-- Index sur product_id pour les jointures
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);

-- Index sur created_at pour les tri par défaut
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(user_id, created_at DESC);

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS) - Sécurité par utilisateur
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- ===== Polices d'accès pour la table accounts =====
CREATE POLICY "accounts_select_own" ON accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "accounts_insert_own" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "accounts_update_own" ON accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "accounts_delete_own" ON accounts
  FOR DELETE USING (auth.uid() = user_id);

-- ===== Polices d'accès pour la table products =====
CREATE POLICY "products_select_own" ON products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "products_insert_own" ON products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "products_update_own" ON products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "products_delete_own" ON products
  FOR DELETE USING (auth.uid() = user_id);

-- ===== Polices d'accès pour la table sales =====
CREATE POLICY "sales_select_own" ON sales
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sales_insert_own" ON sales
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sales_update_own" ON sales
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "sales_delete_own" ON sales
  FOR DELETE USING (auth.uid() = user_id);

-- ===== Polices d'accès pour la table expenses =====
CREATE POLICY "expenses_select_own" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "expenses_insert_own" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses_update_own" ON expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "expenses_delete_own" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 5. CRÉER UN TRIGGER POUR METTRE À JOUR updated_at
-- =====================================================

-- Créer une fonction générique pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger à chaque table
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. TRIGGER POUR METTRE À JOUR LES QUANTITÉS DE STOCK
-- =====================================================

-- Créer un trigger pour décrémenter le stock lors d'une vente
CREATE OR REPLACE FUNCTION update_product_quantity_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Si c'est une insertion (nouvelle vente)
  IF TG_OP = 'INSERT' THEN
    UPDATE products
    SET quantity = quantity - NEW.quantity
    WHERE id = NEW.product_id AND user_id = NEW.user_id;
    RETURN NEW;
  
  -- Si c'est une mise à jour (modification de la quantité vendue)
  ELSIF TG_OP = 'UPDATE' THEN
    -- Ajuster le stock par la différence
    UPDATE products
    SET quantity = quantity + (OLD.quantity - NEW.quantity)
    WHERE id = NEW.product_id AND user_id = NEW.user_id;
    RETURN NEW;
  
  -- Si c'est une suppression (annulation de vente)
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE products
    SET quantity = quantity + OLD.quantity
    WHERE id = OLD.product_id AND user_id = OLD.user_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger
CREATE TRIGGER update_product_quantity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_product_quantity_on_sale();

-- =====================================================
-- 7. VUES POUR LES STATISTIQUES
-- =====================================================

-- Vue: Résumé des ventes par utilisateur
CREATE OR REPLACE VIEW vw_sales_summary AS
SELECT
  user_id,
  COUNT(id) as total_sales,
  SUM(quantity) as total_quantity,
  SUM(total_amount) as total_revenue,
  AVG(total_amount) as average_sale_amount,
  MAX(sale_date) as last_sale_date
FROM sales
GROUP BY user_id;

-- Vue: Résumé des dépenses par utilisateur
CREATE OR REPLACE VIEW vw_expenses_summary AS
SELECT
  user_id,
  COUNT(id) as total_expenses,
  SUM(amount) as total_amount,
  AVG(amount) as average_expense,
  category,
  MAX(date) as last_expense_date
FROM expenses
GROUP BY user_id, category;

-- Vue: Inventaire par utilisateur
CREATE OR REPLACE VIEW vw_inventory_summary AS
SELECT
  user_id,
  COUNT(id) as total_products,
  SUM(quantity) as total_quantity,
  SUM(purchase_price * quantity) as total_purchase_cost,
  SUM(selling_price * quantity) as total_selling_cost,
  AVG(quantity) as average_quantity
FROM products
GROUP BY user_id;

-- =====================================================
-- 8. DONNÉES D'EXEMPLE (OPTIONNEL)
-- =====================================================
-- Note: Remplacez 'user-uuid-here' par un vrai UUID utilisateur

-- INSERT INTO accounts VALUES
-- ('account-uuid', 'user-uuid-here', 'Ma Boutique', 'contact@boutique.com', NULL, true, NOW(), NOW()),
-- ...

-- =====================================================
-- 9. CONFIGURATION FINALE
-- =====================================================

-- Vérifier les tables créées
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Vérifier les index
SELECT indexname FROM pg_indexes WHERE schemaname = 'public';

-- Vérifier les politiques RLS
SELECT * FROM pg_policies WHERE tablename IN ('accounts', 'products', 'sales', 'expenses');

-- =====================================================
-- FIN DU SCRIPT SQL
-- =====================================================
-- Étapes d'exécution:
-- 1. Copier-coller ce script dans l'éditeur SQL de Supabase
-- 2. Exécuter le script entièrement
-- 3. Vérifier que toutes les tables sont créées
-- 4. Les utilisateurs ne peuvent voir que leurs propres données (RLS actif)
-- 5. Les insertions/mises à jour des ventes mettront à jour automatiquement les stocks
-- =====================================================
