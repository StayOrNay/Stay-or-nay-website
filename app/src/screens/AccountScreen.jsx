import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogOut, CheckCircle2, AlertCircle, UserRound } from 'lucide-react';
import { Input, Button, Avatar, Tag } from '../components/core';
import { Header } from '../components/shared';
import { useAuth } from '../context/AuthContext';

/**
 * Account — email/password sign-up + login when signed out, profile +
 * sign-out when signed in. Backed by Supabase auth (see lib/supabase.js);
 * if the site owner hasn't added Supabase project keys yet, this shows a
 * plain explanatory notice instead of a broken form.
 */
export function AccountScreen() {
  const navigate = useNavigate();
  const { configured, user, loading, signIn, signUp, signOut, resetPassword } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error: err } = await fn(email, password);
    setSubmitting(false);
    if (err) {
      setError(err.message);
    } else if (mode === 'signup') {
      setNotice('Account created — check your email to confirm it, then sign in.');
      setMode('signin');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Enter your email above first, then tap "Forgot password?" again.');
      return;
    }
    setError(null);
    setNotice(null);
    const { error: err } = await resetPassword(email);
    if (err) setError(err.message);
    else setNotice('If that email has an account, a reset link is on its way.');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/you');
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-page)' }}>
      <Header title="Account" onBack={() => navigate('/you')} />
      <div style={{ padding: 16, maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Loading…
          </div>
        ) : !configured ? (
          <div
            style={{
              background: 'var(--surface-card)', border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-lg)', padding: 18, display: 'flex', gap: 12,
            }}
          >
            <AlertCircle size={20} color="var(--warning)" style={{ flex: 'none', marginTop: 1 }} />
            <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55 }}>
              Sign-in isn't set up yet on this deploy. Once the site owner adds Supabase project
              keys, this screen will let you create an account or log in by email. Everything
              else — exploring, saving, reviewing — already works without an account.
            </p>
          </div>
        ) : user ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={user.email} size="lg" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </div>
                <div style={{ marginTop: 4 }}>
                  <Tag variant="outline" tone="stay">
                    {user.email_confirmed_at ? 'Verified' : 'Awaiting email confirmation'}
                  </Tag>
                </div>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-faint)' }}>
              Member since {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <Button variant="neutral" block iconLeft={<LogOut size={18} />} onClick={handleSignOut}>
              Sign out
            </Button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)', padding: 4 }}>
              {['signin', 'signup'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(null); setNotice(null); }}
                  style={{
                    flex: 1, border: 'none', cursor: 'pointer', padding: '9px 0',
                    borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14,
                    background: mode === m ? 'var(--surface-card)' : 'transparent',
                    color: mode === m ? 'var(--text-strong)' : 'var(--text-muted)',
                    boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {m === 'signin' ? 'Log in' : 'Create account'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input
                label="Email"
                type="email"
                required
                iconLeft={<Mail size={18} />}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="Password"
                type="password"
                required
                minLength={6}
                iconLeft={<Lock size={18} />}
                placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  style={{ alignSelf: 'flex-end', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-link)', padding: 0 }}
                >
                  Forgot password?
                </button>
              )}

              {error && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--danger)' }}>
                  <AlertCircle size={16} style={{ flex: 'none', marginTop: 2 }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}>{error}</span>
                </div>
              )}
              {notice && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--success)' }}>
                  <CheckCircle2 size={16} style={{ flex: 'none', marginTop: 2 }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}>{notice}</span>
                </div>
              )}

              <Button type="submit" variant="stay" block disabled={submitting} iconLeft={<UserRound size={18} />}>
                {submitting ? 'Please wait…' : mode === 'signin' ? 'Log in' : 'Create account'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
