/*
# LiveCart Express — Database Schema & Seed Data

## Overview
Creates the full data layer for the LiveCart Express seller dashboard: products, 
flash reservations, wallet transactions, and the seller's wallet. Seeds realistic 
demo data reflecting the Abidjan live-shopping context (FCFA amounts, local communes, 
Ivorian phone numbers, Mobile Money providers).

## New Tables

### products
Items sold during live streams. Each has a short code (e.g. "A1") called out on air,
a price and deposit in FCFA, stock count, an emoji image, and an active flag.

### reservations
Flash reservations created when a buyer blocks an item for 10 minutes. Tracks the
buyer's phone, delivery commune, OTP, status lifecycle (pending → confirmed → delivered
or expired/cancelled), price, deposit, and expiry timestamp.

### transactions
Wallet ledger entries. Types: 'deposit' (buyer acompte), 'sale' (final payment),
'withdrawal' (seller cash-out via Mobile Money), 'commission' (platform fee).
Positive amounts = credits, negative = debits.

### wallet
Single-row table holding the seller's current balance, lifetime earnings, and total
withdrawn. Updated atomically when transactions are created.

## Security
- RLS enabled on all tables.
- Single-tenant prototype (no auth) → policies allow anon + authenticated full CRUD.
- USING (true) is intentional: all data is shared/public in this prototype context.

## Important Notes
1. Seed data is guarded by existence checks — safe to re-run.
2. All amounts are integers in FCFA (no decimals).
3. Phone numbers use Ivorian format (10 digits, 07/05/01 prefixes).
4. Communes reflect Abidjan: Cocody, Yopougon, Marcory, Plateau, Treichville, Abobo.
*/

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  price integer NOT NULL CHECK (price > 0),
  deposit integer NOT NULL DEFAULT 1500 CHECK (deposit >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image text DEFAULT '📦',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  phone text NOT NULL,
  zone text NOT NULL,
  otp text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'delivered', 'expired', 'cancelled')),
  price integer NOT NULL,
  deposit integer NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL
    CHECK (type IN ('deposit', 'sale', 'withdrawal', 'commission')),
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending', 'completed', 'failed')),
  description text,
  reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
  provider text,
  phone text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  balance integer NOT NULL DEFAULT 0,
  total_earned integer NOT NULL DEFAULT 0,
  total_withdrawn integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_reservations_product ON reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_created ON reservations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet ENABLE ROW LEVEL SECURITY;

-- Products: full CRUD for anon + authenticated (single-tenant prototype)
DROP POLICY IF EXISTS "anon_select_products" ON products;
CREATE POLICY "anon_select_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_products" ON products;
CREATE POLICY "anon_insert_products" ON products FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_products" ON products;
CREATE POLICY "anon_update_products" ON products FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_products" ON products;
CREATE POLICY "anon_delete_products" ON products FOR DELETE
  TO anon, authenticated USING (true);

-- Reservations: full CRUD
DROP POLICY IF EXISTS "anon_select_reservations" ON reservations;
CREATE POLICY "anon_select_reservations" ON reservations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_reservations" ON reservations;
CREATE POLICY "anon_insert_reservations" ON reservations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_reservations" ON reservations;
CREATE POLICY "anon_update_reservations" ON reservations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_reservations" ON reservations;
CREATE POLICY "anon_delete_reservations" ON reservations FOR DELETE
  TO anon, authenticated USING (true);

-- Transactions: full CRUD
DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
CREATE POLICY "anon_select_transactions" ON transactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
CREATE POLICY "anon_insert_transactions" ON transactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
CREATE POLICY "anon_update_transactions" ON transactions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;
CREATE POLICY "anon_delete_transactions" ON transactions FOR DELETE
  TO anon, authenticated USING (true);

-- Wallet: full CRUD
DROP POLICY IF EXISTS "anon_select_wallet" ON wallet;
CREATE POLICY "anon_select_wallet" ON wallet FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_wallet" ON wallet;
CREATE POLICY "anon_insert_wallet" ON wallet FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_wallet" ON wallet;
CREATE POLICY "anon_update_wallet" ON wallet FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_wallet" ON wallet;
CREATE POLICY "anon_delete_wallet" ON wallet FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- SEED DATA
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM products) THEN
    INSERT INTO products (code, name, price, deposit, stock, image, is_active) VALUES
      ('A1', 'Robe Rouge Silk',       10000, 1500, 3,  '👗', true),
      ('B2', 'Sac Croco Noir',        15000, 1500, 1,  '👜', true),
      ('C3', 'Mèches Brazilian 30"',   8000, 1000, 5,  '💇‍♀️', true),
      ('D4', 'Rouge à Lèvres Matte',   5000, 500,  0,  '💄', true),
      ('E5', 'Attieké Poulet',         2000, 500,  10, '🍽️', true),
      ('F6', 'Fond de teint Fenty',   12000, 1500, 2,  '🎨', true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM wallet) THEN
    INSERT INTO wallet (balance, total_earned, total_withdrawn) VALUES (125000, 185000, 60000);
  END IF;
END $$;

-- Seed reservations only if none exist
DO $$
DECLARE
  p_a1 uuid; p_b2 uuid; p_c3 uuid; p_d4 uuid; p_e5 uuid; p_f6 uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM reservations) THEN
    SELECT id INTO p_a1 FROM products WHERE code = 'A1';
    SELECT id INTO p_b2 FROM products WHERE code = 'B2';
    SELECT id INTO p_c3 FROM products WHERE code = 'C3';
    SELECT id INTO p_d4 FROM products WHERE code = 'D4';
    SELECT id INTO p_e5 FROM products WHERE code = 'E5';
    SELECT id INTO p_f6 FROM products WHERE code = 'F6';

    INSERT INTO reservations (product_id, phone, zone, otp, status, price, deposit, expires_at, created_at) VALUES
      (p_a1, '0701234567', 'Cocody',     '4821', 'delivered', 10000, 1500, now() - interval '6 days 23:50', now() - interval '6 days'),
      (p_b2, '0544789012', 'Marcory',    '3920', 'delivered', 15000, 1500, now() - interval '5 days 23:50', now() - interval '5 days'),
      (p_c3, '0123456789', 'Yopougon',   '5743', 'delivered',  8000, 1000, now() - interval '4 days 23:50', now() - interval '4 days'),
      (p_a1, '0788765432', 'Plateau',    '1287', 'confirmed', 10000, 1500, now() - interval '3 days 23:50', now() - interval '3 days'),
      (p_f6, '0500112233', 'Cocody',     '6534', 'delivered', 12000, 1500, now() - interval '2 days 23:50', now() - interval '2 days'),
      (p_e5, '0700998877', 'Treichville','2048', 'delivered',  2000,  500, now() - interval '1 day 23:50',  now() - interval '1 day'),
      (p_c3, '0144556677', 'Abobo',      '8912', 'expired',    8000, 1000, now() - interval '1 day 23:50',  now() - interval '1 day'),
      (p_b2, '0777334455', 'Marcory',    '3367', 'cancelled', 15000, 1500, now() - interval '20 hours',     now() - interval '20 hours'),
      (p_f6, '0500223344', 'Yopougon',   '7745', 'delivered', 12000, 1500, now() - interval '10 hours',     now() - interval '10 hours'),
      (p_e5, '0711223344', 'Plateau',    '5519', 'delivered',  2000,  500, now() - interval '5 hours',      now() - interval '5 hours'),
      (p_d4, '0708855443', 'Cocody',     '9023', 'delivered',  5000,  500, now() - interval '2 hours',      now() - interval '2 hours'),
      (p_a1, '0144332211', 'Marcory',    '6678', 'pending',   10000, 1500, now() + interval '8 minutes',    now() - interval '2 minutes');
  END IF;
END $$;

-- Seed transactions only if none exist
DO $$
DECLARE
  r1 uuid; r2 uuid; r3 uuid; r4 uuid; r5 uuid; r6 uuid; r7 uuid; r8 uuid; r9 uuid; r10 uuid; r11 uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM transactions) THEN
    SELECT id INTO r1  FROM reservations WHERE otp = '4821';
    SELECT id INTO r2  FROM reservations WHERE otp = '3920';
    SELECT id INTO r3  FROM reservations WHERE otp = '5743';
    SELECT id INTO r4  FROM reservations WHERE otp = '1287';
    SELECT id INTO r5  FROM reservations WHERE otp = '6534';
    SELECT id INTO r6  FROM reservations WHERE otp = '2048';
    SELECT id INTO r7  FROM reservations WHERE otp = '8912';
    SELECT id INTO r8  FROM reservations WHERE otp = '3367';
    SELECT id INTO r9  FROM reservations WHERE otp = '7745';
    SELECT id INTO r10 FROM reservations WHERE otp = '5519';
    SELECT id INTO r11 FROM reservations WHERE otp = '9023';

    INSERT INTO transactions (type, amount, status, description, reservation_id, provider, phone, created_at) VALUES
      ('deposit',     1500, 'completed', 'Acompte - Robe Rouge Silk (A1)',          r1,  NULL, NULL, now() - interval '6 days'),
      ('sale',        8500, 'completed', 'Solde - Robe Rouge Silk (A1)',             r1,  NULL, NULL, now() - interval '6 days 23:55'),
      ('deposit',     1500, 'completed', 'Acompte - Sac Croco Noir (B2)',            r2,  NULL, NULL, now() - interval '5 days'),
      ('sale',       13500, 'completed', 'Solde - Sac Croco Noir (B2)',              r2,  NULL, NULL, now() - interval '5 days 23:55'),
      ('deposit',     1000, 'completed', 'Acompte - Mèches Brazilian 30" (C3)',      r3,  NULL, NULL, now() - interval '4 days'),
      ('sale',        7000, 'completed', 'Solde - Mèches Brazilian 30" (C3)',        r3,  NULL, NULL, now() - interval '4 days 23:55'),
      ('deposit',     1500, 'completed', 'Acompte - Robe Rouge Silk (A1)',           r4,  NULL, NULL, now() - interval '3 days'),
      ('deposit',     1500, 'completed', 'Acompte - Fond de teint Fenty (F6)',       r5,  NULL, NULL, now() - interval '2 days'),
      ('sale',       10500, 'completed', 'Solde - Fond de teint Fenty (F6)',         r5,  NULL, NULL, now() - interval '2 days 23:55'),
      ('deposit',      500, 'completed', 'Acompte - Attieké Poulet (E5)',            r6,  NULL, NULL, now() - interval '1 day'),
      ('sale',        1500, 'completed', 'Solde - Attieké Poulet (E5)',              r6,  NULL, NULL, now() - interval '1 day 23:55'),
      ('deposit',     1500, 'completed', 'Acompte - Fond de teint Fenty (F6)',       r9,  NULL, NULL, now() - interval '10 hours'),
      ('sale',       10500, 'completed', 'Solde - Fond de teint Fenty (F6)',         r9,  NULL, NULL, now() - interval '9 hours'),
      ('deposit',      500, 'completed', 'Acompte - Attieké Poulet (E5)',            r10, NULL, NULL, now() - interval '5 hours'),
      ('sale',        1500, 'completed', 'Solde - Attieké Poulet (E5)',              r10, NULL, NULL, now() - interval '4 hours'),
      ('deposit',      500, 'completed', 'Acompte - Rouge à Lèvres Matte (D4)',      r11, NULL, NULL, now() - interval '2 hours'),
      ('withdrawal',-30000, 'completed', 'Retrait Wave',                             NULL, 'wave',         '0701234567', now() - interval '3 days'),
      ('withdrawal',-30000, 'completed', 'Retrait Orange Money',                     NULL, 'orange_money', '0701234567', now() - interval '1 day'),
      ('commission', -2000, 'completed', 'Commission plateforme - 5 ventes',          NULL, NULL, NULL, now() - interval '3 days'),
      ('commission', -1500, 'completed', 'Commission plateforme - 3 ventes',          NULL, NULL, NULL, now() - interval '1 day');
  END IF;
END $$;
