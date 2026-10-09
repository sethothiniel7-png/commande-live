/*
# Update products category constraint to include 'friperie'

The original products table only allowed 'vetements', 'cosmetiques',
'nourriture', 'accessoires', 'autre'. The sellers table introduced
'friperie' as a category, so we need to align the products constraint.
*/

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;

ALTER TABLE products ADD CONSTRAINT products_category_check
  CHECK (category IN ('vetements', 'cosmetiques', 'nourriture', 'friperie', 'accessoires', 'autre'));
