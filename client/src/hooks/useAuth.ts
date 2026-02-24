import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useUserStore } from '@/store/userStore';

export function useAuth() {
  const { user, token, loading, setUser, setToken, setLoading, fetchSession } = useUserStore();

  useEffect(() => {
    // Top-Level E2E API Mock Escape Hatch to completely cut-out Supabase hanging the loading state
    if (typeof window !== 'undefined' && window.localStorage.getItem('E2E_TEST') === 'true') {
      setUser({ id: 'e2e-user', is_anonymous: true } as User);
      setToken('e2e-token');
      setLoading(false);
      return;
    }

    // Initial Session Check
    const initAuth = async () => {
      await fetchSession();
      // Session check is now handled inside onAuthStateChange or after fetchSession
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await signInAnonymously();
      }
    };

    if (loading && !user) {
      initAuth();
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user ?? null;

      // Handle SIGNED_IN or USER_UPDATED events
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && newUser && !newUser.is_anonymous) {
        const previousGuestId = localStorage.getItem('storio_guest_id');
        if (previousGuestId && previousGuestId !== newUser.id) {
          console.log(`Migrating data from ${previousGuestId} to ${newUser.id}`);
          try {
            const { error } = await supabase.rpc('migrate_guest_data', {
              old_user_id: previousGuestId,
              new_user_id: newUser.id
            });
            if (error) throw error;
            localStorage.removeItem('storio_guest_id');
            console.log('Migration successful');
          } catch (err) {
            console.error('Migration failed:', err);
          }
        }
      }

      // Track current guest ID
      if (newUser?.is_anonymous) {
        localStorage.setItem('storio_guest_id', newUser.id);
      }

      setUser(newUser);
      setToken(session?.access_token ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInAnonymously = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      setUser(data.user);
      const { data: sessionData } = await supabase.auth.getSession();
      setToken(sessionData.session?.access_token ?? null);
    } catch (error) {
      console.error('Error signing in anonymously:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      // After sign out, localStorage guest ID should be cleared to prevent accidental migration back
      localStorage.removeItem('storio_guest_id');
      // After sign out, create a new anonymous session immediately
      await signInAnonymously();
    } catch (error) {
      console.error('Error signing out:', error);
      setLoading(false);
    }
  };

  const updateProfile = async (updates: {
    display_name?: string,
    avatar_url?: string,
    gender?: string,
    birthday?: string,
    profile_completed?: boolean
  }) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates
      });
      if (error) throw error;
      if (data.user) setUser(data.user);
      return { data, error: null };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { data: null, error };
    }
  };

  return { user, token, loading, signOut, updateProfile, signInAnonymously };
}