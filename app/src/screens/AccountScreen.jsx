import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogOut, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, Globe } from 'lucide-react';
import { Input, Button, Avatar, Tag } from '../components/core';
import { useAuth } from '../context/AuthContext';

/**
 * Account — a full-screen, dedicated sign-in card instead of a settings-page
 * form: logo, one email field, a single "Continue" action. Wrapped in
 * data-theme="night" so it picks up the site's existing dark map-at-night
 * palette (see styles/tokens/colors.css) rather than introducing new colors.
 *
 * Email magic-link is the front-door flow — type your email, get a
 * one-click link, you're in, account created automatically on first use.
 * Password sign-in/sign-up is still there as a fallback for anyone who'd
 * rather set one, one tap away.
 */
export function AccountScreen() {
  const navigate = useNavigate();
  const { configured, user, loading, signIn, signUp, signOut, resetPassword, signInWithMagicLink } = useAuth();
  const [useMagicLink, setUseMagicLink] = useState(true);
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' — password mode only
  // 'form' | 'check-email' — a dedicated full-screen state instead of a
  // small inline notice, so it's unmissable that the next step is "go open
  // your email," not a silent success state that looks like nothing
  // happened.
  const [view, setView] = useState('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const clearStatus = () => {
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearStatus();
    setSubmitting(true);

    if (useMagicLink) {
      const { error: err } = await signInWithMagicLink(email);
      setSubmitting(false);
      if (err) setError(err.message);
      else setView('check-email');
      return;
    }

    const fn = mode === 'signin' ? signIn : signUp;
    const { error: err } = await fn(email, password);
    setSubmitting(false);
    if (err) {
      setError(err.message);
    } else if (mode === 'signup') {
      setView('check-email');
    }
  };

  // Re-sends whichever flow got the user to the "check your email" screen,
  // without re-validating/resubmitting the form (the email — and password,
  // for the signup case — are already known at this point).
  const handleResend = async () => {
    setSubmitting(true);
    setError(null);
    const { error: err } = useMagicLink ? await signInWithMagicLink(email) : await signUp(email, password);
    setSubmitting(false);
    if (err) setError(err.message);
  };

  const toggleMagicLink = () => {
    setUseMagicLink((v) => !v);
    clearStatus();
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Enter your email above first, then tap "Forgot password?" again.');
      return;
    }
    clearStatus();
    const { error: err } = await resetPassword(email);
    if (err) setError(err.message);
    else setNotice('If that email has an account, a reset link is on its way.');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/you');
  };

  return (
    <div
      data-theme="night"
      style={{
        position: 'relative',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface-page)',
        minHeight: '100%',
      }}
    >
      <button
        onClick={() => navigate('/you')}
        aria-label="Back"
        style={{
          position: 'absolute', top: 18, left: 18, zIndex: 5,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 38, height: 38, borderRadius: 'var(--radius-pill)',
          border: '1px solid var(--border-soft)', background: 'var(--surface-card)',
          color: 'var(--text-strong)', cursor: 'pointer',
        }}
      >
        <ArrowLeft size={18} />
      </button>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px 40px' }}>
        <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Loading…
            </div>
          ) : !configured ? (
            <>
              <Logo />
              <div
                style={{
                  marginTop: 22, background: 'var(--surface-card)', border: '1px solid var(--border-soft)',
                  borderRadius: 'var(--radius-lg)', padding: 18, display: 'flex', gap: 12, width: '100%',
                }}
              >
                <AlertCircle size={20} color="var(--warning)" style={{ flex: 'none', marginTop: 1 }} />
                <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                  Sign-in isn't set up yet on this deploy. Everything else — exploring, saving,
                  reviewing — already works without an account.
                </p>
              </div>
            </>
          ) : view === 'check-email' ? (
            <>
              <div
                style={{
                  width: 60, height: 60, borderRadius: 'var(--radius-pill)',
                  background: 'var(--brand-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Mail size={26} color="var(--brand)" />
              </div>
              <h1 style={{ margin: '20px 0 8px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 23, color: 'var(--text-strong)', textAlign: 'center' }}>
                Check your email
              </h1>
              <p style={{ margin: '0 0 4px', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
                We sent a link to <strong style={{ color: 'var(--text-strong)' }}>{email}</strong>. Open it on
                this device to {useMagicLink ? 'finish signing in' : 'confirm your account'} — you can close
                this tab afterward.
              </p>

              {error && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--danger)', marginTop: 14, width: '100%' }}>
                  <AlertCircle size={16} style={{ flex: 'none', marginTop: 2 }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}>{error}</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginTop: 26 }}>
                <Button
                  variant="neutral"
                  block
                  disabled={submitting}
                  onClick={handleResend}
                  style={{ borderRadius: 'var(--radius-pill)' }}
                >
                  {submitting ? 'Sending…' : "Didn't get it? Resend"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setView('form'); clearStatus(); }}
                  style={{ alignSelf: 'center', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)', padding: 0 }}
                >
                  Use a different email
                </button>
              </div>
            </>
          ) : user ? (
            <>
              <Avatar name={user.email} size="lg" />
              <div style={{ marginTop: 14, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--text-strong)', textAlign: 'center', wordBreak: 'break-word' }}>
                {user.email}
              </div>
              <div style={{ marginTop: 8 }}>
                <Tag variant="outline" tone="stay">
                  {user.email_confirmed_at ? 'Verified' : 'Awaiting email confirmation'}
                </Tag>
              </div>
              <div style={{ marginTop: 10, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-faint)' }}>
                Member since {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <Button
                variant="neutral"
                block
                iconLeft={<LogOut size={18} />}
                onClick={handleSignOut}
                style={{ marginTop: 26, borderRadius: 'var(--radius-pill)' }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Logo />
              <h1 style={{ margin: '20px 0 6px', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 25, letterSpacing: '-0.01em', color: 'var(--text-strong)', textAlign: 'center' }}>
                Welcome to{' '}
                <span style={{ color: 'var(--stay-500)' }}>Stay</span>
                <span style={{ color: 'var(--ink-400)' }}>Or</span>
                <span style={{ color: 'var(--nay-500)' }}>Nay</span>
              </h1>
              <p style={{ margin: '0 0 28px', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', textAlign: 'center' }}>
                {useMagicLink ? 'Connect with your email — no password needed.' : 'Log in or create an account with email.'}
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
                {!useMagicLink && (
                  <div style={{ display: 'flex', gap: 6, background: 'var(--surface-sunken)', borderRadius: 'var(--radius-pill)', padding: 4, marginBottom: 4 }}>
                    {['signin', 'signup'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { setMode(m); clearStatus(); }}
                        style={{
                          flex: 1, border: 'none', cursor: 'pointer', padding: '9px 0',
                          borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14,
                          background: mode === m ? 'var(--surface-card)' : 'transparent',
                          color: mode === m ? 'var(--text-strong)' : 'var(--text-muted)',
                          boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
                        }}
                      >
                        {m === 'signin' ? 'Log in' : 'Create account'}
                      </button>
                    ))}
                  </div>
                )}

                <Input
                  pill
                  type="email"
                  required
                  iconLeft={<Mail size={18} />}
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                {!useMagicLink && (
                  <Input
                    pill
                    type="password"
                    required
                    minLength={6}
                    iconLeft={<Lock size={18} />}
                    placeholder={mode === 'signup' ? 'Password — at least 6 characters' : 'Password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}

                {!useMagicLink && mode === 'signin' && (
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

                <Button
                  type="submit"
                  variant="stay"
                  block
                  disabled={submitting}
                  iconRight={<ArrowRight size={18} />}
                  style={{ borderRadius: 'var(--radius-pill)', marginTop: 6 }}
                >
                  {submitting ? 'Please wait…' : useMagicLink ? 'Continue' : mode === 'signin' ? 'Log in' : 'Create account'}
                </Button>

                <button
                  type="button"
                  onClick={toggleMagicLink}
                  style={{ alignSelf: 'center', marginTop: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)', padding: 0 }}
                >
                  {useMagicLink ? (
                    <>Prefer a password? <span style={{ fontWeight: 700, color: 'var(--text-link)' }}>Use password</span></>
                  ) : (
                    <>Prefer no password? <span style={{ fontWeight: 700, color: 'var(--text-link)' }}>Use email link</span></>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div
      style={{
        width: 60, height: 60, borderRadius: 'var(--radius-pill)',
        background: 'var(--brand-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Globe size={28} color="var(--brand)" />
    </div>
  );
}
