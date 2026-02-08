-- ============================================
-- Migration: Ajouter support multi-devise par compte
-- ============================================

-- Ajouter colonne preferred_currency à la table accounts
ALTER TABLE accounts 
ADD COLUMN preferred_currency VARCHAR(3) DEFAULT 'USD' NOT NULL;

-- Ajouter colonne currency_code aux tables de données pour traçabilité
ALTER TABLE products 
ADD COLUMN currency_code VARCHAR(3) DEFAULT 'USD' NOT NULL;

ALTER TABLE sales 
ADD COLUMN currency_code VARCHAR(3) DEFAULT 'USD' NOT NULL;

ALTER TABLE expenses 
ADD COLUMN currency_code VARCHAR(3) DEFAULT 'USD' NOT NULL;

-- Ajouter colonne pour les prix de base en USD (pour reconversion)
ALTER TABLE products 
ADD COLUMN base_purchase_price DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN base_selling_price DECIMAL(12, 2) DEFAULT 0;

-- Mettre à jour les valeurs existantes
UPDATE products SET base_purchase_price = unit_price WHERE base_purchase_price = 0;
UPDATE products SET base_selling_price = selling_price WHERE base_selling_price = 0;

-- Index pour les requêtes par devise
CREATE INDEX idx_accounts_preferred_currency ON accounts(preferred_currency);
CREATE INDEX idx_products_currency_code ON products(currency_code);
CREATE INDEX idx_sales_currency_code ON sales(currency_code);
CREATE INDEX idx_expenses_currency_code ON expenses(currency_code);

-- Comment pour documentation
COMMENT ON COLUMN accounts.preferred_currency 
IS 'Devise préférée de l''utilisateur (USD, EUR, XAF, etc.)';

COMMENT ON COLUMN products.currency_code 
IS 'Devise de stockage pour ce produit';

COMMENT ON COLUMN products.base_purchase_price 
IS 'Prix d''achat de base pour reconversion';

COMMENT ON COLUMN products.base_selling_price 
IS 'Prix de vente de base pour reconversion';
