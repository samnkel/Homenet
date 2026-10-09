import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Store } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import * as api from '../../services/api';

function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ivory px-4 py-10">
      <Link to="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brown text-white">
          <Store className="h-5 w-5" />
        </div>
        <span className="font-display text-2xl font-semibold text-charcoal">
          Home-farry &amp; Co
        </span>
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-sand bg-white p-8 shadow-elevated">
        <h1 className="font-display text-2xl font-semibold text-charcoal">{title}</h1>
        {children}
      </div>
      <Link to="/" className="mt-6 text-sm text-brown hover:underline">
        ← Back to marketplace
      </Link>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const response = await api.requestPasswordReset(email);
      setSent(true);
      return response;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not request a reset link.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthCard title="Reset password">
      {sent ? (
        <>
          <p className="mt-3 text-sm text-muted">
            If an account exists for that email, a reset link has been sent.
          </p>
          <Link to="/login" className="mt-6 inline-block text-sm font-medium text-brown hover:underline">
            Return to sign in
          </Link>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            Enter your account email. If it is registered, we will email an expiring reset link.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-charcoal">
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                required
              />
            </label>
            {error && <p role="alert" className="text-sm text-error">{error}</p>}
            <Button type="submit" fullWidth size="lg" disabled={saving}>
              {saving ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        </>
      )}
    </AuthCard>
  );
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const token = searchParams.get('token') ?? '';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await api.resetPassword(token, password);
      toast('Password updated. Sign in with your new password.', 'success');
      navigate('/login');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reset the password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthCard title="Choose a new password">
      {!token ? (
        <p role="alert" className="mt-3 text-sm text-error">This reset link is missing or invalid.</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-charcoal">
            New password
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
              required
            />
          </label>
          <label className="block text-sm font-medium text-charcoal">
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
              required
            />
          </label>
          {error && <p role="alert" className="text-sm text-error">{error}</p>}
          <Button type="submit" fullWidth size="lg" disabled={saving}>
            {saving ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

export function ChangeTemporaryPasswordPage() {
  const { user, changeTemporaryPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) return <Navigate to="/login" replace />;
  if (!user.mustChangePassword) {
    return <Navigate to={user.role === 'seller' ? '/seller' : '/'} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const result = await changeTemporaryPassword(password);
      if (!result.success) {
        setError(result.error || 'Could not update your password.');
        return;
      }
      toast('Password updated successfully', 'success');
      navigate('/seller', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-charcoal/60 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="temporary-password-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-sand bg-white p-8 shadow-elevated">
        <h1
          id="temporary-password-title"
          className="font-display text-2xl font-semibold text-charcoal"
        >
          Set your seller password
        </h1>
        <p className="mt-2 text-sm text-muted">
          For your security, choose a new password before using your seller account.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-charcoal">
            New password
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
              required
            />
          </label>
          <label className="block text-sm font-medium text-charcoal">
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
              required
            />
          </label>
          {error && <p role="alert" className="text-sm text-error">{error}</p>}
          <Button type="submit" fullWidth size="lg" disabled={saving}>
            {saving ? 'Updating…' : 'Change password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
