'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Radio, Store, ArrowRight, Sparkles, ShieldCheck, Clock, Wallet, TrendingUp, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';

export default function LandingPage() {
  const router = useRouter();
  const [liveCount, setLiveCount] = useState(0);
  const [sellersCount, setSellersCount] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ count: live }, { count: total }] = await Promise.all([
        supabase.from('sellers').select('*', { count: 'exact', head: true }).eq('is_live', true),
        supabase.from('sellers').select('*', { count: 'exact', head: true }),
      ]);
      setLiveCount(live || 0);
      setSellersCount(total || 0);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0b10] text-white flex flex-col overflow-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[10%] w-72 h-72 rounded-full bg-rose-500/10 blur-3xl animate-float" />
        <div className="absolute bottom-[10%] right-[5%] w-80 h-80 rounded-full bg-sky-500/8 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-[40%] right-[15%] w-64 h-64 rounded-full bg-amber-500/6 blur-3xl animate-float" style={{ animationDelay: '0.8s' }} />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-md mx-auto z-10">
        {/* Logo with glow */}
        <div className="relative mb-6 animate-scale-in">
          <div className="absolute inset-0 rounded-2xl bg-rose-500/20 blur-xl animate-glow-pulse" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center shadow-lg shadow-rose-500/30 animate-gradient">
            <Radio size={32} className="text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-black text-center leading-tight animate-fade-in-up stagger-1">
          LiveCart <span className="gradient-text">Express</span>
        </h1>
        <p className="text-sm text-gray-400 text-center mt-2.5 mb-8 animate-fade-in-up stagger-2 max-w-xs">
          Réservez en direct, payez l'acompte, recevez votre commande à Abidjan.
        </p>

        {/* Live stats bar */}
        <div className="flex items-center gap-3 mb-8 animate-fade-in-up stagger-3">
          <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-semibold text-rose-400">{liveCount} en live</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <Store size={12} className="text-sky-400" />
            <span className="text-xs font-semibold text-gray-300">{sellersCount} boutiques</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="w-full space-y-3">
          <button
            onClick={() => router.push('/live')}
            className="group w-full bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold py-4 rounded-2xl flex items-center justify-between px-5 hover:from-rose-400 hover:to-rose-500 transition-all active:scale-[0.98] shadow-lg shadow-rose-500/20 animate-fade-in-up stagger-4 glow-border"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Radio size={20} className="animate-pulse" />
              </div>
              <div className="text-left">
                <p className="text-sm">Je suis acheteuse</p>
                <p className="text-[11px] text-white/70">Réserver pendant le live</p>
              </div>
            </div>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => router.push('/auth')}
            className="group w-full bg-[#1a1b26] border border-white/10 text-white font-bold py-4 rounded-2xl flex items-center justify-between px-5 hover:bg-[#222330] transition-all active:scale-[0.98] animate-fade-in-up stagger-5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Store size={20} className="text-sky-400" />
              </div>
              <div className="text-left">
                <p className="text-sm">Je suis vendeuse</p>
                <p className="text-[11px] text-gray-400">Se connecter ou créer ma boutique</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-gray-500 group-hover:translate-x-1 group-hover:text-white transition-all" />
          </button>
        </div>

        {/* Features grid */}
        <div className="mt-9 w-full grid grid-cols-2 gap-2.5">
          <FeatureCard icon={Clock} title="10 min" desc="Réservation flash" delay="stagger-6" accent="rose" />
          <FeatureCard icon={ShieldCheck} title="Code OTP" desc="Livraison sécurisée" delay="stagger-7" accent="emerald" />
          <FeatureCard icon={Wallet} title="Mobile Money" desc="Wave, Orange, MTN" delay="stagger-8" accent="amber" />
          <FeatureCard icon={Zap} title="Lien TikTok" desc="Boutique en ligne" delay="stagger-8" accent="sky" />
        </div>

        {/* Ticker */}
        <div className="mt-8 w-full overflow-hidden border-y border-white/5 py-2.5 animate-fade-in stagger-8">
          <div className="ticker-track gap-8">
            {tickerItems.map((item, i) => (
              <span key={i} className="flex items-center gap-2 text-xs text-gray-500 whitespace-nowrap">
                <span className="w-1 h-1 rounded-full bg-rose-500" />
                {item}
              </span>
            ))}
            {tickerItems.map((item, i) => (
              <span key={`d-${i}`} className="flex items-center gap-2 text-xs text-gray-500 whitespace-nowrap">
                <span className="w-1 h-1 rounded-full bg-rose-500" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <footer className="relative text-center pb-6 text-[11px] text-gray-600 z-10">
        LiveCart Express — Abidjan, Côte d'Ivoire
      </footer>
    </div>
  );
}

const tickerItems = [
  'Réservation flash en 10 minutes',
  'Paiement acompte Mobile Money',
  'Livraison à Abidjan avec code OTP',
  'Boutique liée à TikTok',
  'Vêtements, cosmétiques, food',
  'Vendeuses vérifiées',
];

const accentMap: Record<string, string> = {
  rose: 'text-rose-400 bg-rose-500/10',
  emerald: 'text-emerald-400 bg-emerald-500/10',
  amber: 'text-amber-400 bg-amber-500/10',
  sky: 'text-sky-400 bg-sky-500/10',
};

function FeatureCard({
  icon: Icon,
  title,
  desc,
  delay,
  accent,
}: {
  icon: typeof Clock;
  title: string;
  desc: string;
  delay: string;
  accent: string;
}) {
  return (
    <div className={`animate-fade-in-up ${delay} flex items-start gap-2.5 px-3 py-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${accentMap[accent]}`}>
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-white truncate">{title}</p>
        <p className="text-[10px] text-gray-500 truncate">{desc}</p>
      </div>
    </div>
  );
}
