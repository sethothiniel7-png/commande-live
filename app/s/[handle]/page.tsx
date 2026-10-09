'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Radio,
  Star,
  Users,
  MapPin,
  Phone,
  X,
  Clock,
  CheckCircle2,
  MessageCircle,
  Share2,
  Store,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import type { Seller, Product, AbidjanCommune } from '@/lib/types';
import { formatFCFA, formatCountdown } from '@/lib/format';
import { cn } from '@/lib/utils';

const communes: AbidjanCommune[] = ['Cocody', 'Yopougon', 'Marcory', 'Plateau', 'Treichville', 'Abobo', 'Koumassi', 'Adjamé'];

const categoryLabels: Record<string, string> = {
  vetements: 'Vêtements',
  cosmetiques: 'Cosmétiques',
  nourriture: 'Nourriture',
  friperie: 'Friperie',
  accessoires: 'Accessoires',
  autre: 'Autre',
};

type ActiveReservation = {
  product: Product;
  phone: string;
  zone: string;
  otp: string;
  expiresAt: number;
};

export default function SellerProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const router = useRouter();

  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [phone, setPhone] = useState('');
  const [zone, setZone] = useState<AbidjanCommune | ''>('');
  const [reservation, setReservation] = useState<ActiveReservation | null>(null);
  const [timeLeft, setTimeLeft] = useState(600);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: sellerData } = await supabase
      .from('sellers')
      .select('*')
      .eq('handle', handle)
      .maybeSingle();

    if (sellerData) {
      setSeller(sellerData as Seller);
      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', sellerData.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      if (prodData) setProducts(prodData as Product[]);
    }
    setIsLoading(false);
  }, [handle]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!reservation) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setReservation(null);
          setTimeLeft(600);
          setProducts((prevProducts) =>
            prevProducts.map((p) =>
              p.id === reservation.product.id ? { ...p, stock: p.stock + 1 } : p,
            ),
          );
          return 600;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [reservation]);

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !phone || !zone || !seller) return;
    setIsSubmitting(true);
    setError('');

    try {
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const expiresAt = Date.now() + 600000;

      const { error: resError } = await supabase.from('reservations').insert({
        product_id: selectedProduct.id,
        seller_id: seller.id,
        phone,
        zone,
        otp,
        status: 'pending',
        price: selectedProduct.price,
        deposit: selectedProduct.deposit,
        expires_at: new Date(expiresAt).toISOString(),
      });

      if (resError) throw resError;

      const { error: prodError } = await supabase
        .from('products')
        .update({ stock: selectedProduct.stock - 1 })
        .eq('id', selectedProduct.id);

      if (prodError) throw prodError;

      setProducts((prev) =>
        prev.map((p) => (p.id === selectedProduct.id ? { ...p, stock: p.stock - 1 } : p)),
      );
      setReservation({ product: selectedProduct, phone, zone, otp, expiresAt });
      setTimeLeft(600);
      setSelectedProduct(null);
      setPhone('');
      setZone('');
    } catch {
      setError('La réservation a échoué. Réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validerSurWhatsApp = () => {
    if (!reservation || !seller) return;
    const message = `Bonjour ${seller.name} ! Je viens de réserver pendant votre Live.\n\nArticle : ${reservation.product.name} (Code ${reservation.product.code})\nPrix : ${reservation.product.price} FCFA\nLivraison : ${reservation.zone}\nAcompte à payer : ${reservation.product.deposit} FCFA\nMon numéro : ${reservation.phone}\nComment je valide mon acompte ?`;
    const phone = seller.phone ? `225${seller.phone}` : '22500000000';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: seller?.name, url });
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0b10] text-white">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <div className="h-10 w-10 shimmer rounded-lg" />
          <div className="flex gap-4">
            <div className="w-20 h-20 shimmer rounded-2xl" />
            <div className="flex-1 space-y-2">
              <div className="h-5 shimmer rounded w-1/2" />
              <div className="h-3 shimmer rounded w-1/3" />
            </div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 shimmer rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-[#0a0b10] text-white flex flex-col items-center justify-center px-6 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
          <Store size={28} className="text-gray-600" />
        </div>
        <p className="text-sm text-gray-500">Cette boutique n'existe pas</p>
        <button
          onClick={() => router.push('/live')}
          className="mt-4 text-sm text-rose-400 font-medium hover:text-rose-300 transition-colors"
        >
          Voir les vendeuses
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b10] text-white pb-28">
      {/* Background glow */}
      {seller.is_live && (
        <div className="fixed top-0 left-0 right-0 h-64 pointer-events-none overflow-hidden">
          <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-rose-500/10 blur-3xl animate-glow-pulse" />
        </div>
      )}

      <header className="bg-[#12131c]/80 backdrop-blur-lg border-b border-white/5 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <button
            onClick={() => router.push('/live')}
            className="w-9 h-9 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-gray-400">@{seller.handle}</span>
          <button
            onClick={handleShare}
            className="w-9 h-9 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400 transition-colors"
          >
            {copied ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Share2 size={18} />}
          </button>
        </div>
      </header>

      <div className="relative max-w-2xl mx-auto px-4 z-10">
        {/* Profile Header */}
        <div className="pt-6 pb-5 animate-fade-in-up">
          <div className="flex items-start gap-4 mb-4">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#222330] to-[#1a1b26] flex items-center justify-center text-4xl border border-white/5">
                {seller.avatar}
              </div>
              {seller.is_live && (
                <div className="absolute -bottom-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg animate-live-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black">{seller.name}</h1>
              <span className="text-xs text-sky-400 font-medium bg-sky-500/10 px-2 py-0.5 rounded inline-block mt-1">
                {categoryLabels[seller.category]}
              </span>
              <div className="flex items-center gap-4 mt-2.5 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Users size={13} /> {seller.followers.toLocaleString('fr-FR')}
                </span>
                <span className="flex items-center gap-1">
                  <Star size={13} className="text-amber-400" /> {seller.rating.toFixed(1)}
                </span>
                <span className="flex items-center gap-1">
                  <Radio size={13} className="text-rose-400" /> {products.length} articles
                </span>
              </div>
            </div>
          </div>

          {seller.bio && <p className="text-sm text-gray-300 mb-3">{seller.bio}</p>}

          {seller.tiktok_url && (
            <a
              href={seller.tiktok_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors group"
            >
              <span className="w-6 h-6 rounded-lg bg-white/5 group-hover:bg-white/10 flex items-center justify-center text-[10px] font-bold transition-colors">TT</span>
              Voir sur TikTok
              <ArrowLeft size={12} className="rotate-180 group-hover:translate-x-0.5 transition-transform" />
            </a>
          )}
        </div>

        {/* Live banner */}
        {seller.is_live && (
          <div className="flex items-center gap-3 bg-gradient-to-r from-rose-500/15 to-transparent border border-rose-500/20 rounded-2xl p-3.5 mb-4 animate-scale-in">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
              <Radio size={18} className="text-rose-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-rose-400">En direct maintenant</p>
              <p className="text-[11px] text-gray-400">Réservez vite, les articles partent vite en live</p>
            </div>
          </div>
        )}

        {/* Products header */}
        <div className="flex items-center justify-between mb-3 animate-fade-in-up stagger-2">
          <h2 className="text-sm font-bold">Articles en boutique</h2>
          {seller.is_live && (
            <span className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              En live
            </span>
          )}
        </div>

        {/* Products */}
        <div className="space-y-3">
          {products.length === 0 ? (
            <div className="text-center py-16 animate-scale-in">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Store size={26} className="text-gray-600" />
              </div>
              <p className="text-sm text-gray-500">Aucun article disponible pour le moment</p>
              <p className="text-[11px] text-gray-600 mt-1">Revenez pendant le prochain live</p>
            </div>
          ) : (
            products.map((product, i) => (
              <div
                key={product.id}
                className={cn(
                  'group bg-[#12131c] border border-white/5 rounded-2xl p-4 flex gap-4 relative overflow-hidden hover:border-white/10 transition-all animate-fade-in-up',
                  `stagger-${Math.min((i % 8) + 1, 8)}`,
                )}
              >
                {product.stock === 0 && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl animate-fade-in">
                    <span className="bg-rose-500 text-white px-4 py-2 rounded-lg font-bold text-sm -rotate-12">
                      Rupture
                    </span>
                  </div>
                )}
                <div className="w-20 h-20 bg-gradient-to-br from-[#1a1b26] to-[#15161f] rounded-xl flex items-center justify-center text-3xl shrink-0 group-hover:scale-105 transition-transform">
                  {product.image}
                </div>
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <span className="bg-rose-500/15 text-rose-400 text-[10px] font-bold px-2 py-1 rounded">
                      CODE {product.code}
                    </span>
                    <h3 className="font-bold mt-2 truncate">{product.name}</h3>
                    <div className="flex items-baseline gap-2">
                      <p className="font-black">{formatFCFA(product.price)}</p>
                      <p className="text-[11px] text-gray-400">Acompte {formatFCFA(product.deposit)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedProduct(product); setError(''); }}
                    disabled={product.stock === 0 || reservation !== null}
                    className={cn(
                      'w-full mt-2 font-bold py-2.5 rounded-xl text-sm transition-all active:scale-95',
                      reservation
                        ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                        : product.stock > 0
                          ? 'bg-white text-black hover:bg-gray-100 hover:shadow-lg hover:shadow-white/10'
                          : 'bg-white/5 text-gray-500 cursor-not-allowed',
                    )}
                  >
                    {reservation ? 'Commande en cours' : product.stock > 0 ? `Réserver — Reste ${product.stock}` : 'Rupture'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Trust badge */}
        {products.length > 0 && (
          <div className="flex items-center justify-center gap-4 mt-6 py-3 text-[11px] text-gray-500 animate-fade-in">
            <span className="flex items-center gap-1">
              <CheckCircle2 size={12} className="text-emerald-400" /> Paiement sécurisé
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} className="text-amber-400" /> 10 min pour réserver
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp size={12} className="text-sky-400" /> Livraison Abidjan
            </span>
          </div>
        )}
      </div>

      {/* Reservation Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-fade-in"
          onClick={() => !isSubmitting && setSelectedProduct(null)}
        >
          <div
            className="bg-[#1a1b26] w-full max-w-md p-6 rounded-t-3xl sm:rounded-3xl border border-white/10 animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold">Valider la réservation</h2>
              <button
                onClick={() => !isSubmitting && setSelectedProduct(null)}
                className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-5">
              {selectedProduct.image} {selectedProduct.name} — {formatFCFA(selectedProduct.price)}
            </p>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mb-4 animate-scale-in">
                <p className="text-xs text-rose-300">{error}</p>
              </div>
            )}

            <form onSubmit={handleReserve} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5 mb-1.5">
                  <Phone size={14} /> Numéro WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full bg-[#0f1015] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-400/50 transition-colors"
                  placeholder="07 00 00 00 00"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5 mb-1.5">
                  <MapPin size={14} /> Quartier (Abidjan)
                </label>
                <select
                  required
                  value={zone}
                  onChange={(e) => setZone(e.target.value as AbidjanCommune)}
                  className="w-full bg-[#0f1015] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-400/50 transition-colors"
                >
                  <option value="">Sélectionner...</option>
                  {communes.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3">
                <p className="text-[11px] text-amber-300/80">
                  L'article sera bloqué 10 minutes. Payez l'acompte de {formatFCFA(selectedProduct.deposit)} via WhatsApp pour confirmer.
                </p>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => !isSubmitting && setSelectedProduct(null)}
                  className="flex-1 py-3.5 rounded-xl font-bold bg-white/5 text-gray-300 hover:bg-white/10 transition-colors active:scale-95"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-xl font-bold bg-rose-500 text-white disabled:opacity-50 hover:bg-rose-400 transition-colors active:scale-95 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Réservation...
                    </>
                  ) : (
                    <>
                      <Clock size={16} />
                      Bloquer (10 min)
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Reservation Bar */}
      {reservation && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#12131c]/95 backdrop-blur-lg border-t border-white/5 z-40 animate-slide-in-right">
          <div className="max-w-md mx-auto space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <CheckCircle2 size={16} className="text-emerald-400 animate-bounce-subtle" />
                <span>OTP :</span>
                <span className="text-white font-black bg-white/10 px-3 py-1 rounded-lg tracking-[0.2em] animate-counter-pop">
                  {reservation.otp}
                </span>
              </div>
              <span
                className={cn(
                  'font-mono font-bold tabular-nums flex items-center gap-1',
                  timeLeft <= 120 ? 'text-rose-400 animate-pulse' : 'text-amber-400',
                )}
              >
                <Clock size={14} />
                {formatCountdown(timeLeft)}
              </span>
            </div>
            <button
              onClick={validerSurWhatsApp}
              className="w-full bg-[#25D366] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-lg hover:bg-[#20bd5a] transition-colors active:scale-[0.99] shadow-lg shadow-[#25D366]/20"
            >
              <MessageCircle size={24} /> Payer l'acompte sur WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
