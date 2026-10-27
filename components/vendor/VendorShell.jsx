'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Package, Warehouse, Menu, X, ExternalLink, LogOut, Clock3, Ban } from 'lucide-react';
import { useStore, useCurrentUser, useStoreReady } from '@/lib/store';
import { useVendor } from './hooks';

const NAV = [
  { href: '/vendor', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/vendor/orders', label: 'My Orders', icon: ShoppingCart, badge: 'orders' },
  { href: '/vendor/products', label: 'My Products', icon: Package, badge: 'stock' },
  { href: '/vendor/warehouses', label: 'Warehouses', icon: Warehouse },
];

function SideNav({ onNavigate }) {
  const pathname = usePathname();
  const { jobs, offers } = useVendor();
  const badges = {
    orders: jobs.filter((j) => j.status === 'assigned').length,
    stock: offers.filter((o) => Object.values(o.stock || {}).reduce((s, n) => s + n, 0) === 0).length,
  };
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Supplier">
      <p className="px-3 mb-2 text-[10px] font-extrabold tracking-[.22em] uppercase text-white/35">Supplier</p>
      <ul className="space-y-0.5">
        {NAV.map((n) => {
          const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
          const count = n.badge ? badges[n.badge] : 0;
          return (
            <li key={n.href}>
              <Link href={n.href} onClick={onNavigate}
                className={`group flex items-center gap-3 h-11 px-3 rounded-xl text-[13.5px] font-semibold transition ${active ? 'bg-white/10 text-white' : 'text-white/65 hover:text-white hover:bg-white/5'}`}>
                <span className={`w-1 h-5 rounded-full -ml-1 ${active ? 'bg-gold-soft' : 'bg-transparent'}`} />
                <n.icon className={`w-[18px] h-[18px] ${active ? 'text-gold-soft' : ''}`} strokeWidth={1.8} />
                <span className="flex-1">{n.label}</span>
                {count > 0 && <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-gold-soft text-navy text-[11px] font-extrabold grid place-items-center">{count}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SideBrand({ company }) {
  return (
    <div className="px-5 pt-5 pb-4 border-b border-white/10">
      <Link href="/vendor" className="flex items-center gap-3">
        <span className="bg-white rounded-xl p-1.5 h-14 shrink-0"><img src="/brand/logo.webp" alt="JOLOF TRADE CENTER logo" className="h-full w-auto" /></span>
        <span className="leading-tight min-w-0">
          <span className="block text-white font-extrabold text-[13px] tracking-[.04em] truncate">{company}</span>
          <span className="block text-gold-soft text-[10.5px] font-bold tracking-[.2em] uppercase mt-0.5">Supplier portal</span>
        </span>
      </Link>
    </div>
  );
}

export default function VendorShell({ children }) {
  const ready = useStoreReady();
  const user = useCurrentUser();
  const logout = useStore((s) => s.logout);
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (ready && (!user || user.role !== 'vendor')) router.replace('/login?next=' + encodeURIComponent(pathname));
  }, [ready, user, router, pathname]);
  useEffect(() => { setOpen(false); }, [pathname]);

  if (!ready || !user || user.role !== 'vendor') {
    return (
      <div className="min-h-screen grid place-items-center bg-ivory">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto rounded-full border-2 border-gold border-t-transparent animate-spin" />
          <p className="mt-4 text-[13px] font-semibold text-charcoal/60">Loading supplier portal…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F4EE] lg:pl-[264px] print:pl-0 print:bg-white">
      <aside className="hidden lg:flex print:!hidden fixed inset-y-0 left-0 w-[264px] bg-navy flex-col z-40">
        <SideBrand company={user.company} />
        <SideNav />
        <div className="p-4 border-t border-white/10 text-[11.5px] text-white/40">Orders are routed to you by delivery location.</div>
      </aside>

      <div className={`scrim fixed inset-0 z-[90] bg-navy-950/60 lg:hidden ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`drawer left fixed inset-y-0 left-0 z-[91] w-[280px] bg-navy flex flex-col lg:hidden ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="relative"><SideBrand company={user.company} /><button className="absolute right-3 top-3 w-10 h-10 grid place-items-center text-white/70" onClick={() => setOpen(false)} aria-label="Close menu"><X /></button></div>
        <SideNav onNavigate={() => setOpen(false)} />
      </aside>

      <header className="print:hidden sticky top-0 z-30 bg-[#F6F4EE]/90 backdrop-blur border-b border-navy/[.07]">
        <div className="h-[68px] px-4 sm:px-6 lg:px-8 flex items-center gap-3">
          <button className="icon-btn lg:hidden -ml-2" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
          <Link href="/vendor" className="lg:hidden flex items-center gap-2"><img src="/brand/logo.webp" alt="JOLOF" className="h-9 w-auto" /><span className="text-[10.5px] font-extrabold tracking-[.2em] uppercase text-gold">Supplier</span></Link>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <a href="/" target="_blank" rel="noreferrer" className="dash-btn dash-btn-ghost !h-9 !px-3 sm:!px-4"><ExternalLink /> <span className="hidden sm:inline">View store</span></a>
            <div className="hidden sm:flex items-center gap-2.5 pl-2">
              <span className="w-9 h-9 rounded-full bg-emerald text-white grid place-items-center text-[13px] font-extrabold">{user.name.split(' ').map((x) => x[0]).join('').slice(0, 2)}</span>
              <span className="leading-tight">
                <span className="block text-[13px] font-bold text-navy">{user.name}</span>
                <span className="block text-[11px] text-charcoal/50">{user.businessType || 'Supplier'}</span>
              </span>
            </div>
            <button className="icon-btn" onClick={() => { logout(); router.replace('/login'); }} aria-label="Log out" title="Log out"><LogOut /></button>
          </div>
        </div>
      </header>

      <main className="min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1500px]">
        {user.status === 'pending' && (
          <div className="mb-6 rounded-2xl bg-gold-pale border border-gold/30 p-4 sm:p-5 flex gap-3 print:hidden">
            <Clock3 className="w-5 h-5 text-[#8a6417] shrink-0 mt-0.5" />
            <div className="text-[13.5px] text-[#6d4f12]">
              <p className="font-extrabold">Your supplier account is awaiting approval</p>
              <p className="mt-0.5">Set up your warehouses and products now — orders start coming to you once JOLOF TRADING approves the account.</p>
            </div>
          </div>
        )}
        {user.status === 'suspended' && (
          <div className="mb-6 rounded-2xl bg-[#F8E7E3] p-4 sm:p-5 flex gap-3 text-[13.5px] text-[#B4432F] print:hidden">
            <Ban className="w-5 h-5 shrink-0 mt-0.5" /><p><b>This supplier account is suspended.</b> New orders are not being routed to you. Contact JOLOF TRADING.</p>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
