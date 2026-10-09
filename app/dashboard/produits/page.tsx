'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Package,
  Plus,
  X,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import type { Product, ProductCategory } from '@/lib/types';
import { formatFCFA } from '@/lib/format';
import { cn } from '@/lib/utils';

const categories: { key: ProductCategory; label: string; emoji: string }[] = [
  { key: 'vetements', label: 'Vêtements', emoji: '👗' },
  { key: 'friperie', label: 'Friperie', emoji: '👖' },
  { key: 'cosmetiques', label: 'Cosmétiques', emoji: '💄' },
  { key: 'nourriture', label: 'Nourriture', emoji: '🍽️' },
  { key: 'accessoires', label: 'Accessoires', emoji: '👜' },
  { key: 'autre', label: 'Autre', emoji: '📦' },
];

const emojiOptions = ['👗', '👖', '👕', '👜', '👠', '💄', '💅', '💇‍♀️', '🧴', '🍽️', '🍗', '🥘', '🍰', '☕', '📦', '🎨', '⌚', '🕶️'];

type FormData = {
  code: string;
  name: string;
  price: string;
  deposit: string;
  stock: string;
  image: string;
  category: ProductCategory;
};

const emptyForm: FormData = {
  code: '',
  name: '',
  price: '',
  deposit: '1500',
  stock: '',
  image: '📦',
  category: 'vetements',
};

export default function ProductsPage() {
  const router = useRouter();
  const { user, seller, isLoading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth');
    if (!authLoading && user && !seller) router.push('/auth');
  }, [authLoading, user, seller, router]);

  const fetchProducts = useCallback(async () => {
    if (!seller) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: true });
    if (data) setProducts(data as Product[]);
    setIsLoading(false);
  }, [seller]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const openAddForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
    setShowForm(true);
  };

  const openEditForm = (product: Product) => {
    setForm({
      code: product.code,
      name: product.name,
      price: String(product.price),
      deposit: String(product.deposit),
      stock: String(product.stock),
      image: product.image,
      category: product.category,
    });
    setEditingId(product.id);
    setError('');
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    const payload = {
      code: form.code.toUpperCase().trim(),
      name: form.name.trim(),
      price: parseInt(form.price, 10) || 0,
      deposit: parseInt(form.deposit, 10) || 0,
      stock: parseInt(form.stock, 10) || 0,
      image: form.image,
      category: form.category,
      seller_id: seller?.id,
    };

    try {
      if (editingId) {
        const { error: err } = await supabase.from('products').update(payload).eq('id', editingId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('products').insert(payload);
        if (err) throw err;
      }
      await fetchProducts();
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error: err } = await supabase.from('products').delete().eq('id', deleteId);
    if (!err) {
      setProducts((prev) => prev.filter((p) => p.id !== deleteId));
    }
    setDeleteId(null);
  };

  const categoryLabel = (cat: string) => categories.find((c) => c.key === cat)?.label || 'Autre';

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen bg-[#0a0b10] text-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-rose-500 animate-spin" />
      </div>
    );
  }

  if (!seller) return null;

  return (
    <div className="min-h-screen bg-[#0a0b10] text-white pb-24">
      <header className="bg-[#12131c] border-b border-white/5 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-9 h-9 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-base font-bold leading-tight">Mes articles</h1>
              <p className="text-[11px] text-gray-400">{products.length} produits</p>
            </div>
          </div>
          <button
            onClick={openAddForm}
            className="flex items-center gap-1.5 bg-rose-500 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-rose-400 transition-colors"
          >
            <Plus size={16} /> Ajouter
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#12131c] rounded-2xl p-4 flex gap-4 animate-pulse">
              <div className="w-16 h-16 bg-white/5 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/5 rounded w-1/3" />
                <div className="h-5 bg-white/5 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <Package size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Aucun article pour le moment</p>
            <button
              onClick={openAddForm}
              className="mt-4 text-sm text-rose-400 font-medium hover:text-rose-300"
            >
              Ajouter mon premier article
            </button>
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="bg-[#12131c] border border-white/5 rounded-2xl p-4 flex items-center gap-3"
            >
              <div className="w-16 h-16 bg-[#1a1b26] rounded-xl flex items-center justify-center text-3xl shrink-0">
                {product.image}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-rose-500/15 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded">
                    {product.code}
                  </span>
                  <span className="text-[10px] text-gray-500">{categoryLabel(product.category)}</span>
                  {product.stock === 0 && (
                    <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                      Rupture
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold truncate">{product.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-sm font-bold">{formatFCFA(product.price)}</span>
                  <span
                    className={cn(
                      'text-[11px]',
                      product.stock > 2 ? 'text-emerald-400' : product.stock > 0 ? 'text-amber-400' : 'text-rose-400',
                    )}
                  >
                    Stock: {product.stock}
                  </span>
                  <span className="text-[11px] text-gray-500">Acompte {formatFCFA(product.deposit)}</span>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => openEditForm(product)}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => setDeleteId(product.id)}
                  className="w-9 h-9 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center text-rose-400 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center"
          onClick={() => !isSaving && setShowForm(false)}
        >
          <div
            className="bg-[#1a1b26] w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 bg-[#1a1b26] z-10">
              <h2 className="text-lg font-bold">{editingId ? 'Modifier l\'article' : 'Nouvel article'}</h2>
              <button
                onClick={() => !isSaving && setShowForm(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {error && (
                <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                  <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-300">{error}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Catégorie</label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, category: cat.key, image: cat.emoji }))}
                      className={cn(
                        'py-2.5 rounded-xl border text-xs font-medium transition-all flex flex-col items-center gap-1',
                        form.category === cat.key
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          : 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/5',
                      )}
                    >
                      <span className="text-lg">{cat.emoji}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Code</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full bg-[#0f1015] border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-rose-400/50 transition-colors uppercase"
                    placeholder="A1"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Nom du produit</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-[#0f1015] border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-rose-400/50 transition-colors"
                    placeholder="Robe Rouge Silk"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Prix (FCFA)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value.replace(/\D/g, '') })}
                    className="w-full bg-[#0f1015] border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-rose-400/50 transition-colors"
                    placeholder="10000"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Acompte (FCFA)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={form.deposit}
                    onChange={(e) => setForm({ ...form, deposit: e.target.value.replace(/\D/g, '') })}
                    className="w-full bg-[#0f1015] border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-rose-400/50 transition-colors"
                    placeholder="1500"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-1.5 block">Stock disponible</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value.replace(/\D/g, '') })}
                  className="w-full bg-[#0f1015] border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-rose-400/50 transition-colors"
                  placeholder="5"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Icône</label>
                <div className="flex flex-wrap gap-1.5">
                  {emojiOptions.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setForm({ ...form, image: emoji })}
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all',
                        form.image === emoji
                          ? 'bg-rose-500/15 border-2 border-rose-500/40'
                          : 'bg-white/[0.02] border border-white/5 hover:bg-white/5',
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => !isSaving && setShowForm(false)}
                  disabled={isSaving}
                  className="flex-1 py-3.5 rounded-xl font-bold bg-white/5 text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3.5 rounded-xl font-bold bg-rose-500 text-white disabled:opacity-50 hover:bg-rose-400 transition-colors flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Sauvegarde...
                    </>
                  ) : editingId ? (
                    'Modifier'
                  ) : (
                    'Ajouter'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
          onClick={() => setDeleteId(null)}
        >
          <div
            className="bg-[#1a1b26] w-full max-w-sm rounded-3xl border border-white/10 p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-rose-400" />
            </div>
            <h2 className="text-lg font-bold mb-1">Supprimer cet article ?</h2>
            <p className="text-sm text-gray-400 mb-5">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl font-bold bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 rounded-xl font-bold bg-rose-500 text-white hover:bg-rose-400 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {!showForm && products.length > 0 && (
        <button
          onClick={openAddForm}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30 flex items-center justify-center hover:bg-rose-400 transition-all active:scale-95 sm:hidden"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}
