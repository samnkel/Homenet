import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertTriangle, KeyRound, Settings as SettingsIcon } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

export function SettingsPage() {
  const { user, changePassword, deleteAccount } = useAuth();
  const { clearCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  if (!user) return <Navigate to="/login" state={{ from: '/settings' }} replace />;
  if (user.role !== 'customer') {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/seller'} replace />;
  }

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('The new passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('Choose a password different from your current password.');
      return;
    }

    setSavingPassword(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      if (!result.success) {
        setPasswordError(result.error || 'Could not change your password.');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast('Password changed successfully', 'success');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDeleteError('');
    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('Type DELETE exactly to confirm permanent account deletion.');
      return;
    }

    setDeletingAccount(true);
    try {
      const result = await deleteAccount(deletePassword, deleteConfirmation);
      if (!result.success) {
        setDeleteError(result.error || 'Could not delete your account.');
        return;
      }
      clearCart();
      toast('Your account and associated data have been permanently deleted.', 'success');
      navigate('/', { replace: true });
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-brown" />
          <div>
            <h1 className="font-display text-3xl font-semibold text-charcoal">Settings</h1>
            <p className="mt-1 text-sm text-muted">Manage your account security and data.</p>
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-sand bg-white p-6 shadow-soft sm:p-8">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-brown" />
            <h2 className="text-lg font-semibold text-charcoal">Change password</h2>
          </div>
          <form onSubmit={handleChangePassword} className="mt-5 max-w-xl space-y-4">
            <label className="block text-sm font-medium text-charcoal">
              Current password
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-brown"
                required
              />
            </label>
            <label className="block text-sm font-medium text-charcoal">
              New password
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
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
            {passwordError && (
              <p role="alert" className="text-sm text-error">{passwordError}</p>
            )}
            <Button type="submit" loading={savingPassword}>
              Change password
            </Button>
          </form>
        </section>

        <section className="mt-6 rounded-2xl border border-error/30 bg-white p-6 shadow-soft sm:p-8">
          <div className="flex items-center gap-2 text-error">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Deactivate account</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            This permanently deletes your customer account and associated data, including your
            orders, reviews, messages, saved addresses, and wishlist. This action cannot be undone.
          </p>
          <form onSubmit={handleDeleteAccount} className="mt-5 max-w-xl space-y-4">
            <label className="block text-sm font-medium text-charcoal">
              Current password
              <input
                type="password"
                autoComplete="current-password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-error"
                required
              />
            </label>
            <label className="block text-sm font-medium text-charcoal">
              Type DELETE to confirm
              <input
                type="text"
                autoComplete="off"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 text-sm outline-none focus:border-error"
                required
              />
            </label>
            {deleteError && (
              <p role="alert" className="text-sm text-error">{deleteError}</p>
            )}
            <Button type="submit" variant="danger" loading={deletingAccount}>
              Permanently delete my account
            </Button>
          </form>
        </section>

        <Link to="/account" className="mt-6 inline-block text-sm text-brown hover:underline">
          ← Back to my account
        </Link>
      </main>
      <Footer />
    </div>
  );
}
