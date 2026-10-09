import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Store } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/PageLoader';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        toast('Signed in successfully', 'success');
        const returnTo = (location.state as { from?: string } | null)?.from;
        navigate(
          result.mustChangePassword
            ? '/change-password'
            : returnTo ??
            (result.role === 'admin'
              ? '/admin'
              : result.role === 'seller'
                ? '/seller'
                : '/')
        );
      } else {
        setError(result.error || 'Login failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {submitting && <PageLoader message="Signing you in" />}
      <div className="flex min-h-screen flex-col items-center justify-center bg-ivory px-4">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brown text-white">
            <Store className="h-5 w-5" />
          </div>
          <span className="font-display text-2xl font-semibold text-charcoal">
            Home-farry &amp; Co
          </span>
        </Link>

        <div className="w-full max-w-md rounded-2xl border border-sand bg-white p-8 shadow-elevated">
          <h1 className="font-display text-2xl font-semibold text-charcoal">Sign in</h1>
          <p className="mt-1 text-sm text-muted">
            Sign in to your portal. Browse as a guest; a customer account is required to checkout.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-charcoal">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-charcoal">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-brown hover:underline"
                >
                  Forgot seller password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                required
              />
            </div>
            {error && <p className="text-sm text-error">{error}</p>}
            <Button type="submit" fullWidth size="lg" loading={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            New to Home-farry &amp; Co?{' '}
            <Link to="/register" className="font-medium text-brown hover:underline">
              Create a customer account
            </Link>
          </p>
        </div>

        <Link to="/" className="mt-6 text-sm text-brown hover:underline">
          ← Back to marketplace
        </Link>
      </div>
    </>
  );
}
