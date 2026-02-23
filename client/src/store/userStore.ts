import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface UserState {
  user: User | null;
  token: string | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  fetchSession: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  token: null,
  loading: true,
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setLoading: (loading) => set({ loading }),
  fetchSession: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ 
        user: session?.user ?? null, 
        token: session?.access_token ?? null,
        loading: false 
      });
    } catch (error) {
      console.error('Error fetching session:', error);
      set({ loading: false });
    }
  },
}));
