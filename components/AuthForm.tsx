'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, Mail, ShieldAlert } from 'lucide-react';

export default function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isLogin = mode === 'login';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const supabase = createClient();

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(params.get('redirect') || '/templates');
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          router.push('/templates');
          router.refresh();
        } else {
          setNotice('Check your email to confirm your account, then sign in.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  const handleOAuth = (provider: string) => {
    // Standard OAuth is not configured, but we keep the visual button and alert
    alert(`${provider} authentication is coming soon! Please use the email and password option.`);
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-xl shadow-md">
            D
          </div>
          <span className="font-bold text-2xl text-text tracking-tight">DocuGen</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 border border-border shadow-card rounded-card sm:px-10">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-text">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Start your free trial. No credit card required.
            </p>
          </div>

          {/* OAuth stack */}
          <div className="flex flex-col gap-3 mb-6">
            <button
              type="button"
              onClick={() => handleOAuth('Google')}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-border hover:bg-muted text-text font-medium text-sm rounded-btn transition-colors"
            >
              {/* Google Glyph */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.18 4.114-3.5 0-6.32-2.82-6.32-6.32s2.82-6.32 6.32-6.32c1.68 0 3.12.65 4.22 1.71l3.02-3.02C19.34 2.23 15.97 1 12.24 1 5.92 1 1 5.92 1 12.24s4.92 11.24 11.24 11.24c5.96 0 10.82-4.22 11.49-10h-11.49z"
                />
              </svg>
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('Microsoft')}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-border hover:bg-muted text-text font-medium text-sm rounded-btn transition-colors"
            >
              {/* Microsoft Glyph */}
              <svg className="w-4 h-4" viewBox="0 0 23 23">
                <path fill="#f35325" d="M0 0h11v11H0z" />
                <path fill="#81bc06" d="M12 0h11v11H12z" />
                <path fill="#05a6f0" d="M0 12h11v11H0z" />
                <path fill="#ffba08" d="M12 12h11v11H12z" />
              </svg>
              Continue with Microsoft
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-text-muted font-medium">Or continue with Email</span>
            </div>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full border border-border focus:border-primary focus:ring-1 focus:ring-primary px-3 py-2 text-sm rounded-btn bg-white text-text outline-none transition-all placeholder:text-text-muted"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className="w-full border border-border focus:border-primary focus:ring-1 focus:ring-primary px-3 py-2 text-sm rounded-btn bg-white text-text outline-none transition-all placeholder:text-text-muted"
              />
            </div>

            {error && (
              <div className="p-3 bg-error-bg border border-error/20 text-error text-xs rounded-btn flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {notice && (
              <div className="p-3 bg-info-bg border border-info/20 text-info text-xs rounded-btn flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full mt-2 py-2.5 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-semibold text-sm rounded-btn transition-colors shadow-sm flex items-center justify-center"
            >
              {busy ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Please wait...
                </span>
              ) : isLogin ? (
                'Sign in'
              ) : (
                'Sign up'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-text-secondary mt-6">
            By continuing, you agree to{' '}
            <a href="#" className="text-primary hover:underline">
              Terms
            </a>{' '}
            &{' '}
            <a href="#" className="text-primary hover:underline">
              Privacy
            </a>
            .
          </p>

          <div className="border-t border-border mt-6 pt-4 text-center">
            <p className="text-sm text-text-secondary">
              {isLogin ? (
                <>
                  Don't have an account?{' '}
                  <Link href="/signup" className="text-primary hover:underline font-semibold">
                    Sign up free
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <Link href="/login" className="text-primary hover:underline font-semibold">
                    Sign in
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
