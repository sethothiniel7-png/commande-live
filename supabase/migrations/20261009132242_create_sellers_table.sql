/*
# Multi-seller schema for LiveCart Express

## Overview
Adds a `sellers` table so each vendor has a public profile page (linkable from TikTok).
Products, reservations, transactions, and wallet are all scoped per-seller.

## New Tables
### sellers
Public vendor profile. `handle` is the URL slug used in /s/[handle] links from TikTok.
`tiktok_url` links back to the vendor's TikTok account. `category` is their specialty.

## Modified Tables
- products: adds `seller_id` FK (nullable for backward compat, backfilled to first seller)
- reservations: adds `seller_id` FK
- transactions: adds `seller_id` FK
- wallet: adds `seller_id` FK, drops the single-row assumption

## Security
- RLS enabled on sellers table with full CRUD for anon + authenticated (prototype, no auth).
- Existing RLS policies on other tables remain valid — the new column is covered.

## Data Safety
- No columns dropped or renamed. All new columns are nullable with safe defaults.
- Existing data is backfilled to the first seed seller.
*/

-- ============================================================
-- SELLERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL
    CHECK (category IN ('vetements', 'cosmetiques', 'nourriture', 'friperie', 'accessoires', 'autre')),
  avatar text DEFAULT '🏪',
  bio text,
  phone text,
  tiktok_url text,
  is_live boolean DEFAULT false,
  followers integer DEFAULT 0,
  rating numeric(2,1) DEFAULT 5.0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sellers" ON sellers;
CREATE POLICY "anon_select_sellers" ON sellers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sellers" ON sellers;
CREATE POLICY "anon_insert_sellers" ON sellers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sellers" ON sellers;
CREATE POLICY "anon_update_sellers" ON sellers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sellers" ON sellers;
CREATE POLICY "anon_delete_sellers" ON sellers FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- ADD seller_id TO EXISTING TABLES
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES sellers(id) ON DELETE SET NULL;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES sellers(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES sellers(id) ON DELETE SET NULL;
ALTER TABLE wallet ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES sellers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_reservations_seller ON reservations(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_wallet_seller ON wallet(seller_id);

-- ============================================================
-- SEED SELLERS
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM sellers) THEN
    INSERT INTO sellers (handle, name, category, avatar, bio, phone, tiktok_url, is_live, followers, rating) VALUES
      ('mami_frip',    'Mami Frip',        'friperie',   '👗', 'Friperie premium — robes, vestes, sneakers importés. Live tous les soirs 19h !', '0701234567', 'https://www.tiktok.com/@mami_frip', true,  12400, 4.8),
      ('beaute_bio',   'Beauté Bio CI',    'cosmetiques','💄', 'Cosmétiques naturels et importés. Maquillage, soins, parfums. Cocody Livraison.', '0544789012', 'https://www.tiktok.com/@beaute_bio_ci', true, 8900, 4.9),
      ('cherie_food',  'Chérie Food',      'nourriture', '🍽️', 'Plats maison livrés chauds ! Attiéké, alloco, riz sauce. Yopougon et alentours.',  '0123456789', 'https://www.tiktok.com/@cherie_food', true, 6700, 4.7),
      ('silklady',     'Silk Lady',        'vetements',  '👠', 'Robes élégantes, soie et wax premium. Pour la femme qui sait ce qu''elle veut.',   '0788765432', 'https://www.tiktok.com/@silk_lady', false, 15200, 4.9),
      ('glow_up_ci',   'Glow Up CI',       'cosmetiques','💅', 'Tout pour ta beauté : mèches, fonds de teint, rouges à lèvres. Live every day !',  '0500112233', 'https://www.tiktok.com/@glow_up_ci', true, 9800, 4.6),
      ('coco_eats',    'Coco Eats',        'nourriture', '🥘', 'Cuisine rapide et saine. Sandwichs, wraps, petits-déj. Cocody et Plateau.',         '0700998877', 'https://www.tiktok.com/@coco_eats', false, 4300, 4.5);
  END IF;
END $$;

-- ============================================================
-- BACKFILL seller_id ON EXISTING DATA
-- ============================================================

DO $$
DECLARE
  s_frip uuid; s_bio uuid; s_food uuid; s_silk uuid; s_glow uuid; s_coco uuid;
BEGIN
  SELECT id INTO s_frip  FROM sellers WHERE handle = 'mami_frip';
  SELECT id INTO s_bio   FROM sellers WHERE handle = 'beaute_bio';
  SELECT id INTO s_food  FROM sellers WHERE handle = 'cherie_food';
  SELECT id INTO s_silk  FROM sellers WHERE handle = 'silklady';
  SELECT id INTO s_glow  FROM sellers WHERE handle = 'glow_up_ci';
  SELECT id INTO s_coco  FROM sellers WHERE handle = 'coco_eats';

  -- Assign products to sellers based on category/code
  UPDATE products SET seller_id = s_silk WHERE code = 'A1' AND seller_id IS NULL;  -- Robe Rouge Silk
  UPDATE products SET seller_id = s_frip WHERE code = 'B2' AND seller_id IS NULL;  -- Sac Croco Noir (friperie accessory)
  UPDATE products SET seller_id = s_glow WHERE code = 'C3' AND seller_id IS NULL;  -- Mèches Brazilian
  UPDATE products SET seller_id = s_glow WHERE code = 'D4' AND seller_id IS NULL;  -- Rouge à Lèvres
  UPDATE products SET seller_id = s_food WHERE code = 'E5' AND seller_id IS NULL;  -- Attiéké Poulet
  UPDATE products SET seller_id = s_bio  WHERE code = 'F6' AND seller_id IS NULL;  -- Fond de teint Fenty

  -- Assign reservations to match their product's seller
  UPDATE reservations r SET seller_id = p.seller_id
    FROM products p WHERE r.product_id = p.id AND r.seller_id IS NULL;

  -- Assign transactions to match their reservation's seller
  UPDATE transactions t SET seller_id = r.seller_id
    FROM reservations r WHERE t.reservation_id = r.id AND t.seller_id IS NULL;

  -- Unlinked transactions (withdrawals, commissions) → first seller
  UPDATE transactions SET seller_id = s_frip WHERE seller_id IS NULL;

  -- Wallet: assign existing row to first seller, then create wallets for others
  UPDATE wallet SET seller_id = s_frip WHERE seller_id IS NULL;

  -- Create wallet rows for all other sellers
  INSERT INTO wallet (seller_id, balance, total_earned, total_withdrawn)
  SELECT s.id, 75000, 95000, 20000
    FROM sellers s
    WHERE s.id NOT IN (SELECT seller_id FROM wallet WHERE seller_id IS NOT NULL)
  ON CONFLICT DO NOTHING;
END $$;
