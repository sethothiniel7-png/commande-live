'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase-client';
import type { Seller } from '@/lib/types';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  seller: Seller | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshSeller: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  seller: null,
  isLoading: true,
  signOut: async () => {},
  refreshSeller: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSeller = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('sellers')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();
    if (data) setSeller(data as Seller);
    else setSeller(null);
  }, []);

  const refreshSeller = useCallback(async () => {
    if (user) await fetchSeller(user.id);
  }, [user, fetchSeller]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchSeller(s.user.id).then(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    supabase.auth.onAuthStateChange((_event, s) => {
      (async () => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await fetchSeller(s.user.id);
        } else {
          setSeller(null);
        }
        setIsLoading(false);
      })();
    });
  }, [fetchSeller]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSeller(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, seller, isLoading, signOut, refreshSeller }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
