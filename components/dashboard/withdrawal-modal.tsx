'use client';

import { useState } from 'react';
import { Wallet, X, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import type { MobileMoneyProvider, Wallet as WalletType } from '@/lib/types';
import { formatFCFA } from '@/lib/format';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase-client';

type WithdrawalModalProps = {
  wallet: WalletType;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const providers: { id: MobileMoneyProvider; label: string; color: string; bg: string }[] = [
  { id: 'wave', label: 'Wave', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30' },
  { id: 'orange_money', label: 'Orange Money', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  { id: 'mtn_money', label: 'MTN MoMo', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
];

const quickAmounts = [5000, 10000, 25000, 50000];

export function WithdrawalModal({ wallet, open, onClose, onSuccess }: WithdrawalModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [provider, setProvider] = useState<MobileMoneyProvider | null>(null);
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'form' | 'processing' | 'success' | 'error'>('form');
  const [errorMsg, setErrorMsg] = useState('');

  if (!open) return null;

  const numericAmount = parseInt(amount.replace(/\D/g, '') || '0', 10);
  const exceedsBalance = numericAmount > wallet.balance;
  const canSubmit = numericAmount > 0 && numericAmount <= wallet.balance && provider !== null && phone.length >= 10;

  const handleAmountChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setAmount(digits);
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !provider) return;
    setStep('processing');
    setErrorMsg('');

    try {
      const { error: txError } = await supabase.from('transactions').insert({
        type: 'withdrawal',
        amount: -numericAmount,
        status: 'completed',
        description: `Retrait ${provider === 'wave' ? 'Wave' : provider === 'orange_money' ? 'Orange Money' : 'MTN MoMo'}`,
        provider,
        phone,
      });

      if (txError) throw txError;

      const { error: walletError } = await supabase
        .from('wallet')
        .update({
          balance: wallet.balance - numericAmount,
          total_withdrawn: wallet.total_withdrawn + numericAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wallet.id);

      if (walletError) throw walletError;

      setStep('success');
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch {
      setStep('error');
      setErrorMsg('Le retrait a échoué. Vérifiez votre connexion et réessayez.');
    }
  };

  const handleClose = () => {
    setAmount('');
    setProvider(null);
    setPhone('');
    setStep('form');
    setErrorMsg('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={handleClose}
    >
      <div
        className="bg-[#1a1b26] w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'success' ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Retrait effectué</h2>
            <p className="text-sm text-gray-400">
              {formatFCFA(numericAmount)} envoyés vers {provider === 'wave' ? 'Wave' : provider === 'orange_money' ? 'Orange Money' : 'MTN MoMo'}
            </p>
          </div>
        ) : step === 'processing' ? (
          <div className="p-8 text-center">
            <Loader2 size={32} className="text-sky-400 animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white mb-1">Traitement du retrait…</h2>
            <p className="text-sm text-gray-400">Ne fermez pas cette page</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Wallet size={20} className="text-amber-400" />
                <h2 className="text-lg font-bold text-white">Retrait du portefeuille</h2>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {step === 'error' && (
                <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                  <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-300">{errorMsg}</p>
                </div>
              )}

              <div className="bg-[#0f1015] rounded-xl p-4">
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">Solde disponible</p>
                <p className="text-2xl font-black text-white">{formatFCFA(wallet.balance)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Montant du retrait</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount ? parseInt(amount, 10).toLocaleString('fr-FR') : ''}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#0f1015] border border-white/10 rounded-xl px-4 py-3 text-lg font-bold text-white focus:outline-none focus:border-amber-400/50 transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">FCFA</span>
                </div>
                {exceedsBalance && (
                  <p className="text-[11px] text-rose-400 mt-1.5">Le montant dépasse votre solde disponible</p>
                )}
                <div className="flex gap-2 mt-2.5 flex-wrap">
                  {quickAmounts.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAmount(String(amt))}
                      disabled={amt > wallet.balance}
                      className="px-3 py-1.5 rounded-lg bg-white/5 text-xs font-medium text-gray-300 hover:bg-white/10 disabled:opacity-30 transition-colors"
                    >
                      {amt.toLocaleString('fr-FR')}
                    </button>
                  ))}
                  <button
                    onClick={() => setAmount(String(wallet.balance))}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition-colors"
                  >
                    Tout retirer
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Moyen de retrait</label>
                <div className="grid grid-cols-3 gap-2">
                  {providers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setProvider(p.id)}
                      className={cn(
                        'py-3 rounded-xl border text-sm font-semibold transition-all',
                        provider === p.id
                          ? cn(p.bg, p.color, 'scale-[1.02]')
                          : 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/5',
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Numéro Mobile Money</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="07 00 00 00 00"
                  maxLength={10}
                  className="w-full bg-[#0f1015] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400/50 transition-colors"
                />
                {phone.length > 0 && phone.length < 10 && (
                  <p className="text-[11px] text-gray-500 mt-1.5">10 chiffres requis</p>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleClose}
                  className="flex-1 py-3.5 rounded-xl font-bold bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="flex-1 py-3.5 rounded-xl font-bold bg-amber-500 text-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Wallet size={18} />
                  Retirer {amount ? formatFCFA(numericAmount) : ''}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
