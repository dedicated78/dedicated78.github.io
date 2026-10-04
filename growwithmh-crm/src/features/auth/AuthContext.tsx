import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import type { Profile, Role } from '@/types';

interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  profileError: string | null;
  isAdmin: boolean;
  role: Role | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setSessionLoaded(true);
    });
    // Keep this callback synchronous: awaiting supabase calls inside it can deadlock auth.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionLoaded(true);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;

  const loadProfile = useCallback(async (id: string) => {
    setProfileLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error) {
      setProfileError(error.message);
      setProfile(null);
    } else {
      setProfileError(null);
      setProfile(data as Profile | null);
    }
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileError(null);
      return;
    }
    void loadProfile(userId);
  }, [userId, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (userId) await loadProfile(userId);
  }, [userId, loadProfile]);

  const value = useMemo<AuthState>(
    () => ({
      loading: !sessionLoaded || (!!userId && profileLoading && !profile),
      session,
      profile,
      profileError,
      isAdmin: profile?.role === 'admin' && profile.is_active,
      role: profile?.is_active ? profile.role : null,
      signIn,
      signOut,
      refreshProfile,
    }),
    [sessionLoaded, userId, profileLoading, profile, session, profileError, signIn, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** For routes behind the auth gate, where a profile is guaranteed. */
export function useCurrentUser(): Profile {
  const { profile } = useAuth();
  if (!profile) throw new Error('useCurrentUser used outside the authenticated area');
  return profile;
}
