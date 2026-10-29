import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { useUserStore } from '@/store/userStore';
import { detectBot } from '@/lib/botDetection';

// 模組層狀態：全 App 共用，避免每個 useAuth() mount 各自建匿名帳號、各自註冊 listener
let initPromise: Promise<void> | null = null;
let anonPromise: Promise<void> | null = null;
let authSubscription: { unsubscribe: () => void } | null = null;
let migration: { key: string; promise: Promise<void> } | null = null;
let authQueue: Promise<void> = Promise.resolve();

/** 僅供測試：重設模組層狀態 */
export function __resetAuthForTests() {
  authSubscription?.unsubscribe();
  initPromise = null;
  anonPromise = null;
  authSubscription = null;
  migration = null;
  authQueue = Promise.resolve();
}

function signInAnonymouslyOnce(): Promise<void> {
  if (anonPromise) return anonPromise;
  const { setUser, setToken, setLoading, setAnonSignInFailed } = useUserStore.getState();
  anonPromise = (async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      if (data.user) localStorage.setItem('storio_guest_id', data.user.id);
      setUser(data.user);
      const { data: sessionData } = await supabase.auth.getSession();
      setToken(sessionData.session?.access_token ?? null);
      setAnonSignInFailed(false);
    } catch (error) {
      console.error('Error signing in anonymously:', error);
      setAnonSignInFailed(true);
    } finally {
      setLoading(false);
      anonPromise = null;
    }
  })();
  return anonPromise;
}

// 同一組 訪客→正式帳號 只搬一次；並發的事件共用同一個 promise
function migrateGuestOnce(oldId: string, newId: string): Promise<void> {
  const key = `${oldId}->${newId}`;
  if (migration?.key === key) return migration.promise;
  const promise = (async () => {
    console.log(`Migrating data from ${oldId} to ${newId}`);
    try {
      const { error } = await supabase.rpc('migrate_guest_data', {
        old_user_id: oldId,
        new_user_id: newId,
      });
      if (error) throw error;
      localStorage.removeItem('storio_guest_id');
      console.log('Migration successful');
    } catch (err) {
      console.error('Migration failed:', err);
    }
  })();
  migration = { key, promise };
  return promise;
}

const MIGRATE_EVENTS = new Set(['INITIAL_SESSION', 'SIGNED_IN', 'USER_UPDATED']);

async function handleAuthChange(event: AuthChangeEvent, session: Session | null) {
  const { setUser, setToken, setLoading } = useUserStore.getState();
  const newUser = session?.user ?? null;

  // INITIAL_SESSION 也要搬：網頁 OAuth redirect 的 SIGNED_IN 可能早於 listener 註冊
  if (MIGRATE_EVENTS.has(event) && newUser && !newUser.is_anonymous) {
    const previousGuestId = localStorage.getItem('storio_guest_id');
    if (previousGuestId && previousGuestId !== newUser.id) {
      await migrateGuestOnce(previousGuestId, newUser.id);
    }
  }

  // 只記錄「目前 session 的匿名帳號」為訪客 ID
  if (newUser?.is_anonymous) {
    localStorage.setItem('storio_guest_id', newUser.id);
  }

  setUser(newUser);
  setToken(session?.access_token ?? null);
  setLoading(false);
}

function ensureAuthListener() {
  if (authSubscription) return;
  // App 生命週期內常駐，不隨元件 unmount 解除。
  // callback 不可 await 任何 supabase 呼叫（事件可能在 auth lock 內送出，會 deadlock），
  // 改以 setTimeout 移出 lock，並用佇列維持事件順序與「先搬移、再切 user」。
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {
      authQueue = authQueue
        .then(() => handleAuthChange(event, session))
        .catch((err) => console.error('Auth state handling failed:', err));
    }, 0);
  });
  authSubscription = subscription;
}

function initAuthOnce(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    await useUserStore.getState().fetchSession();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // 疑似爬蟲／分享圖渲染服務不建立匿名帳號，避免汙染 auth.users
      if (detectBot().isBot) {
        useUserStore.getState().setLoading(false);
        return;
      }
      await signInAnonymouslyOnce();
    }
  })();
  return initPromise;
}

export function useAuth() {
  const { user, token, loading, setUser, setToken, setLoading } = useUserStore();

  useEffect(() => {
    // Top-Level E2E API Mock Escape Hatch to completely cut-out Supabase hanging the loading state
    if (typeof window !== 'undefined' && window.localStorage.getItem('E2E_TEST') === 'true') {
      setUser({ id: 'e2e-user', is_anonymous: true } as User);
      setToken('e2e-token');
      setLoading(false);
      return;
    }

    const { loading: isLoading, user: currentUser } = useUserStore.getState();
    if (isLoading && !currentUser) {
      initAuthOnce().catch((err) => {
        console.error('Auth init failed:', err);
        useUserStore.getState().setLoading(false);
      });
    }

    ensureAuthListener();
  }, []);

  const signInAnonymously = () => signInAnonymouslyOnce();

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      // After sign out, localStorage guest ID should be cleared to prevent accidental migration back
      localStorage.removeItem('storio_guest_id');
      // After sign out, create a new anonymous session immediately
      await signInAnonymouslyOnce();
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