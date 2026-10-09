'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Radio, ArrowLeft, Star, Users, Store, Search, TrendingUp, Eye, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import type { Seller, SellerCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

const categoryConfig: { key: SellerCategory | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: 'Tout', emoji: '🏪' },
  { key: 'vetements', label: 'Vêtements', emoji: '👗' },
  { key: 'friperie', label: 'Friperie', emoji: '👖' },
  { key: 'cosmetiques', label: 'Cosmétiques', emoji: '💄' },
  { key: 'nourriture', label: 'Nourriture', emoji: '🍽️' },
  { key: 'accessoires', label: 'Accessoires', emoji: '👜' },
];

export default function LiveShoppingPage() {
  const router = useRouter();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [filter, setFilter] = useState<SellerCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchSellers = useCallback(async () => {
    const { data } = await supabase
      .from('sellers')
      .select('*')
      .order('followers', { ascending: false });
    if (data) setSellers(data as Seller[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  const filteredSellers = sellers.filter((s) => {
    const matchesCategory = filter === 'all' || s.category === filter;
    const matchesSearch =
      search === '' ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.handle.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const liveSellers = sellers.filter((s) => s.is_live);
  const liveCount = liveSellers.length;
  const categoryLabel = (cat: string) => categoryConfig.find((c) => c.key === cat)?.label || 'Autre';
  const categoryEmoji = (cat: string) => categoryConfig.find((c) => c.key === cat)?.emoji || '📦';

  return (
    <div className="min-h-screen bg-[#0a0b10] text-white">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[5%] right-[-5%] w-64 h-64 rounded-full bg-rose-500/8 blur-3xl animate-float" />
        <div className="absolute bottom-[20%] left-[-5%] w-72 h-72 rounded-full bg-sky-500/6 blur-3xl animate-float" style={{ animationDelay: '1.2s' }} />
      </div>

      <header className="bg-[#12131c]/80 backdrop-blur-lg border-b border-white/5 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="w-9 h-9 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center animate-gradient">
              <Radio size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">Live Boutique</h1>
              <p className="text-[10px] text-gray-400">{liveCount} vendeuses en live</p>
            </div>
          </div>
          {liveCount > 0 ? (
            <div className="flex items-center gap-1.5 bg-rose-500/10 text-rose-400 px-3 py-1.5 rounded-full animate-live-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[11px] font-semibold">Live</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-white/5 text-gray-400 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-gray-500" />
              <span className="text-[11px] font-semibold">Hors ligne</span>
            </div>
          )}
        </div>
      </header>

      <div className="relative max-w-2xl mx-auto px-4 py-4 space-y-4 z-10">
        {/* Live now section */}
        {liveSellers.length > 0 && (
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <h2 className="text-xs font-bold text-rose-400 uppercase tracking-wide">En direct maintenant</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-rose-500/20 to-transparent" />
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {liveSellers.map((seller, i) => (
                <button
                  key={seller.id}
                  onClick={() => router.push(`/s/${seller.handle}`)}
                  className={cn(
                    'shrink-0 w-36 bg-gradient-to-br from-rose-500/15 to-[#12131c] border border-rose-500/20 rounded-2xl p-3 text-left hover:scale-[1.03] transition-transform active:scale-95 animate-scale-in',
                    `stagger-${Math.min(i + 1, 8)}`,
                  )}
                >
                  <div className="relative inline-block mb-2">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#222330] to-[#1a1b26] flex items-center justify-center text-2xl border border-white/5">
                      {seller.avatar}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-rose-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 animate-live-pulse">
                      <span className="w-1 h-1 rounded-full bg-white" />
                      LIVE
                    </div>
                  </div>
                  <p className="text-xs font-bold truncate">{seller.name}</p>
                  <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                    <Users size={10} /> {seller.followers.toLocaleString('fr-FR')}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative animate-fade-in-up stagger-2">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une vendeuse…"
            className="w-full bg-[#12131c] border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-rose-400/30 focus:bg-[#161724] transition-all"
          />
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 animate-fade-in-up stagger-3">
          {categoryConfig.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setFilter(cat.key as SellerCategory | 'all')}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 active:scale-95',
                filter === cat.key
                  ? 'bg-white text-black shadow-lg'
                  : 'bg-[#1a1b26] text-gray-400 border border-white/5 hover:bg-white/5 hover:border-white/10',
              )}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between animate-fade-in stagger-4">
          <p className="text-xs text-gray-500">{filteredSellers.length} boutique{filteredSellers.length !== 1 ? 's' : ''}</p>
          {filteredSellers.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-gray-500">
              <TrendingUp size={12} /> Par popularité
            </span>
          )}
        </div>

        {/* Sellers */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[#12131c] rounded-2xl p-4 flex gap-3">
                <div className="w-16 h-16 rounded-2xl shimmer" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 shimmer rounded w-1/2" />
                  <div className="h-3 shimmer rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredSellers.map((seller, i) => (
              <button
                key={seller.id}
                onClick={() => router.push(`/s/${seller.handle}`)}
                className={cn(
                  'group w-full bg-[#12131c] border border-white/5 rounded-2xl p-4 flex items-center gap-4 text-left hover:bg-[#181a24] hover:border-white/10 transition-all active:scale-[0.98] animate-fade-in-up',
                  `stagger-${Math.min((i % 8) + 1, 8)}`,
                )}
              >
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#222330] to-[#1a1b26] flex items-center justify-center text-3xl border border-white/5 group-hover:scale-105 transition-transform">
                    {seller.avatar}
                  </div>
                  {seller.is_live && (
                    <div className="absolute -bottom-1 -right-1 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 animate-live-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      LIVE
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold truncate group-hover:text-white transition-colors">{seller.name}</h3>
                    <span className="text-[10px] text-sky-400 font-medium bg-sky-500/10 px-2 py-0.5 rounded">
                      {categoryEmoji(seller.category)} {categoryLabel(seller.category)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-1 mb-2">{seller.bio}</p>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users size={12} /> {seller.followers.toLocaleString('fr-FR')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star size={12} className="text-amber-400" /> {seller.rating.toFixed(1)}
                    </span>
                    {seller.is_live ? (
                      <span className="text-rose-400 font-medium flex items-center gap-1">
                        <Eye size={11} /> En direct
                      </span>
                    ) : (
                      <span className="text-gray-600">Hors ligne</span>
                    )}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-rose-500 group-hover:translate-x-0.5 transition-all shrink-0">
                  <ArrowLeft size={14} className="rotate-180 text-gray-500 group-hover:text-white" />
                </div>
              </button>
            ))}

            {filteredSellers.length === 0 && !isLoading && (
              <div className="text-center py-16 animate-scale-in">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Store size={28} className="text-gray-600" />
                </div>
                <p className="text-sm text-gray-500">Aucune vendeuse trouvée</p>
                {search && (
                  <button
                    onClick={() => { setSearch(''); setFilter('all'); }}
                    className="mt-3 text-xs text-rose-400 font-medium"
                  >
                    Réinitialiser la recherche
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bottom spark */}
        {!isLoading && filteredSellers.length > 0 && (
          <div className="text-center py-6 animate-fade-in">
            <Sparkles size={16} className="text-gray-600 inline" />
            <p className="text-[11px] text-gray-600 mt-1">Nouvelles boutiques chaque semaine</p>
          </div>
        )}
      </div>
    </div>
  );
}
