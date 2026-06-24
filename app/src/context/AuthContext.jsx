import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

const NOT_CONFIGURED_ERROR = {
  message:
    "Sign-in isn't set up yet on this deploy — the site owner needs to add Supabase project keys. Browsing, saving, and reviewing villas all still work without an account.",
};

/**
 * Real, persisted email/password auth via Supabase — sessions sync across
 * devices and survive a refresh (Supabase stores its own session token in
 * localStorage and silently refreshes it). Everything else in the app
 * (saved villas, reviews) stays client-only for now; this only covers
 * identity, not data sync.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signUp = async (email, password) => {
    if (!isSupabaseConfigured) return { error: NOT_CONFIGURED_ERROR };
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured) return { error: NOT_CONFIGURED_ERROR };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return { error: NOT_CONFIGURED_ERROR };
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email) => {
    if (!isSupabaseConfigured) return { error: NOT_CONFIGURED_ERROR };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/you/account',
    });
    return { error };
  };

  // Passwordless: emails a one-click sign-in link. Supabase creates the
  // account automatically on first use, so this single call covers both
  // "sign up" and "sign in" — no separate magic-link signup step needed.
  const signInWithMagicLink = async (email) => {
    if (!isSupabaseConfigured) return { error: NOT_CONFIGURED_ERROR };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/you/account' },
    });
    return { error };
  };

  const value = {
    configured: isSupabaseConfigured,
    user: session?.user ?? null,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    signInWithMagicLink,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
