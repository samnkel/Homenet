import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-sand bg-charcoal text-white">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brown">
                <Store className="h-4 w-4" />
              </div>
              <span className="font-display text-lg font-semibold">Home-farry &amp; Co</span>
            </div>
            <p className="mt-3 text-sm text-white/70">
              Premium furniture from trusted local businesses across South Africa.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50">
              Shop
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li><Link to="/category/sofas" className="hover:text-white">Sofas</Link></li>
              <li><Link to="/category/beds" className="hover:text-white">Beds</Link></li>
              <li><Link to="/category/dining" className="hover:text-white">Dining</Link></li>
              <li><Link to="/search" className="hover:text-white">All Furniture</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50">
              For Businesses
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li><Link to="/seller/onboarding" className="hover:text-white">Sell with us</Link></li>
              <li><Link to="/seller" className="hover:text-white">Seller dashboard</Link></li>
              <li><Link to="/login" className="hover:text-white">Seller login</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50">
              Support
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li><Link to="/account" className="hover:text-white">My account</Link></li>
              <li><Link to="/settings" className="hover:text-white">Settings</Link></li>
              <li><Link to="/orders" className="hover:text-white">Track order</Link></li>
              <li><a href="#" className="hover:text-white">Help centre</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/50">
          © {new Date().getFullYear()} Home-farry &amp; Co.
        </div>
      </div>
    </footer>
  );
}
