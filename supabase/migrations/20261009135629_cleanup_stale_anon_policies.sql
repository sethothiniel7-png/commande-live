/*
# Clean up stale anon policies after auth migration

## Overview
The original schema created permissive anon policies (USING true) on all
tables. The add_seller_auth migration added restrictive authenticated
policies but did NOT drop all the old anon INSERT/UPDATE/DELETE policies.
In PostgreSQL, multiple permissive policies for the same command are OR'd
together, so the old USING(true) policies bypassed the new ownership checks.

## Security Changes
- sellers: drop stale anon INSERT/UPDATE/DELETE (keep anon SELECT for public
  profiles). The auth_* policies already cover owner-only mutations.
- products: drop stale anon INSERT/DELETE (keep anon SELECT for browsing and
  anon UPDATE for stock decrement during reservations).
- reservations: drop stale anon SELECT/UPDATE/DELETE (keep anon INSERT so
  buyers can reserve without an account).
- wallet: drop stale anon INSERT/UPDATE/DELETE (keep only auth_* policies —
  wallet is seller-owner only). No anon SELECT either since it was already
  dropped.
- transactions: drop stale anon INSERT/UPDATE/DELETE (keep only auth_*).
  No anon SELECT either since it was already dropped.
*/

-- sellers: keep anon SELECT, drop anon mutations
DROP POLICY IF EXISTS "anon_insert_sellers" ON sellers;
DROP POLICY IF EXISTS "anon_update_sellers" ON sellers;
DROP POLICY IF EXISTS "anon_delete_sellers" ON sellers;

-- products: keep anon SELECT + anon UPDATE (stock decrement), drop anon mutations
DROP POLICY IF EXISTS "anon_insert_products" ON products;
DROP POLICY IF EXISTS "anon_delete_products" ON products;

-- reservations: keep anon INSERT (buyers), drop anon SELECT/UPDATE/DELETE
DROP POLICY IF EXISTS "anon_select_reservations" ON reservations;
DROP POLICY IF EXISTS "anon_update_reservations" ON reservations;
DROP POLICY IF EXISTS "anon_delete_reservations" ON reservations;

-- wallet: drop all remaining anon policies
DROP POLICY IF EXISTS "anon_insert_wallet" ON wallet;
DROP POLICY IF EXISTS "anon_update_wallet" ON wallet;
DROP POLICY IF EXISTS "anon_delete_wallet" ON wallet;

-- transactions: drop all remaining anon policies
DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;
