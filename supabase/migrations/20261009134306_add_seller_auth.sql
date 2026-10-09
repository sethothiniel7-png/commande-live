/*
# Add auth to sellers and secure seller-only data

## Overview
Adds `user_id` to the `sellers` table so each seller account is linked to a
Supabase auth user. Tightens RLS on seller-management tables so only the
authenticated owner can read/write their own data. Public seller profiles
and product listings remain readable by everyone.

## Modified Tables
- sellers: adds `user_id uuid` FK to auth.users.
- products, wallet, transactions, reservations: RLS policy changes only.

## Security Changes
- sellers: public SELECT, authenticated owner INSERT/UPDATE/DELETE.
- products: public SELECT, seller-owner INSERT/UPDATE/DELETE.
- reservations: seller-owner SELECT, anon INSERT (buyers), seller-owner UPDATE/DELETE.
- wallet: seller-owner only all operations.
- transactions: seller-owner only all operations.
*/

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS user_id uuid
  REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sellers_user_id ON sellers(user_id);

-- ============================================================
-- SELLERS RLS
-- ============================================================

ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sellers" ON sellers;
CREATE POLICY "anon_select_sellers" ON sellers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_sellers" ON sellers;
CREATE POLICY "auth_insert_sellers" ON sellers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_update_sellers" ON sellers;
CREATE POLICY "auth_update_sellers" ON sellers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_delete_sellers" ON sellers;
CREATE POLICY "auth_delete_sellers" ON sellers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- PRODUCTS RLS
-- ============================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_products" ON products;
CREATE POLICY "anon_select_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_products" ON products;
CREATE POLICY "auth_insert_products" ON products FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM sellers WHERE sellers.id = products.seller_id AND sellers.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "auth_update_products" ON products;
CREATE POLICY "auth_update_products" ON products FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM sellers WHERE sellers.id = products.seller_id AND sellers.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM sellers WHERE sellers.id = products.seller_id AND sellers.user_id = auth.uid()));

DROP POLICY IF EXISTS "auth_delete_products" ON products;
CREATE POLICY "auth_delete_products" ON products FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM sellers WHERE sellers.id = products.seller_id AND sellers.user_id = auth.uid()));

-- ============================================================
-- RESERVATIONS RLS
-- ============================================================

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_reservations" ON reservations;
DROP POLICY IF EXISTS "auth_select_reservations" ON reservations;
CREATE POLICY "auth_select_reservations" ON reservations FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM sellers WHERE sellers.id = reservations.seller_id AND sellers.user_id = auth.uid()));

DROP POLICY IF EXISTS "anon_insert_reservations" ON reservations;
CREATE POLICY "anon_insert_reservations" ON reservations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_reservations" ON reservations;
CREATE POLICY "auth_update_reservations" ON reservations FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM sellers WHERE sellers.id = reservations.seller_id AND sellers.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM sellers WHERE sellers.id = reservations.seller_id AND sellers.user_id = auth.uid()));

DROP POLICY IF EXISTS "auth_delete_reservations" ON reservations;
CREATE POLICY "auth_delete_reservations" ON reservations FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM sellers WHERE sellers.id = reservations.seller_id AND sellers.user_id = auth.uid()));

-- ============================================================
-- WALLET RLS
-- ============================================================

ALTER TABLE wallet ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_wallet" ON wallet;
DROP POLICY IF EXISTS "auth_select_wallet" ON wallet;
CREATE POLICY "auth_select_wallet" ON wallet FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM sellers WHERE sellers.id = wallet.seller_id AND sellers.user_id = auth.uid()));

DROP POLICY IF EXISTS "auth_insert_wallet" ON wallet;
CREATE POLICY "auth_insert_wallet" ON wallet FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM sellers WHERE sellers.id = wallet.seller_id AND sellers.user_id = auth.uid()));

DROP POLICY IF EXISTS "auth_update_wallet" ON wallet;
CREATE POLICY "auth_update_wallet" ON wallet FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM sellers WHERE sellers.id = wallet.seller_id AND sellers.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM sellers WHERE sellers.id = wallet.seller_id AND sellers.user_id = auth.uid()));

DROP POLICY IF EXISTS "auth_delete_wallet" ON wallet;
CREATE POLICY "auth_delete_wallet" ON wallet FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM sellers WHERE sellers.id = wallet.seller_id AND sellers.user_id = auth.uid()));

-- ============================================================
-- TRANSACTIONS RLS
-- ============================================================

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
DROP POLICY IF EXISTS "auth_select_transactions" ON transactions;
CREATE POLICY "auth_select_transactions" ON transactions FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM sellers WHERE sellers.id = transactions.seller_id AND sellers.user_id = auth.uid()));

DROP POLICY IF EXISTS "auth_insert_transactions" ON transactions;
CREATE POLICY "auth_insert_transactions" ON transactions FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM sellers WHERE sellers.id = transactions.seller_id AND sellers.user_id = auth.uid()));

DROP POLICY IF EXISTS "auth_update_transactions" ON transactions;
CREATE POLICY "auth_update_transactions" ON transactions FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM sellers WHERE sellers.id = transactions.seller_id AND sellers.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM sellers WHERE sellers.id = transactions.seller_id AND sellers.user_id = auth.uid()));

DROP POLICY IF EXISTS "auth_delete_transactions" ON transactions;
CREATE POLICY "auth_delete_transactions" ON transactions FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM sellers WHERE sellers.id = transactions.seller_id AND sellers.user_id = auth.uid()));
