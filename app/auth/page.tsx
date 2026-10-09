'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Radio, ArrowLeft, Mail, Lock, Store, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

type Mode = 'signin' | 'signup';

export default function AuthPage() {
  const router = useRouter();
  const { user, seller, isLoading } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && user && seller) {
      router.push('/dashboard');
    }
  }, [user, seller, isLoading, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : err.message);
      setIsSubmitting(false);
    }
    // onAuthStateChange will handle redirect
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.');
      setIsSubmitting(false);
      return;
    }

    const handle = shopName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    if (!handle) {
      setError('Le nom de boutique doit contenir des lettres ou chiffres.');
      setIsSubmitting(false);
      return;
    }

    const { data, error: err } = await supabase.auth.signUp({ email, password });
    if (err) {
      setError(err.message);
      setIsSubmitting(false);
      return;
    }

    if (data.user) {
      const { error: sellerErr } = await supabase.from('sellers').insert({
        user_id: data.user.id,
        handle,
        name: shopName.trim(),
        category: 'autre',
        avatar: '🏪',
        bio: 'Nouvelle boutique sur LiveCart Express',
      });

      if (sellerErr) {
        if (sellerErr.code === '23505') {
          setError('Ce nom de boutique est déjà pris. Choisissez-en un autre.');
        } else {
          setError('Erreur lors de la création de la boutique. Réessayez.');
        }
        setIsSubmitting(false);
        return;
      }

      // Create initial wallet
      const { data: newSeller } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', data.user.id)
        .maybeSingle();
      if (newSeller) {
        await supabase.from('wallet').insert({
          seller_id: newSeller.id,
          balance: 0,
          total_earned: 0,
          total_withdrawn: 0,
        });
      }
    }
    // onAuthStateChange will handle redirect
  };

  return (
    <div className="min-h-screen bg-[#0a0b10] text-white flex flex-col">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[15%] left-[10%] w-64 h-64 rounded-full bg-rose-500/8 blur-3xl animate-float" />
        <div className="absolute bottom-[15%] right-[5%] w-72 h-72 rounded-full bg-sky-500/6 blur-3xl animate-float" style={{ animationDelay: '1.3s' }} />
      </div>
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-md mx-auto z-10">
        <button
          onClick={() => router.push('/')}
          className="self-start flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={16} /> Retour
        </button>

        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center mb-5 shadow-lg shadow-rose-500/20 animate-gradient animate-scale-in">
          <Store size={26} className="text-white" />
        </div>

        <h1 className="text-xl font-black animate-fade-in-up stagger-1">Espace vendeuse</h1>
        <p className="text-sm text-gray-400 text-center mt-1.5 mb-7 animate-fade-in-up stagger-2">
          {mode === 'signin' ? 'Connectez-vous pour gérer votre boutique' : 'Créez votre compte vendeuse'}
        </p>

        {/* Mode Toggle */}
        <div className="flex gap-1 bg-[#12131c] p-1 rounded-xl border border-white/5 w-full mb-5 animate-fade-in-up stagger-3">
          <button
            onClick={() => { setMode('signin'); setError(''); }}
            className={cn(
              'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all',
              mode === 'signin' ? 'bg-white/[0.06] text-white' : 'text-gray-400 hover:text-gray-300',
            )}
          >
            Connexion
          </button>
          <button
            onClick={() => { setMode('signup'); setError(''); }}
            className={cn(
              'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all',
              mode === 'signup' ? 'bg-white/[0.06] text-white' : 'text-gray-400 hover:text-gray-300',
            )}
          >
            Inscription
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mb-4 w-full">
            <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-300">{error}</p>
          </div>
        )}

        <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="w-full space-y-4 animate-fade-in-up stagger-4">
          {mode === 'signup' && (
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Nom de votre boutique</label>
              <div className="relative">
                <Store size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full bg-[#0f1015] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-rose-400/50 transition-colors"
                  placeholder="Mami Frip"
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5">
                Votre lien public : <span className="text-sky-400">{typeof window !== 'undefined' ? window.location.origin : 'votre-site'}/s/{shopName ? shopName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') : 'ma_boutique'}</span>
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0f1015] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-rose-400/50 transition-colors"
                placeholder="ma_boutique@email.com"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Mot de passe</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0f1015] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-rose-400/50 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl font-bold bg-rose-500 text-white disabled:opacity-50 hover:bg-rose-400 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {mode === 'signin' ? 'Connexion...' : 'Création...'}
              </>
            ) : (
              mode === 'signin' ? 'Se connecter' : 'Créer ma boutique'
            )}
          </button>
        </form>

        <p className="text-[11px] text-gray-500 text-center mt-5 animate-fade-in stagger-5">
          {mode === 'signin' ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
            className="text-rose-400 hover:text-rose-300 font-medium"
          >
            {mode === 'signin' ? 'Créer une boutique' : 'Se connecter'}
          </button>
        </p>
      </div>
    </div>
  );
}
