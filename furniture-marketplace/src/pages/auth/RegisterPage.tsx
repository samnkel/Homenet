import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Store } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function RegisterPage() {
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await register(form);
      if (!result.success) {
        setError(result.error || 'Registration failed');
        return;
      }
      toast('Customer account created', 'success');
      navigate((location.state as { from?: string } | null)?.from ?? '/');
    } finally {
      setSubmitting(false);
    }
  };

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

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
        <h1 className="font-display text-2xl font-semibold text-charcoal">
          Create customer account
        </h1>
        <p className="mt-1 text-sm text-muted">
          Sign up to place and track orders.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="text-sm font-medium text-charcoal">
                First name
              </label>
              <input
                id="firstName"
                autoComplete="given-name"
                value={form.firstName}
                onChange={(event) => update('firstName', event.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                required
              />
            </div>
            <div>
              <label htmlFor="lastName" className="text-sm font-medium text-charcoal">
                Last name
              </label>
              <input
                id="lastName"
                autoComplete="family-name"
                value={form.lastName}
                onChange={(event) => update('lastName', event.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-charcoal">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
              required
            />
          </div>
          <div>
            <label htmlFor="phone" className="text-sm font-medium text-charcoal">
              Phone (optional)
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(event) => update('phone', event.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-charcoal">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
              required
            />
            <p className="mt-1 text-xs text-muted">At least 6 characters.</p>
          </div>
          {error && <p role="alert" className="text-sm text-error">{error}</p>}
          <Button type="submit" fullWidth size="lg" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brown hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      <Link to="/" className="mt-6 text-sm text-brown hover:underline">
        ← Back to marketplace
      </Link>
    </div>
  );
}
