-- ============================================================================
-- SUPABASE DATABASE SCHEMA - FCFA EDITION (SIMPLIFIED)
-- Devise par défaut: FCFA uniquement
-- Dernière mise à jour: 2026-02-10
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: accounts (Comptes utilisateurs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- TABLE: products (Inventaire des produits)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  sku VARCHAR(50),
  quantity INTEGER NOT NULL DEFAULT 0,
  purchase_price DECIMAL(12, 2) NOT NULL,
  selling_price DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES public.accounts(user_id) ON DELETE CASCADE
);

-- ============================================================================
-- TABLE: sales (Enregistrement des ventes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  sale_date DATE NOT NULL,
  sale_time TIME NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES public.accounts(user_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL
);

-- ============================================================================
-- TABLE: expenses (Enregistrement des dépenses)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES public.accounts(user_id) ON DELETE CASCADE
);

-- ============================================================================
-- TABLE: customers (Base de données clients)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES public.accounts(user_id) ON DELETE CASCADE
);

-- ============================================================================
-- INDEXES (Pour optimiser les performances)
-- ============================================================================
CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX idx_products_user_id ON public.products(user_id);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_sales_user_id ON public.sales(user_id);
CREATE INDEX idx_sales_date ON public.sales(sale_date);
CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX idx_expenses_date ON public.expenses(date);
CREATE INDEX idx_customers_user_id ON public.customers(user_id);

-- ============================================================================
-- TRIGGERS (Mise à jour automatique du timestamp)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER sales_updated_at BEFORE UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- ROW LEVEL SECURITY (Sécurité - Isolation par utilisateur)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- ACCOUNTS POLICIES
CREATE POLICY "Chaque utilisateur peut voir son propre compte"
  ON public.accounts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Chaque utilisateur peut mettre à jour son compte"
  ON public.accounts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- PRODUCTS POLICIES
CREATE POLICY "Chaque utilisateur peut voir ses produits"
  ON public.products
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Chaque utilisateur peut créer ses produits"
  ON public.products
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Chaque utilisateur peut modifier ses produits"
  ON public.products
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Chaque utilisateur peut supprimer ses produits"
  ON public.products
  FOR DELETE
  USING (auth.uid() = user_id);

-- SALES POLICIES
CREATE POLICY "Chaque utilisateur peut voir ses ventes"
  ON public.sales
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Chaque utilisateur peut créer ses ventes"
  ON public.sales
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Chaque utilisateur peut modifier ses ventes"
  ON public.sales
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Chaque utilisateur peut supprimer ses ventes"
  ON public.sales
  FOR DELETE
  USING (auth.uid() = user_id);

-- EXPENSES POLICIES
CREATE POLICY "Chaque utilisateur peut voir ses dépenses"
  ON public.expenses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Chaque utilisateur peut créer ses dépenses"
  ON public.expenses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Chaque utilisateur peut modifier ses dépenses"
  ON public.expenses
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Chaque utilisateur peut supprimer ses dépenses"
  ON public.expenses
  FOR DELETE
  USING (auth.uid() = user_id);

-- CUSTOMERS POLICIES
CREATE POLICY "Chaque utilisateur peut voir ses clients"
  ON public.customers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Chaque utilisateur peut créer ses clients"
  ON public.customers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Chaque utilisateur peut modifier ses clients"
  ON public.customers
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Chaque utilisateur peut supprimer ses clients"
  ON public.customers
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- REPLICATION (Pour Real-Time Subscriptions dans l'app)
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;

-- ============================================================================
-- FIN DU SCHEMA
-- ============================================================================

-- Notes de configuration:
-- 1. Toutes les devises sont en FCFA uniquement
-- 2. Chaque utilisateur ne voit que ses données (RLS actif)
-- 3. Les timestamps sont mis à jour automatiquement
-- 4. Real-Time synchronisation activée pour toutes les tables
-- 5. Aucun système de conversion de devise - FCFA partout
