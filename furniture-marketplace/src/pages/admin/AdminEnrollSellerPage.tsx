import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, UserPlus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import * as api from '../../services/api';

function generateTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const randomValues = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(randomValues, (value) => alphabet[value % alphabet.length]).join('');
}

export function AdminEnrollSellerPage() {
  const [saving, setSaving] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState(generateTemporaryPassword);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('businessName') || '').trim();
    const firstName = String(formData.get('firstName') || '').trim();
    const lastName = String(formData.get('lastName') || '').trim();
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const phone = String(formData.get('phone') || '').trim();
    const city = String(formData.get('city') || '').trim();
    const suburb = String(formData.get('suburb') || '').trim();
    const address = String(formData.get('address') || '').trim();
    const description = String(formData.get('description') || '').trim();

    if (
      !name ||
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !city ||
      !suburb ||
      !address ||
      !description
    ) {
      toast('Complete all seller and business details before saving', 'error');
      setSaving(false);
      return;
    }

    try {
      await api.enrollSeller({
        email,
        firstName,
        lastName,
        phone,
        businessName: name,
        description,
        city,
        suburb,
        address,
        businessPhone: phone,
        businessEmail: email,
        temporaryPassword,
      });
      toast('Seller account created; temporary password emailed', 'success');
      navigate('/admin/businesses');
    } catch (error) {
      console.error('Unable to save seller enrollment:', error);
      toast(
        error instanceof Error ? error.message : 'Could not save the enrollment.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/admin/businesses"
        className="inline-flex items-center gap-2 text-sm text-brown hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sellers
      </Link>
      <div className="mt-5">
        <h1 className="font-display text-2xl font-semibold text-charcoal">
          Enroll a furniture seller
        </h1>
        <p className="mt-1 text-sm text-muted">
          Create a seller login and business profile. The seller will receive this temporary password by email and must change it after signing in.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-5 rounded-xl border border-sand bg-white p-5 shadow-soft sm:p-7"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-medium text-charcoal">
            Business name
            <input
              name="businessName"
              required
              maxLength={100}
              className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 font-normal outline-none focus:border-brown"
            />
          </label>
          <label className="text-sm font-medium text-charcoal">
            Owner&apos;s first name
            <input
              name="firstName"
              required
              maxLength={100}
              className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 font-normal outline-none focus:border-brown"
            />
          </label>
          <label className="text-sm font-medium text-charcoal">
            Owner&apos;s last name
            <input
              name="lastName"
              required
              maxLength={100}
              className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 font-normal outline-none focus:border-brown"
            />
          </label>
          <label className="text-sm font-medium text-charcoal">
            Business email
            <input
              type="email"
              name="email"
              required
              maxLength={254}
              className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 font-normal outline-none focus:border-brown"
            />
          </label>
          <label className="text-sm font-medium text-charcoal">
            Phone number
            <input
              type="tel"
              name="phone"
              required
              maxLength={30}
              className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 font-normal outline-none focus:border-brown"
            />
          </label>
          <label className="text-sm font-medium text-charcoal">
            City
            <input
              name="city"
              required
              maxLength={80}
              className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 font-normal outline-none focus:border-brown"
            />
          </label>
          <label className="text-sm font-medium text-charcoal">
            Suburb
            <input
              name="suburb"
              required
              maxLength={80}
              className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 font-normal outline-none focus:border-brown"
            />
          </label>
        </div>
        <label className="block text-sm font-medium text-charcoal">
          Street address
          <input
            name="address"
            required
            maxLength={200}
            className="mt-1 h-11 w-full rounded-lg border border-sand bg-ivory px-3 font-normal outline-none focus:border-brown"
          />
        </label>
        <label className="block text-sm font-medium text-charcoal">
          Business description
          <textarea
            name="description"
            required
            maxLength={1000}
            rows={4}
            className="mt-1 w-full rounded-lg border border-sand bg-ivory px-3 py-2 font-normal outline-none focus:border-brown"
          />
        </label>
        <label className="block text-sm font-medium text-charcoal">
          Temporary password
          <span className="mt-1 flex gap-2">
            <input
              name="temporaryPassword"
              type="text"
              value={temporaryPassword}
              readOnly
              required
              minLength={12}
              autoComplete="off"
              className="h-11 min-w-0 flex-1 rounded-lg border border-sand bg-cream px-3 font-mono font-normal outline-none focus:border-brown"
            />
            <Button
              type="button"
              variant="outline"
              aria-label="Generate a new temporary password"
              title="Generate a new temporary password"
              disabled={saving}
              onClick={() => setTemporaryPassword(generateTemporaryPassword())}
            >
              <RefreshCw className="h-4 w-4" />
              Generate
            </Button>
          </span>
          <span className="mt-1 block text-xs font-normal text-muted">
            This password expires after 24 hours and must be changed on first login.
          </span>
        </label>
        <div className="flex flex-col-reverse justify-between gap-3 border-t border-sand pt-5 sm:flex-row">
          <Link to="/admin/businesses">
            <Button type="button" variant="outline" fullWidth>
              Cancel
            </Button>
          </Link>
          <Button type="submit" loading={saving}>
            <UserPlus className="h-4 w-4" />
            Save seller enrollment
          </Button>
        </div>
      </form>
    </div>
  );
}
