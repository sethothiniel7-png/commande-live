/*
# Add category column to products

1. Modified Tables
- products: adds `category` text column with CHECK constraint limiting to
  'vetements', 'cosmetiques', 'nourriture', 'accessoires', 'autre'.
  Defaults to 'autre'. Backfills existing rows based on their names.
2. Security
- No RLS changes needed (existing policies cover the new column).
*/

ALTER TABLE products ADD COLUMN IF NOT EXISTS category text
  NOT NULL DEFAULT 'autre'
  CHECK (category IN ('vetements', 'cosmetiques', 'nourriture', 'accessoires', 'autre'));

UPDATE products SET category = 'vetements' WHERE code IN ('A1', 'B2') AND category = 'autre';
UPDATE products SET category = 'cosmetiques' WHERE code IN ('C3', 'D4', 'F6') AND category = 'autre';
UPDATE products SET category = 'nourriture' WHERE code = 'E5' AND category = 'autre';
