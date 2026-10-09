/*
# Add more products so each seller has a catalog
*/

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

  INSERT INTO products (code, name, price, deposit, stock, image, category, seller_id) VALUES
    ('S2', 'Ensemble Wax Premium',    18000, 2000, 4, '👗', 'vetements', s_silk),
    ('S3', 'Robe Soirée Noire',       22000, 3000, 2, '👠', 'vetements', s_silk),
    ('S4', 'Top Satin Blanc',          8000, 1000, 6, '👕', 'vetements', s_silk),
    ('F2', 'Veste Jean Vintage',      12000, 1500, 3, '👖', 'friperie', s_frip),
    ('F3', 'Sneakers Nike Import',    20000, 2000, 2, '👟', 'friperie', s_frip),
    ('F4', 'Pull Oversize Zara',       9000, 1000, 5, '👕', 'friperie', s_frip),
    ('BB1', 'Crème Karité Naturelle',  6000, 500,  8, '🧴', 'cosmetiques', s_bio),
    ('BB2', 'Masque Visage Argile',    4000, 500,  10, '🧴', 'cosmetiques', s_bio),
    ('BB3', 'Huile de Coco Bio',       5000, 500,  6, '🧴', 'cosmetiques', s_bio),
    ('BB4', 'Sérum Éclat Vitamine C', 10000, 1000, 3, '💅', 'cosmetiques', s_bio),
    ('CF1', 'Attieké Poisson Braisé',  3000, 500,  15, '🐟', 'nourriture', s_food),
    ('CF2', 'Alloco + Sauce',          1500, 500,  20, '🍌', 'nourriture', s_food),
    ('CF3', 'Riz Sauce Arachide',      3500, 500,  12, '🥘', 'nourriture', s_food),
    ('CE1', 'Sandwich Poulet',         2500, 500,  10, '🥪', 'nourriture', s_coco),
    ('CE2', 'Wrap Thon Salade',        3000, 500,  8,  '🌯', 'nourriture', s_coco),
    ('CE3', 'Petit Déj Complet',       2000, 500,  12, '☕', 'nourriture', s_coco),
    ('G1',  'Palette Fard 12 Couleurs',7000, 1000, 4, '🎨', 'cosmetiques', s_glow)
  ON CONFLICT (code) DO NOTHING;
END $$;
