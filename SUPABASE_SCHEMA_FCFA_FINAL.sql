/**
 * ========================================
 * SCHÉMA SUPABASE - DEVISE UNIQUE: FCFA
 * ========================================
 * 
 * Simplification complète:
 * - Suppression du système multi-devise
 * - Devise unique par défaut: FCFA
 * - Tous les montants stockés en FCFA uniquement
 * - Aucune conversion de devise côté BD
 */

-- ========================================
-- 1. CRÉER LES TABLES
-- ========================================

-- Table: accounts
CREATE TABLE IF NOT EXISTS accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  business_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  validity_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table: customers
CREATE TABLE IF NOT EXISTS customers (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  company_name VARCHAR(255),
  balance_fcfa NUMERIC(15, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table: products
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  sku VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 0,
  purchase_price NUMERIC(15, 2) NOT NULL,
  selling_price NUMERIC(15, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table: sales
CREATE TABLE IF NOT EXISTS sales (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(15, 2) NOT NULL,
  total_amount NUMERIC(15, 2) NOT NULL,
  sale_date DATE NOT NULL,
  sale_time TIME,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table: expenses
CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  category VARCHAR(100),
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ========================================
-- 2. CRÉER LES INDEX
-- ========================================

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_validity_date ON accounts(validity_date);
CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

-- ========================================
-- 3. ACTIVER RLS (Row-Level Security)
-- ========================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 4. CRÉER LES POLICIES RLS
-- ========================================

-- ACCOUNTS POLICIES
CREATE POLICY "accounts_select_own" ON accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "accounts_insert_own" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "accounts_update_own" ON accounts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "accounts_delete_own" ON accounts
  FOR DELETE USING (auth.uid() = user_id);

-- CUSTOMERS POLICIES
CREATE POLICY "customers_select_own" ON customers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "customers_insert_own" ON customers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "customers_update_own" ON customers
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "customers_delete_own" ON customers
  FOR DELETE USING (auth.uid() = user_id);

-- PRODUCTS POLICIES
CREATE POLICY "products_select_own" ON products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "products_insert_own" ON products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "products_update_own" ON products
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "products_delete_own" ON products
  FOR DELETE USING (auth.uid() = user_id);

-- SALES POLICIES
CREATE POLICY "sales_select_own" ON sales
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sales_insert_own" ON sales
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sales_update_own" ON sales
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sales_delete_own" ON sales
  FOR DELETE USING (auth.uid() = user_id);

-- EXPENSES POLICIES
CREATE POLICY "expenses_select_own" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "expenses_insert_own" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses_update_own" ON expenses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses_delete_own" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 5. CRÉER LES TRIGGERS POUR updated_at
-- ========================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON accounts
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER sales_updated_at BEFORE UPDATE ON sales
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON expenses
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ========================================
-- 6. ACTIVER REPLICATION (Pour Real-Time)
-- ========================================

ALTER PUBLICATION supabase_realtime ADD TABLE accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
