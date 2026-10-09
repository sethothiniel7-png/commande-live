export type SellerCategory = 'vetements' | 'cosmetiques' | 'nourriture' | 'friperie' | 'accessoires' | 'autre';

export type ProductCategory = SellerCategory;

export type Seller = {
  id: string;
  user_id: string | null;
  handle: string;
  name: string;
  category: SellerCategory;
  avatar: string;
  bio: string | null;
  phone: string | null;
  tiktok_url: string | null;
  is_live: boolean;
  followers: number;
  rating: number;
  created_at: string;
};

export type Product = {
  id: string;
  code: string;
  name: string;
  price: number;
  deposit: number;
  stock: number;
  image: string;
  category: ProductCategory;
  seller_id: string | null;
  is_active: boolean;
  created_at: string;
};

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'delivered'
  | 'expired'
  | 'cancelled';

export type Reservation = {
  id: string;
  product_id: string;
  seller_id: string | null;
  phone: string;
  zone: string;
  otp: string;
  status: ReservationStatus;
  price: number;
  deposit: number;
  expires_at: string;
  created_at: string;
  product?: Pick<Product, 'code' | 'name' | 'image'>;
};

export type TransactionType = 'deposit' | 'sale' | 'withdrawal' | 'commission';

export type TransactionStatus = 'pending' | 'completed' | 'failed';

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  description: string | null;
  reservation_id: string | null;
  seller_id: string | null;
  provider: string | null;
  phone: string | null;
  created_at: string;
};

export type Wallet = {
  id: string;
  seller_id: string | null;
  balance: number;
  total_earned: number;
  total_withdrawn: number;
  updated_at: string;
};

export type MobileMoneyProvider = 'wave' | 'orange_money' | 'mtn_money';

export type AbidjanCommune =
  | 'Cocody'
  | 'Yopougon'
  | 'Marcory'
  | 'Plateau'
  | 'Treichville'
  | 'Abobo'
  | 'Koumassi'
  | 'Adjamé';
