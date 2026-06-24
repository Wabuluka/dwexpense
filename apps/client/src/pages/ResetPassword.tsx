import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { AuthShell } from '../components/AuthShell';
import { api, apiErrorMessage } from '../lib/api';

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setError('');
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <AuthShell title="Invalid link" subtitle="This reset link is missing or malformed">
        <div className="text-center">
          <Link to="/forgot-password" className="font-semibold" style={{ color: 'var(--color-primary)' }}>
            Request a new reset link →
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Password reset!" subtitle="Your password has been updated">
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(22,163,74,0.1)' }}>
            <CheckCircle size={24} style={{ color: 'var(--color-success)' }} />
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Redirecting you to sign in…</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset your password" subtitle="Choose a new password for your account">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
            New password
          </label>
          <div className="auth-input-wrap">
            <Lock size={16} className="auth-input-icon" />
            <input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              required
              minLength={6}
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
            Confirm new password
          </label>
          <div className="auth-input-wrap">
            <Lock size={16} className="auth-input-icon" />
            <input
              id="confirm"
              type="password"
              placeholder="Repeat your password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
          {busy ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
    </AuthShell>
  );
}
