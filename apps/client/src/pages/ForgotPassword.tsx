import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { AuthShell } from '../components/AuthShell';
import { api, apiErrorMessage } from '../lib/api';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle="A reset link has been sent if that account exists">
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(22,163,74,0.1)' }}>
            <CheckCircle size={24} style={{ color: 'var(--color-success)' }} />
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            We sent a password reset link to <strong>{email}</strong>. Check your inbox and spam folder.
          </p>
          <Link to="/login" className="auth-btn mt-2 flex w-full items-center justify-center gap-2 no-underline">
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot password?" subtitle="Enter your email and we'll send you a reset link">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
            Email address
          </label>
          <div className="auth-input-wrap">
            <Mail size={16} className="auth-input-icon" />
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm"
            style={{ backgroundColor: 'rgba(220,38,38,0.07)', color: 'var(--color-error)', border: '1px solid rgba(220,38,38,0.18)' }}>
            <AlertCircle size={15} className="flex-shrink-0" />
            {error}
          </div>
        )}

        <button type="submit" disabled={busy} className="auth-btn">
          {busy
            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            : <ArrowRight size={16} />}
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Remember your password?{' '}
        <Link to="/login" className="font-semibold" style={{ color: 'var(--color-primary)' }}>
          Sign in →
        </Link>
      </p>
    </AuthShell>
  );
}
