'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  TrendingUp,
  ShoppingBag,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Banknote,
  Radio,
  Bell,
  Package,
  ChevronRight,
  Store,
  ExternalLink,
  LogOut,
  Copy,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import type { Wallet as WalletType, Transaction, Reservation, Product } from '@/lib/types';
import { formatFCFA, formatCompactFCFA } from '@/lib/format';
import { StatCard } from '@/components/dashboard/stat-card';
import { TransactionList } from '@/components/dashboard/transaction-list';
import { ActiveReservations } from '@/components/dashboard/active-reservations';
import { WithdrawalModal } from '@/components/dashboard/withdrawal-modal';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'reservations' | 'transactions';

const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Aperçu', icon: Radio },
  { id: 'reservations', label: 'Réservations', icon: Clock },
  { id: 'transactions', label: 'Transactions', icon: Banknote },
];

export default function SellerDashboard() {
  const router = useRouter();
  const { user, seller, isLoading: authLoading, signOut } = useAuth();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [copied, setCopied] = useState(false);

  const shopUrl = typeof window !== 'undefined' && seller
    ? `${window.location.origin}/s/${seller.handle}`
    : '';

  const copyShopLink = async () => {
    if (!shopUrl) return;
    try {
      await navigator.clipboard.writeText(shopUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
      const input = document.createElement('input');
      input.value = shopUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
    if (!authLoading && user && !seller) {
      router.push('/auth');
    }
  }, [authLoading, user, seller, router]);

  const fetchData = useCallback(async () => {
    if (!seller) return;
    setIsLoading(true);
    const [walletRes, txRes, resRes, prodRes] = await Promise.all([
      supabase.from('wallet').select('*').eq('seller_id', seller.id).maybeSingle(),
      supabase.from('transactions').select('*').eq('seller_id', seller.id).order('created_at', { ascending: false }).limit(50),
      supabase
        .from('reservations')
        .select('*, product:products(code, name, image)')
        .eq('seller_id', seller.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('products').select('*').eq('seller_id', seller.id).order('created_at', { ascending: true }),
    ]);

    if (walletRes.data) setWallet(walletRes.data);
    else setWallet(null);
    if (txRes.data) setTransactions(txRes.data);
    else setTransactions([]);
    if (resRes.data) setReservations(resRes.data as Reservation[]);
    else setReservations([]);
    if (prodRes.data) setProducts(prodRes.data);
    else setProducts([]);
    setIsLoading(false);
  }, [seller]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeReservations = reservations.filter(
    (r) => r.status === 'pending' || r.status === 'confirmed',
  );
  const pendingCount = reservations.filter((r) => r.status === 'pending').length;
  const deliveredCount = reservations.filter((r) => r.status === 'delivered').length;
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const recentTransactions = transactions.slice(0, 8);

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen bg-[#0a0b10] text-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-rose-500 animate-spin" />
      </div>
    );
  }

  if (!seller) return null;

  return (
    <div className="min-h-screen bg-[#0a0b10] text-white">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[-5%] w-64 h-64 rounded-full bg-amber-500/5 blur-3xl animate-float" />
        <div className="absolute bottom-[20%] right-[-5%] w-72 h-72 rounded-full bg-sky-500/5 blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>
      <header className="bg-[#12131c]/80 backdrop-blur-lg border-b border-white/5 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#222330] to-[#1a1b26] flex items-center justify-center text-xl border border-white/5">
              {seller.avatar}
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold leading-tight truncate">{seller.name}</h1>
              <p className="text-[11px] text-gray-400">
                @{seller.handle}
                {seller.is_live && <span className="ml-2 text-rose-400 font-medium">● En direct</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/dashboard/produits')}
              className="w-9 h-9 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400"
              title="Gérer mes articles"
            >
              <Package size={18} />
            </button>
            <button className="w-9 h-9 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400 relative">
              <Bell size={18} />
              {pendingCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-bold flex items-center justify-center text-white">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => signOut()}
              className="w-9 h-9 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400"
              title="Se déconnecter"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Shop Link Card */}
        <div className="bg-gradient-to-br from-sky-500/10 to-sky-500/5 border border-sky-500/20 rounded-2xl p-4 animate-fade-in-up">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
              <ExternalLink size={14} />
              Lien de votre boutique
            </span>
            <button
              onClick={() => router.push(`/s/${seller.handle}`)}
              className="text-[11px] text-sky-400 hover:text-sky-300 font-medium underline underline-offset-2"
            >
              Aperçu
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#0f1015] border border-white/10 rounded-xl px-3 py-2.5 truncate">
              <p className="text-sm text-white font-medium truncate">{shopUrl || `/s/${seller.handle}`}</p>
            </div>
            <button
              onClick={copyShopLink}
              className={cn(
                'shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 active:scale-95',
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-sky-500 text-white hover:bg-sky-400',
              )}
            >
              {copied ? (
                <>
                  <Check size={16} /> Copié
                </>
              ) : (
                <>
                  <Copy size={16} /> Copier
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Collez ce lien dans votre bio TikTok pour que vos abonnés accèdent à votre boutique.
          </p>
        </div>

        {/* Wallet Hero Card */}
        <div className="bg-gradient-to-br from-[#1a1b26] to-[#12131c] border border-white/5 rounded-3xl p-5 shadow-xl animate-fade-in-up stagger-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400 font-medium">Solde du portefeuille</span>
            <Wallet size={18} className="text-amber-400" />
          </div>
          {isLoading || !wallet ? (
            <div className="h-9 w-40 bg-white/5 rounded-lg animate-pulse mt-1" />
          ) : (
            <p className="text-3xl font-black text-white tracking-tight">{formatFCFA(wallet.balance)}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-emerald-400" />
              <span className="text-gray-400">Gains</span>
              <span className="text-emerald-400 font-semibold">
                {wallet ? formatCompactFCFA(wallet.total_earned) : '—'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowUpRight size={14} className="text-amber-400" />
              <span className="text-gray-400">Retiré</span>
              <span className="text-amber-400 font-semibold">
                {wallet ? formatCompactFCFA(wallet.total_withdrawn) : '—'}
              </span>
            </div>
          </div>
          <button
            onClick={() => wallet && setShowWithdrawal(true)}
            disabled={!wallet || wallet.balance === 0}
            className="w-full mt-4 py-3.5 rounded-2xl font-bold bg-amber-500 text-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-400 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <Banknote size={20} />
            Retirer mon argent
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="animate-fade-in-up stagger-3"><StatCard label="Ventes livrées" value={String(deliveredCount)} icon={ShoppingBag} accent="green" sublabel={`${reservations.length} réservations`} />
          <StatCard label="En attente" value={String(pendingCount)} icon={Clock} accent="yellow" sublabel={pendingCount > 0 ? 'Action requise' : 'À jour'} /></div>
          <div className="animate-fade-in-up stagger-4"><StatCard label="Stock total" value={String(totalStock)} icon={Package} accent="blue" sublabel={`${products.length} articles`} /></div>
          <div className="animate-fade-in-up stagger-5"><StatCard label="Ruptures" value={String(outOfStock)} icon={ArrowDownLeft} accent="red" sublabel={outOfStock === 0 ? 'Aucune' : 'Réappro.'} /></div>
        </div>

        {/* Manage Products Link */}
        <button
          onClick={() => router.push('/dashboard/produits')}
          className="group w-full bg-[#12131c] border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-[#181a24] hover:border-white/10 transition-all active:scale-[0.99] animate-fade-in-up stagger-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <Store size={18} className="text-sky-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">Gérer mes articles</p>
              <p className="text-[11px] text-gray-400">Ajouter, modifier, supprimer</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-[#12131c] p-1 rounded-xl border border-white/5 animate-fade-in-up stagger-7">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all',
                  activeTab === tab.id ? 'bg-white/[0.06] text-white' : 'text-gray-400 hover:text-gray-300',
                )}
              >
                <TabIcon size={15} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-white">Réservations actives</h2>
                {activeReservations.length > 0 && (
                  <button onClick={() => setActiveTab('reservations')} className="flex items-center gap-0.5 text-xs text-sky-400 hover:text-sky-300">
                    Tout voir <ChevronRight size={14} />
                  </button>
                )}
              </div>
              <ActiveReservations reservations={activeReservations.slice(0, 3)} isLoading={isLoading} />
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-white">Transactions récentes</h2>
                {transactions.length > 0 && (
                  <button onClick={() => setActiveTab('transactions')} className="flex items-center gap-0.5 text-xs text-sky-400 hover:text-sky-300">
                    Tout voir <ChevronRight size={14} />
                  </button>
                )}
              </div>
              <div className="bg-[#12131c] border border-white/5 rounded-2xl overflow-hidden">
                <TransactionList transactions={recentTransactions} isLoading={isLoading} />
              </div>
            </section>

            <section>
              <h2 className="text-sm font-bold text-white mb-3">Mes articles</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {products.slice(0, 6).map((product) => (
                  <div key={product.id} className="bg-[#12131c] border border-white/5 rounded-xl p-3 relative overflow-hidden">
                    {product.stock === 0 && (
                      <div className="absolute top-1.5 right-1.5 text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">Rupture</div>
                    )}
                    <div className="text-2xl mb-1.5">{product.image}</div>
                    <p className="text-xs font-medium text-white truncate">{product.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-bold text-white">{formatFCFA(product.price)}</span>
                      <span className={cn('text-[10px] font-medium', product.stock > 2 ? 'text-emerald-400' : product.stock > 0 ? 'text-amber-400' : 'text-rose-400')}>
                        Stock: {product.stock}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'reservations' && (
          <section>
            <h2 className="text-sm font-bold text-white mb-3">Toutes les réservations ({reservations.length})</h2>
            <ActiveReservations reservations={reservations} isLoading={isLoading} />
          </section>
        )}

        {activeTab === 'transactions' && (
          <section>
            <h2 className="text-sm font-bold text-white mb-3">Historique ({transactions.length})</h2>
            <div className="bg-[#12131c] border border-white/5 rounded-2xl overflow-hidden">
              <TransactionList transactions={transactions} isLoading={isLoading} />
            </div>
          </section>
        )}
      </div>

      {wallet && (
        <WithdrawalModal
          wallet={wallet}
          open={showWithdrawal}
          onClose={() => setShowWithdrawal(false)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
