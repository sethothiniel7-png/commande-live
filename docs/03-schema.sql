-- =====================================================================
-- LiveShop — schéma de base de données (v0.2)
-- Source de vérité du modèle de données. Écrit à la main, pas généré.
--
-- CHANGEMENTS v0.1 -> v0.2 (après entretien terrain du 13/11)
--  1. Le solde est payé À LA LIVRAISON, pas à la commande. Le schéma
--     ne représentait que l'acompte : il manquait la moitié de l'argent.
--  2. Le livreur peut encaisser le solde en espèces. Il est donc un
--     agent d'encaissement : il faut tracer qui détient l'argent.
--  3. OTP de livraison : la cliente donne un code au livreur, ce qui
--     prouve la remise sans signature papier.
--  4. L'acompte est défini PAR PRODUIT, pas par vendeuse (un téléphone
--     et un pot de miel n'ont pas le même acompte).
--  5. Code produit court et dictable, pour que la cliente puisse le
--     citer avec sa capture d'écran.
--  6. La table "wallet" de l'ancien schéma est SUPPRIMÉE : détenir
--     l'argent des vendeuses exige un agrément BCEAO. Interdit en v1.
--
-- PRINCIPES INCHANGÉS
--  - L'argent est un ENTIER en FCFA. Jamais de flottant.
--  - Le registre est la vérité : on ne supprime jamais une commande,
--    on la change de statut.
--  - Le stock ne peut pas devenir négatif : garanti par la base.
--  - La réputation est dérivée du registre, jamais déclarative.
-- =====================================================================

-- ---------------------------------------------------------------------
-- TYPES
-- ---------------------------------------------------------------------

-- Cycle de vie d'une commande, du point de vue du terrain ivoirien.
create type order_status as enum (
  'en_attente_acompte',  -- réservée, la cliente n'a rien envoyé
  'acompte_declare',     -- la cliente dit avoir envoyé l'acompte
  'acompte_confirme',    -- la vendeuse a vérifié son Wave/OM et confirme
  'en_livraison',        -- colis remis au livreur
  'livree_payee',        -- remis à la cliente, solde encaissé. Terminé.
  'annulee',             -- annulée avant remise, stock restitué
  'litige'               -- contestation ouverte
);

-- Nature du versement. La distinction est essentielle : ce ne sont
-- pas les mêmes preuves ni les mêmes acteurs.
create type payment_kind as enum (
  'acompte',   -- avant expédition, obligatoire pour réserver
  'solde'      -- à la remise, le complément
);

-- Comment le paiement a eu lieu. Détermine ce qui constitue une preuve.
create type balance_method as enum (
  'wave',
  'orange_money',
  'mtn_momo',
  'moov_money',
  'especes_livreur',   -- le livreur encaisse et reverse à la vendeuse
  'especes_vendeuse',  -- remise en main propre
  'virement'
);

create type dispute_opener as enum ('client', 'vendeuse');
create type dispute_status as enum ('ouvert', 'en_cours', 'resolu', 'rejete');

-- ---------------------------------------------------------------------
-- VENDEUSES
-- L'identité technique (email, mot de passe) est gérée par Supabase Auth.
-- Un compte = une boutique en v1 (décision assumée).
-- ---------------------------------------------------------------------
create table vendors (
  id            uuid primary key references auth.users(id) on delete cascade,
  shop_name     text not null check (length(trim(shop_name)) between 2 and 60),
  -- slug = ce qui apparaît dans le lien public : /s/awa-boutique
  slug          text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{1,38})[a-z0-9]$'),
  whatsapp_e164 text not null check (whatsapp_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  city          text not null default 'Abidjan',
  created_at    timestamptz not null default now(),
  -- désactivation plutôt que suppression : l'historique doit survivre
  is_active     boolean not null default true
);

-- ---------------------------------------------------------------------
-- Type : état de l'article
-- L'occasion est massive sur TikTok en Côte d'Ivoire (téléphones, friperie,
-- électroménager). Sans ce champ, la cliente ne sait pas ce qu'elle achète,
-- et un litige "ce n'est pas du neuf" est indéfendable.
create type item_condition as enum ('neuf', 'occasion', 'reconditionne');

-- ---------------------------------------------------------------------
-- PRODUITS
-- deposit_fcfa : acompte exigé pour ce produit. La vendeuse fixe librement
-- le montant : en pratique 2 000 ou 5 000 F selon la valeur de l'article,
-- parfois 0 (dans ce cas elle prend le risque d'une cliente fantôme).
-- C'est SON choix, pas une politique de la plateforme.
-- ---------------------------------------------------------------------
create table products (
  id          uuid primary key default gen_random_uuid(),
  vendor_id   uuid not null references vendors(id) on delete cascade,
  -- code court, lisible au téléphone et sur une capture d'écran. Ex: WAX-24
  -- unique PAR vendeuse, pas globalement
  code        text not null check (code ~ '^[A-Z0-9-]{2,12}$'),
  name        text not null check (length(trim(name)) between 2 and 100),
  description text,
  price_fcfa  integer not null check (price_fcfa > 0),
  -- prix barré optionnel
  compare_at_fcfa integer check (compare_at_fcfa is null or compare_at_fcfa > price_fcfa),
  -- acompte exigé pour ce produit. La vendeuse fixe librement le montant :
  -- en pratique 2 000 ou 5 000 F selon la valeur de l'article, parfois 0.
  -- CORRECTION v0.2.1 : la contrainte "max tiers du prix" a été RETIRÉE.
  -- Elle encodait une préférence produit, pas un invariant métier, et aurait
  -- bloqué le cas courant (2 000 F d'acompte sur un pot de miel à 7 500 F
  -- représente 27 %, ce qui est normal sur le terrain).
  -- Seul invariant conservé : l'acompte ne peut pas dépasser le prix.
  deposit_fcfa integer not null default 0 check (deposit_fcfa >= 0),
  stock       integer not null default 0 check (stock >= 0),
  image_path  text,

  -- CLASSIFICATION. Texte libre volontairement : une liste fermée obligerait
  -- à une migration à chaque nouveau type d'article vendu en live.
  category    text not null default 'autre',
  condition   item_condition not null default 'neuf',
  -- variante libre affichée au client : "Taille M", "Couleur rouge", "Lot x3".
  -- DÉCISION v0.2.2 : on n'implémente PAS de vrai système de variantes avec
  -- stock par taille en v1 (voir adr/0004-variantes.md). La vendeuse crée
  -- un produit par taille, distingué par son code (WAX-24-M, WAX-24-L).
  variant_label text,

  -- ALIMENTAIRE ET COSMÉTIQUE
  -- expires_at : date de péremption, NULL pour les articles non périssables.
  -- Sert à afficher un avertissement à la cliente et à bloquer la vente
  -- d'un produit déjà périmé (contrôlé dans place_order).
  expires_at  date,
  -- périssable : impose une livraison rapide. Pilote l'interface vendeuse
  -- ("ce produit doit partir aujourd'hui") et le tri des commandes.
  perishable  boolean not null default false,

  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint deposit_lte_price check (deposit_fcfa <= price_fcfa),
  constraint product_code_unique_per_vendor unique (vendor_id, code),
  -- un produit périssable sans date de péremption est inexploitable
  constraint perishable_requires_expiry check (not perishable or expires_at is not null)
);

create index products_vendor_active_idx on products (vendor_id, is_active) where is_active;
-- recherche par code : la vendeuse tape "WAX-24" pour retrouver un produit
create index products_vendor_code_idx on products (vendor_id, code);

-- ---------------------------------------------------------------------
-- LIVREURS
-- Répertoire par vendeuse. On ne crée pas de compte pour eux en v1 :
-- ils n'ont pas d'application, ils travaillent au téléphone.
-- Ce répertoire sert à deux choses : contacter le livreur, et mesurer
-- ensuite lequel pose problème.
-- ---------------------------------------------------------------------
create table couriers (
  id            uuid primary key default gen_random_uuid(),
  vendor_id     uuid not null references vendors(id) on delete cascade,
  name          text not null check (length(trim(name)) between 2 and 60),
  phone_e164    text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  is_active     boolean not null default true,
  note          text,
  created_at    timestamptz not null default now(),
  -- même numéro utilisable par deux vendeuses, mais pas deux fois chez la même
  constraint courier_unique_per_vendor unique (vendor_id, phone_e164)
);

create index couriers_vendor_idx on couriers (vendor_id) where is_active;

-- ---------------------------------------------------------------------
-- SESSIONS DE LIVE
-- Le différenciateur du produit : la vente a un début et une fin.
-- DÉCISION : la boutique existe TOUJOURS. Le live est un MODE, pas une
-- condition d'accès. Si une vendeuse oublie de le démarrer, elle ne perd
-- aucune commande — c'est le seul comportement acceptable.
--
-- Ce que ça permet et que rien d'autre ne permet :
--  - afficher "EN DIRECT" et une vraie urgence (l'offre s'arrête vraiment)
--  - donner à la vendeuse le chiffre qu'elle n'a jamais : "ce live a
--    rapporté X F en Y minutes"
--  - savoir quels articles se vendent pendant le direct et lesquels après
-- ---------------------------------------------------------------------
create type live_session_status as enum ('en_cours', 'terminee');

create table live_sessions (
  id          uuid primary key default gen_random_uuid(),
  vendor_id   uuid not null references vendors(id) on delete cascade,
  title       text not null check (length(trim(title)) between 2 and 100),
  status      live_session_status not null default 'en_cours',
  -- "offre du live" : à la fin de la session, ce drapeau retombe.
  -- Il ne modifie AUCUN prix en v1 (les prix sont déjà copiés à la commande),
  -- il pilote uniquement l'affichage et l'urgence côté client.
  has_live_offer boolean not null default true,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  constraint ended_requires_end_at check (status <> 'terminee' or ended_at is not null),
  constraint end_after_start check (ended_at is null or ended_at > started_at)
);

create index live_sessions_vendor_idx on live_sessions (vendor_id, started_at desc);
-- une seule session en cours par vendeuse, garanti par la base et pas par l'UI
create unique index live_sessions_one_active_idx
  on live_sessions (vendor_id) where status = 'en_cours';

-- ---------------------------------------------------------------------
-- COMMANDES
-- Le fil complet : réservation -> acompte -> livreur -> remise -> solde.
-- ---------------------------------------------------------------------
create table orders (
  id                  uuid primary key default gen_random_uuid(),
  vendor_id           uuid not null references vendors(id) on delete restrict,
  -- référence courte dictable : LS-7F3K2A
  reference           text not null unique,
  -- jeton de la page de suivi du client (jamais l'id brut)
  public_token        text not null unique,

  -- identité cliente : 4 champs, rien de plus. Pas de compte.
  customer_name       text not null check (length(trim(customer_name)) between 2 and 60),
  customer_phone_e164 text not null check (customer_phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  delivery_area       text not null,
  delivery_note       text,

  status              order_status not null default 'en_attente_acompte',

  -- rattachement facultatif au live pendant lequel la commande a été passée.
  -- FACULTATIF EST ESSENTIEL : si la vendeuse a oublié de démarrer sa session,
  -- la commande doit quand même passer. On perd la statistique, pas la vente.
  live_session_id     uuid references live_sessions(id) on delete set null,

  -- MONTANTS. total = prix des articles. deposit = déjà réglé.
  -- balance_due = ce qui reste à la livraison (0 si pas d'acompte prévu).
  -- On stocke les trois : le dérivé pourrait changer si la commande évolue,
  -- et un litige doit pouvoir être lu tel qu'il était.
  items_total_fcfa    integer not null check (items_total_fcfa > 0),
  deposit_fcfa        integer not null default 0 check (deposit_fcfa >= 0),
  balance_due_fcfa    integer not null check (balance_due_fcfa >= 0),

  -- LIVRAISON : le livreur choisi, et comment il doit encaisser
  courier_id          uuid references couriers(id) on delete set null,
  -- null = la vendeuse n'a pas encore décidé qui livre
  courier_agrees_collect boolean not null default false,

  -- OTP : 4 chiffres que la cliente donne au livreur.
  -- C'est la preuve de remise. Stocké en clair : ce n'est pas un secret
  -- durable, juste un code de transaction qui perd sa valeur après usage.
  delivery_otp        text not null check (delivery_otp ~ '^[0-9]{4}$'),
  delivery_otp_attempts integer not null default 0,

  -- horodatages des étapes franchies. NULL = pas atteint.
  deposit_declared_at  timestamptz,
  deposit_confirmed_at timestamptz,
  shipped_at           timestamptz,
  delivered_at         timestamptz,
  cancelled_at         timestamptz,
  cancellation_reason  text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- COHÉRENCE : deposit + balance = total, toujours. Une erreur de calcul
  -- devient impossible, pas seulement improbable.
  constraint amounts_add_up check (deposit_fcfa + balance_due_fcfa = items_total_fcfa),
  constraint deposit_lte_total check (deposit_fcfa <= items_total_fcfa),
  -- on ne confirme pas un acompte non déclaré
  constraint confirm_requires_declaration check (
    deposit_confirmed_at is null or deposit_declared_at is not null
  ),
  -- une livraison suit une expédition
  constraint delivered_requires_shipped check (
    delivered_at is null or shipped_at is not null
  ),
  -- pas de livraison sans livreur assigné
  constraint shipped_requires_courier check (
    shipped_at is null or courier_id is not null
  ),
  -- une annulation a toujours une raison
  constraint cancel_requires_reason check (
    cancelled_at is null or length(trim(coalesce(cancellation_reason, ''))) > 0
  ),
  -- la livraison est refusée après 5 échecs d'OTP (anti-fraude basique)
  constraint otp_attempts_bounded check (delivery_otp_attempts between 0 and 5)
);

create index orders_vendor_status_idx on orders (vendor_id, status, created_at desc);
create index orders_customer_phone_idx on orders (customer_phone_e164);
create index orders_courier_idx on orders (courier_id) where courier_id is not null;
create index orders_live_session_idx on orders (live_session_id) where live_session_id is not null;

-- ---------------------------------------------------------------------
-- LIGNES DE COMMANDE
-- product_name, product_code et unit_price_fcfa sont des COPIES FIGÉES.
-- Si la vendeuse change son prix demain, la commande d'hier ne bouge pas.
-- C'est ce qui rend un litige tranchable trois mois plus tard.
-- ---------------------------------------------------------------------
create table order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  product_id      uuid not null references products(id) on delete restrict,
  product_name    text not null,
  product_code    text not null,
  unit_price_fcfa integer not null check (unit_price_fcfa > 0),
  quantity        integer not null check (quantity > 0),
  line_total_fcfa integer generated always as (unit_price_fcfa * quantity) stored
);

create index order_items_order_idx on order_items (order_id);

-- ---------------------------------------------------------------------
-- PAIEMENTS
-- Une seule table pour les acomptes ET les soldes, distingués par "kind".
-- Chaque ligne = une somme d'argent qui a bougé, avec sa preuve.
--
-- Le parcours dépend du mode :
--  - acompte Wave/OM  : référence de transaction fournie par la cliente
--  - solde espèces    : le LIVREUR détient l'argent, il doit le reverser
--  - solde Wave       : la vendeuse voit l'arrivée sur son téléphone
-- ---------------------------------------------------------------------
create table payments (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  kind            payment_kind not null,
  amount_fcfa     integer not null check (amount_fcfa > 0),
  method          balance_method not null,

  -- PREUVE
  -- Référence / ID de transaction (Wave, OM…). Texte libre : les formats
  -- diffèrent selon l'opérateur, on ne les contraint pas.
  txn_reference   text check (txn_reference is null or length(trim(txn_reference)) between 4 and 64),

  -- DOUBLE SIGNATURE.
  -- declared_at  = la personne qui déclare avoir payé
  -- confirmed_at = la personne qui déclare avoir reçu
  declared_at     timestamptz not null default now(),
  declared_by     text not null check (declared_by in ('client', 'livreur', 'vendeuse')),
  confirmed_at    timestamptz,
  -- désaccord explicite : "je n'ai rien reçu"
  contested_at    timestamptz,
  contest_note    text,

  -- IMPORTANT, cas espèces avec livreur : l'argent existe, mais il n'est
  -- pas encore chez la vendeuse. On trace la main de l'argent.
  --   consigne       -> le livreur devrait avoir l'argent
  --   reverse        -> la vendeuse confirme l'avoir reçu
  --   perdu/litige   -> le livreur ne rend pas l'argent
  -- Cette colonne est le cœur de la réconciliation du dernier kilomètre.
  courier_remittance text not null default 'non_applicable'
    check (courier_remittance in ('non_applicable', 'en_attente', 'reverse', 'litige')),
  remitted_at     timestamptz,

  -- un paiement confirmé ne peut pas être simultanément contesté
  constraint confirmed_xor_contested check (confirmed_at is null or contested_at is null),
  -- un acompte espèces chez la vendeuse n'a pas de référence de transaction
  constraint txn_reference_optional check (true),
  -- remise au livreur : cohérent avec le mode d'encaissement
  constraint remittance_requires_cash check (
    courier_remittance = 'non_applicable'
    or (method = 'especes_livreur' and kind = 'solde')
  )
);

create index payments_order_idx on payments (order_id);
-- requête de réconciliation : "quels livreurs me doivent de l'argent ?"
create index payments_pending_remittance_idx on payments (courier_remittance)
  where courier_remittance in ('en_attente', 'litige');

-- ---------------------------------------------------------------------
-- JOURNAL DES ÉVÉNEMENTS — append-only
-- Chaque changement de statut, horodaté, attribué à un auteur.
-- C'est la pièce qui tranche un litige six mois plus tard.
-- RÈGLE : on insert seulement. Jamais update, jamais delete.
-- ---------------------------------------------------------------------
create table order_events (
  id          bigserial primary key,
  order_id    uuid not null references orders(id) on delete cascade,
  actor       text not null check (actor in ('client', 'vendeuse', 'livreur', 'systeme')),
  event_type  text not null,
  from_status order_status,
  to_status   order_status,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index order_events_order_idx on order_events (order_id, created_at);

-- ---------------------------------------------------------------------
-- LITIGES
-- En v1, résolution MANUELLE : c'est voulu, on veut observer les cas
-- réels avant d'automatiser quoi que ce soit.
-- ---------------------------------------------------------------------
create table disputes (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  opened_by   dispute_opener not null,
  reason      text not null check (length(trim(reason)) between 5 and 500),
  status      dispute_status not null default 'ouvert',
  resolution_note text,
  opened_at   timestamptz not null default now(),
  closed_at   timestamptz,
  constraint closed_requires_note check (
    closed_at is null or length(trim(coalesce(resolution_note, ''))) > 0
  )
);

create index disputes_order_idx on disputes (order_id);
create index disputes_open_idx on disputes (status) where status in ('ouvert','en_cours');

-- =====================================================================
-- FONCTION DE PASSAGE DE COMMANDE
-- Le point le plus critique : créer la commande et décrémenter le stock
-- doivent être UNE SEULE opération atomique.
--
-- SANS le FOR UPDATE, deux clientes qui cliquent ensemble lisent stock=1,
-- écrivent toutes les deux stock=0, et la pièce est vendue deux fois.
-- C'est le seul bug qui détruit irrémédiablement la confiance.
-- =====================================================================
create or replace function place_order(
  p_vendor_id  uuid,
  p_reference  text,
  p_token      text,
  p_otp        text,
  p_name       text,
  p_phone      text,
  p_area       text,
  p_note       text,
  p_items      jsonb    -- [ { "product_id": "...", "quantity": 2 }, ... ]
) returns uuid
language plpgsql
security definer          -- s'exécute avec les droits du propriétaire,
set search_path = public   -- pas ceux du client. Indispensable.
as $$
declare
  v_order_id  uuid;
  v_items_tot integer := 0;
  v_deposit   integer := 0;
  v_item      jsonb;
  v_prod      products;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'COMMANDE_VIDE';
  end if;

  -- 1. chiffrer et vérifier le stock, en VERROUILLANT chaque produit
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_prod
      from products
     where id = (v_item->>'product_id')::uuid
       and vendor_id = p_vendor_id
       and is_active
     for update;              -- <= le verrou qui empêche la survente

    if not found then
      raise exception 'PRODUIT_INTROUVABLE:%', v_item->>'product_id';
    end if;

    if v_prod.stock < (v_item->>'quantity')::int then
      raise exception 'STOCK_INSUFFISANT:%:%', v_prod.name, v_prod.stock;
    end if;

    -- on ne vend pas un produit périmé (alimentaire, cosmétique)
    if v_prod.expires_at is not null and v_prod.expires_at < current_date then
      raise exception 'PRODUIT_PERIME:%', v_prod.name;
    end if;

    v_items_tot := v_items_tot + (v_prod.price_fcfa * (v_item->>'quantity')::int);
    -- l'acompte est la somme des acomptes produits, une fois par ligne
    v_deposit := v_deposit + v_prod.deposit_fcfa;
  end loop;

  -- 2. l'acompte ne peut pas dépasser le total (cas d'un panier de petits articles)
  if v_deposit > v_items_tot then
    v_deposit := v_items_tot;
  end if;

  -- 3. créer la commande
  insert into orders (
    vendor_id, reference, public_token, delivery_otp,
    customer_name, customer_phone_e164, delivery_area, delivery_note,
    items_total_fcfa, deposit_fcfa, balance_due_fcfa
  ) values (
    p_vendor_id, p_reference, p_token, p_otp,
    p_name, p_phone, p_area, p_note,
    v_items_tot, v_deposit, v_items_tot - v_deposit
  ) returning id into v_order_id;

  -- 4. copier les lignes (prix figé) et décrémenter le stock
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_prod from products where id = (v_item->>'product_id')::uuid;

    insert into order_items (
      order_id, product_id, product_name, product_code, unit_price_fcfa, quantity
    ) values (
      v_order_id, v_prod.id, v_prod.name, v_prod.code,
      v_prod.price_fcfa, (v_item->>'quantity')::int
    );

    update products
       set stock = stock - (v_item->>'quantity')::int,
           updated_at = now()
     where id = v_prod.id;
  end loop;

  insert into order_events (order_id, actor, event_type, to_status, metadata)
  values (v_order_id, 'systeme', 'commande_creee', 'en_attente_acompte',
          jsonb_build_object(
            'items_total_fcfa', v_items_tot,
            'deposit_fcfa', v_deposit,
            'balance_due_fcfa', v_items_tot - v_deposit
          ));

  return v_order_id;
end;
$$;

-- =====================================================================
-- FONCTION DE LIVRAISON
-- Le livreur saisit l'OTP que la cliente lui donne : si le code correspond,
-- la commande passe à "livree_payee" et l'argent est réputé remis.
-- Sans ce code, pas de preuve de remise.
--
-- Le compteur de tentatives empêche de deviner les 4 chiffres par essais
-- successifs. Après 5 échecs, la commande doit passer en litige.
-- =====================================================================
create or replace function confirm_delivery(
  p_order_id uuid,
  p_otp      text,
  p_balance_method balance_method
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders;
begin
  select * into v_order from orders where id = p_order_id for update;

  if not found then
    raise exception 'COMMANDE_INTROUVABLE';
  end if;

  if v_order.status <> 'en_livraison' then
    raise exception 'STATUT_INVALIDE:%', v_order.status;
  end if;

  if v_order.delivery_otp_attempts >= 5 then
    raise exception 'TROP_DE_TENTATIVES';
  end if;

  if v_order.delivery_otp <> p_otp then
    update orders
       set delivery_otp_attempts = delivery_otp_attempts + 1
     where id = p_order_id;
    raise exception 'OTP_INVALIDE';
  end if;

  update orders
     set status = 'livree_payee',
         delivered_at = now(),
         updated_at = now()
   where id = p_order_id;

  -- le solde est encaissé au moment de la remise
  if v_order.balance_due_fcfa > 0 then
    insert into payments (
      order_id, kind, amount_fcfa, method, declared_by,
      courier_remittance
    ) values (
      p_order_id, 'solde', v_order.balance_due_fcfa, p_balance_method, 'livreur',
      case when p_balance_method = 'especes_livreur' then 'en_attente' else 'non_applicable' end
    );
  end if;

  insert into order_events (order_id, actor, event_type, from_status, to_status, metadata)
  values (p_order_id, 'livreur', 'livraison_confirmee', 'en_livraison', 'livree_payee',
          jsonb_build_object('method', p_balance_method, 'otp_verified', true));
end;
$$;

-- =====================================================================
-- VUE : RÉPUTATION VENDEUSE
-- Entièrement dérivée du registre. Aucun chiffre déclaratif, aucune
-- possibilité de gonfler son score à la main.
-- =====================================================================
create view vendor_reputation as
select
  v.id as vendor_id,
  v.shop_name,
  count(o.id) filter (where o.status = 'livree_payee')  as delivered_orders,
  count(o.id) filter (where o.status = 'annulee')       as cancelled_orders,
  count(o.id) filter (where o.status = 'litige')        as disputed_orders,
  round(
    100.0 * count(o.id) filter (where o.status = 'litige')
    / greatest(count(o.id) filter (where o.status in
        ('acompte_confirme','en_livraison','livree_payee','litige')), 1)
  , 1)                                                  as dispute_rate_pct,
  min(o.created_at)                                     as first_order_at,
  max(o.created_at)                                     as last_order_at
from vendors v
left join orders o on o.vendor_id = v.id
group by v.id, v.shop_name;

-- =====================================================================
-- VUE : LIVREURS À SURVEILLER
-- "Qui me doit de l'argent ?" — la question que la vendeuse se pose
-- tous les soirs et à laquelle elle n'a aujourd'hui aucune réponse.
-- =====================================================================
create view courier_cash_exposure as
select
  c.id as courier_id,
  c.vendor_id,
  c.name,
  c.phone_e164,
  count(p.id)                  as pending_payments,
  coalesce(sum(p.amount_fcfa), 0) as cash_in_hand_fcfa
from couriers c
left join orders o on o.courier_id = c.id
left join payments p on p.order_id = o.id
     and p.courier_remittance = 'en_attente'
group by c.id, c.vendor_id, c.name, c.phone_e164;

-- =====================================================================
-- VUE : CE QUE CHAQUE LIVE A RAPPORTÉ
-- Le chiffre que la vendeuse n'a jamais aujourd'hui. C'est lui, plus que
-- toute autre fonctionnalité, qui la fera revenir sur l'outil.
-- =====================================================================
create view live_session_stats as
select
  ls.id as live_session_id,
  ls.vendor_id,
  ls.title,
  ls.started_at,
  ls.ended_at,
  -- durée réelle du direct, en minutes
  case when ls.ended_at is not null
       then round(extract(epoch from (ls.ended_at - ls.started_at)) / 60.0, 0)
       else null end                                          as duration_minutes,
  count(o.id)                                                 as orders_count,
  coalesce(sum(o.items_total_fcfa), 0)                        as revenue_fcfa,
  coalesce(sum(o.deposit_fcfa), 0)                            as deposits_fcfa,
  count(o.id) filter (where o.status = 'livree_payee')        as delivered_count,
  count(o.id) filter (where o.status = 'annulee')             as cancelled_count,
  count(o.id) filter (where o.status = 'litige')              as disputed_count
from live_sessions ls
left join orders o on o.live_session_id = ls.id
group by ls.id, ls.vendor_id, ls.title, ls.started_at, ls.ended_at;

-- =====================================================================
-- SÉCURITÉ
-- L'application passe par une connexion serveur unique qui vérifie
-- l'appartenance dans chaque requête.
-- RLS activé en défense en profondeur : par défaut, tout est refusé
-- côté navigateur. Un accès direct avec la clé anon ne voit rien.
-- =====================================================================
alter table vendors     enable row level security;
alter table products    enable row level security;
alter table couriers    enable row level security;
alter table live_sessions enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;
alter table payments    enable row level security;
alter table order_events enable row level security;
alter table disputes    enable row level security;

-- Aucune politique permissive n'est créée ici, volontairement.
-- Les lectures publiques (boutique, suivi client) passent par des routes
-- serveur qui exposent un sous-ensemble choisi de colonnes.
