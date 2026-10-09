/*
# Allow anon to update product stock for reservations

## Overview
The reservation flow requires the buyer (unauthenticated/anon) to decrement
product stock when reserving. The auth migration locked product UPDATE to
authenticated sellers only, breaking the buyer flow.

## Security Changes
- products UPDATE: drop the seller-only update policy, recreate as
  anon + authenticated. INSERT and DELETE remain seller-owner-only.
*/

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_update_products" ON products;
DROP POLICY IF EXISTS "anon_update_products" ON products;
CREATE POLICY "anon_update_products" ON products FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);
