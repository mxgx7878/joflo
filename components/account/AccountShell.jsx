'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Clock3, FileText, Heart, LayoutDashboard, LogOut, Package, ShieldCheck, Store, UserRound } from 'lucide-react';
import { useStore, useCurrentUser, useStoreReady } from '@/lib/store';
import { Logo } from '@/components/ui';
import { PageLoader, useMyInquiries } from './shared';

const NAV = [
  { href: '/account', label: 'Overview', short: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/account/orders', label: 'My Orders', short: 'Orders', icon: Package },
  { href: '/account/quotes', label: 'Quotes & Inquiries', short: 'Quotes', icon: FileText },
  { href: '/account/saved', label: 'Saved Items', short: 'Saved', icon: Heart },
  { href: '/account/profile', label: 'Profile & Addresses', short: 'Profile', icon: UserRound },
];

export function TypeBadge({ user, dark = false }) {
  const retailer = user.type === 'retailer';
  return (
    <span className={`pill ${retailer ? (dark ? 'bg-gold-soft text-navy' : 'bg-gold-pale text-[#8a6417]') : dark ? 'bg-white/15 text-white' : 'bg-[#E6EEF8] text-navy-600'}`}>
      {retailer ? <Store className="w-3 h-3" /> : <UserRound className="w-3 h-3" />}{retailer ? 'Retailer' : 'Individual'}
    </span>
  );
}

export default function AccountShell({ children }) {
  const ready = useStoreReady();
  const user = useCurrentUser();
  const router = useRouter();
  const path = usePathname();
  const logout = useStore((s) => s.logout);
  const wishCount = useStore((s) => s.wish.length);
  const inquiries = useMyInquiries();
  const quotesWaiting = inquiries.filter((i) => i.status === 'quoted').length;

  useEffect(() => {
    if (ready && !user) router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [ready, user, path, router]);

  const isActive = (n) => (n.exact ? path === n.href : path.startsWith(n.href));
  const badge = (n) => (n.href === '/account/quotes' && quotesWaiting ? quotesWaiting : n.href === '/account/saved' && wishCount ? wishCount : null);

  const doLogout = () => { logout(); router.push('/'); };

  if (!ready || !user) {
    return <div className="min-h-screen bg-ivory p-6 lg:p-10"><PageLoader /></div>;
  }

  if (user.role === 'admin') {
    return (
      <div className="min-h-screen bg-ivory grid place-items-center p-6">
        <div className="dash-card max-w-md w-full p-8 text-center">
          <span className="mx-auto w-14 h-14 rounded-full bg-navy text-gold-soft grid place-items-center"><ShieldCheck className="w-6 h-6" /></span>
          <h1 className="font-display text-2xl text-navy mt-5">You're signed in as admin</h1>
          <p className="text-[14px] text-charcoal/60 mt-2">The customer account area is for shoppers. Head to the admin dashboard, or sign out to use a customer account.</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/admin" className="btn btn-navy">Open admin dashboard</Link>
            <button type="button" onClick={doLogout} className="btn btn-line-dark">Sign out</button>
          </div>
        </div>
      </div>
    );
  }

  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-ivory lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* Sidebar (desktop) */}
      <aside className="print:hidden hidden lg:flex flex-col bg-navy text-white sticky top-0 h-screen">
        <div className="px-6 pt-6 pb-5">
          <div className="bg-white rounded-2xl px-4 py-3 inline-block"><Logo className="h-12" /></div>
        </div>
        <div className="mx-4 rounded-2xl bg-white/[.06] border border-white/10 p-4 flex items-center gap-3">
          <span className="w-11 h-11 rounded-full bg-gold-soft text-navy grid place-items-center font-extrabold shrink-0">{initials}</span>
          <div className="min-w-0">
            <p className="font-bold text-[14px] truncate">{user.name}</p>
            {user.company && <p className="text-[11.5px] text-white/55 truncate">{user.company}</p>}
            <div className="mt-1.5"><TypeBadge user={user} dark /></div>
          </div>
        </div>
        <nav className="flex-1 px-3 mt-5 space-y-1" aria-label="Account">
          {NAV.map((n) => {
            const on = isActive(n);
            const b = badge(n);
            return (
              <Link key={n.href} href={n.href} aria-current={on ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 h-11 rounded-xl text-[13.5px] font-semibold transition ${on ? 'bg-white text-navy' : 'text-white/75 hover:bg-white/[.07] hover:text-white'}`}>
                <n.icon className={`w-[18px] h-[18px] ${on ? 'text-emerald' : ''}`} strokeWidth={1.8} />
                <span className="flex-1">{n.label}</span>
                {b && <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10.5px] font-extrabold grid place-items-center ${on ? 'bg-gold-soft text-navy' : 'bg-gold text-navy'}`}>{b}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pb-5 space-y-1 border-t border-white/10 pt-4">
          <Link href="/" className="flex items-center gap-3 px-4 h-11 rounded-xl text-[13.5px] font-semibold text-white/75 hover:bg-white/[.07] hover:text-white"><ArrowLeft className="w-[18px] h-[18px]" strokeWidth={1.8} />Back to store</Link>
          <button type="button" onClick={doLogout} className="w-full flex items-center gap-3 px-4 h-11 rounded-xl text-[13.5px] font-semibold text-white/75 hover:bg-white/[.07] hover:text-gold-soft"><LogOut className="w-[18px] h-[18px]" strokeWidth={1.8} />Log out</button>
        </div>
      </aside>

      {/* Top bar + tabs (mobile / tablet) */}
      <div className="print:hidden lg:hidden sticky top-0 z-40 bg-white border-b border-navy/5">
        <div className="px-4 h-[64px] flex items-center justify-between gap-3">
          <Logo className="h-[44px]" />
          <div className="flex items-center gap-2">
            <Link href="/" className="icon-btn" aria-label="Back to store"><Store /></Link>
            <button type="button" onClick={doLogout} className="icon-btn" aria-label="Log out"><LogOut /></button>
          </div>
        </div>
        <nav className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 pb-3" aria-label="Account">
          {NAV.map((n) => {
            const on = isActive(n);
            const b = badge(n);
            return (
              <Link key={n.href} href={n.href} aria-current={on ? 'page' : undefined}
                className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[12.5px] font-bold border-[1.5px] transition ${on ? 'bg-navy text-white border-navy' : 'text-navy border-[#E2DED2]'}`}>
                <n.icon className="w-4 h-4" strokeWidth={1.8} />{n.short}
                {b && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-gold-soft text-navy text-[10px] font-extrabold grid place-items-center">{b}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="min-w-0 px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-[1240px] w-full">
        {user.type === 'retailer' && user.status === 'pending' && (
          <div className="mb-6 rounded-2xl bg-gold-pale border border-gold/30 p-4 flex gap-3">
            <Clock3 className="w-5 h-5 text-[#8a6417] shrink-0 mt-0.5" />
            <div className="text-[13.5px] text-[#6d4f12]">
              <p className="font-extrabold">Your trade account is awaiting approval</p>
              <p className="mt-0.5">You can browse and send quote requests now. Ordering unlocks as soon as our team approves {user.company || 'your business'}.</p>
            </div>
          </div>
        )}
        {user.status === 'suspended' && (
          <div className="mb-6 rounded-2xl bg-[#F8E7E3] p-4 text-[13.5px] text-[#B4432F] font-semibold">This account is suspended. Please contact JOLOF TRADING.</div>
        )}
        {children}
      </main>
    </div>
  );
}
