-- =====================================================
-- MIGRATIONS SUPABASE - Si les tables existent déjà
-- =====================================================
-- Utilisez ce script SI vous avez déjà des tables existantes
-- et que vous voulez les mettre à jour sans les supprimer
-- =====================================================

-- =====================================================
-- 1. AJOUTER LES COLONNES MANQUANTES (Si nécessaire)
-- =====================================================

-- Si la table products n'a pas purchase_price/selling_price:
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12, 2) DEFAULT 0;
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12, 2) DEFAULT 0;

-- =====================================================
-- 2. CRÉER LES VUES (Si n'existent pas)
-- =====================================================

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
-- 3. ACTIVER RLS (Si pas activé)
-- =====================================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. AJOUTER LES POLICIES RLS (Si pas présentes)
-- =====================================================

-- Vérifier les policies existantes:
-- SELECT * FROM pg_policies WHERE tablename = 'products';

-- Si absent, créer les policies:

-- Products
CREATE POLICY "products_select_own" ON products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "products_insert_own" ON products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "products_update_own" ON products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "products_delete_own" ON products
  FOR DELETE USING (auth.uid() = user_id);

-- Sales
CREATE POLICY "sales_select_own" ON sales
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sales_insert_own" ON sales
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sales_update_own" ON sales
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "sales_delete_own" ON sales
  FOR DELETE USING (auth.uid() = user_id);

-- Expenses
CREATE POLICY "expenses_select_own" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "expenses_insert_own" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses_update_own" ON expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "expenses_delete_own" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Accounts
CREATE POLICY "accounts_select_own" ON accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "accounts_insert_own" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "accounts_update_own" ON accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "accounts_delete_own" ON accounts
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 5. AJOUTER LES INDEX (Si bas performance)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(user_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);

CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(user_id, created_at DESC);

-- =====================================================
-- 6. CRÉER LE TRIGGER updated_at (Si absent)
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ajouter triggers
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
-- 7. CRÉER LE TRIGGER stock auto-update (Si absent)
-- =====================================================

CREATE OR REPLACE FUNCTION update_product_quantity_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE products
    SET quantity = quantity - NEW.quantity
    WHERE id = NEW.product_id AND user_id = NEW.user_id;
    RETURN NEW;
  
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE products
    SET quantity = quantity + (OLD.quantity - NEW.quantity)
    WHERE id = NEW.product_id AND user_id = NEW.user_id;
    RETURN NEW;
  
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE products
    SET quantity = quantity + OLD.quantity
    WHERE id = OLD.product_id AND user_id = OLD.user_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_quantity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_product_quantity_on_sale();

-- =====================================================
-- 8. VÉRIFIER L'INTÉGRITÉ
-- =====================================================

-- Tables
SELECT 'Tables' as section, count(*) as count FROM information_schema.tables WHERE table_schema = 'public';

-- Index
SELECT 'Index' as section, count(*) as count FROM pg_indexes WHERE schemaname = 'public';

-- Policies
SELECT 'RLS Policies' as section, count(*) as count FROM pg_policies WHERE tablename IN ('accounts', 'products', 'sales', 'expenses');

-- Triggers
SELECT 'Triggers' as section, count(*) as count FROM pg_trigger WHERE tgname LIKE '%_updated_at%' OR tgname LIKE '%quantity%';

-- =====================================================
-- 9. NETTOYER LES DONNÉES (OPTIONNEL)
-- =====================================================

-- ⚠️ ATTENTION: Ces commandes SUPPRIMENT les données!

-- Supprimer AND réinitialiser one user:
-- DELETE FROM expenses WHERE user_id = 'UUID_HERE';
-- DELETE FROM sales WHERE user_id = 'UUID_HERE';
-- DELETE FROM products WHERE user_id = 'UUID_HERE';
-- DELETE FROM accounts WHERE user_id = 'UUID_HERE';

-- Réinitialiser ALL tables:
-- TRUNCATE accounts, products, sales, expenses RESTART IDENTITY CASCADE;

-- =====================================================
-- FIN DES MIGRATIONS
-- =====================================================

-- Exécutez les sections dont vous avez besoin
-- Ignorez les sections "IF NOT EXISTS" si déjà présentes
