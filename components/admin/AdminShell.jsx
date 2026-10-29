'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, MessageSquareText, Package, FolderTree, Boxes, Wheat, Users, Settings,
  Menu, X, ExternalLink, LogOut, Search, Warehouse, Truck, ClipboardCheck,
} from 'lucide-react';
import { useStore, useCurrentUser, useStoreReady } from '@/lib/store';
import { stockState } from '@/lib/format';

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart, badge: 'orders' },
  { href: '/admin/inquiries', label: 'Inquiries', icon: MessageSquareText, badge: 'inquiries' },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/product-requests', label: 'Product requests', icon: ClipboardCheck, badge: 'requests' },
  { href: '/admin/departments', label: 'Departments', icon: FolderTree },
  { href: '/admin/inventory', label: 'Inventory', icon: Boxes, badge: 'inventory' },
  { href: '/admin/vendors', label: 'Suppliers', icon: Warehouse, badge: 'vendors' },
  { href: '/admin/drivers', label: 'Drivers', icon: Truck, badge: 'drivers' },
  { href: '/admin/trading', label: 'Trading', icon: Wheat },
  { href: '/admin/customers', label: 'Customers', icon: Users, badge: 'customers' },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

function useBadges() {
  const orders = useStore((s) => s.orders);
  const inquiries = useStore((s) => s.inquiries);
  const products = useStore((s) => s.products);
  const users = useStore((s) => s.users);
  const requests = useStore((s) => s.productRequests);
  return useMemo(() => ({
    requests: requests.filter((r) => r.status === 'pending').length,
    // confirmed orders with no driver yet
    drivers: orders.filter((o) => ['confirmed', 'packed'].includes(o.status) && !o.driverId).length,
    orders: orders.filter((o) => o.status === 'pending' || (o.status !== 'cancelled' && o.items.some((i) => i.productId && !i.warehouseId))).length,
    inquiries: inquiries.filter((i) => i.status === 'new').length,
    inventory: products.filter((p) => p.status === 'active' && stockState(p) !== 'ok').length,
    customers: users.filter((u) => u.role === 'customer' && u.status === 'pending').length,
    vendors: users.filter((u) => u.role === 'vendor' && u.status === 'pending').length,
  }), [orders, inquiries, products, users, requests]);
}

function SideNav({ onNavigate }) {
  const pathname = usePathname();
  const badges = useBadges();
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin">
      <p className="px-3 mb-2 text-[10px] font-extrabold tracking-[.22em] uppercase text-white/35">Manage</p>
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

function SideBrand() {
  return (
    <div className="px-5 pt-5 pb-4 border-b border-white/10">
      <Link href="/admin" className="flex items-center gap-3">
        <span className="bg-white rounded-xl p-1.5 h-14 shrink-0"><img src="/brand/logo.webp" alt="JOLOF TRADE CENTER logo" className="h-full w-auto" /></span>
        <span className="leading-tight">
          <span className="block text-white font-extrabold text-[13px] tracking-[.08em]">JOLOF TRADING</span>
          <span className="block text-gold-soft text-[10.5px] font-bold tracking-[.2em] uppercase mt-0.5">Admin</span>
        </span>
      </Link>
    </div>
  );
}

export default function AdminShell({ children }) {
  const ready = useStoreReady();
  const user = useCurrentUser();
  const logout = useStore((s) => s.logout);
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (ready && (!user || user.role !== 'admin')) router.replace('/login?next=' + encodeURIComponent(pathname));
  }, [ready, user, router, pathname]);

  useEffect(() => { setOpen(false); }, [pathname]);

  if (!ready || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen grid place-items-center bg-ivory">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto rounded-full border-2 border-gold border-t-transparent animate-spin" />
          <p className="mt-4 text-[13px] font-semibold text-charcoal/60">Loading admin…</p>
        </div>
      </div>
    );
  }

  const onSearch = (e) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    if (/^jt-/i.test(v)) router.push('/admin/orders/' + v.toUpperCase());
    else if (/^inq-/i.test(v)) router.push('/admin/inquiries/' + v.toUpperCase());
    else router.push('/admin/products?q=' + encodeURIComponent(v));
    setQ('');
  };

  return (
    <div className="min-h-screen bg-[#F6F4EE] lg:pl-[264px] print:pl-0 print:bg-white">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex print:!hidden fixed inset-y-0 left-0 w-[264px] bg-navy flex-col z-40">
        <SideBrand />
        <SideNav />
        <div className="p-4 border-t border-white/10 text-[11.5px] text-white/40">JOLOF TRADING · Admin</div>
      </aside>

      {/* Mobile drawer */}
      <div className={`scrim fixed inset-0 z-[90] bg-navy-950/60 lg:hidden ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`drawer left fixed inset-y-0 left-0 z-[91] w-[280px] bg-navy flex flex-col lg:hidden ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="relative"><SideBrand /><button className="absolute right-3 top-3 w-10 h-10 grid place-items-center text-white/70" onClick={() => setOpen(false)} aria-label="Close menu"><X /></button></div>
        <SideNav onNavigate={() => setOpen(false)} />
      </aside>

      {/* Top bar */}
      <header className="print:hidden sticky top-0 z-30 bg-[#F6F4EE]/90 backdrop-blur border-b border-navy/[.07]">
        <div className="h-[68px] px-4 sm:px-6 lg:px-8 flex items-center gap-3">
          <button className="icon-btn lg:hidden -ml-2" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
          <Link href="/admin" className="md:hidden flex items-center gap-2"><img src="/brand/logo.webp" alt="JOLOF" className="h-9 w-auto" /><span className="text-[10.5px] font-extrabold tracking-[.2em] uppercase text-gold">Admin</span></Link>
          <form onSubmit={onSearch} className="hidden md:flex items-center gap-2 h-10 w-full max-w-[380px] rounded-full bg-white border border-navy/10 px-4 focus-within:border-gold transition">
            <Search className="w-4 h-4 text-navy/50" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order JT-…, INQ-… or product" className="flex-1 bg-transparent text-[13.5px] focus:outline-none" />
          </form>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <a href="/" target="_blank" rel="noreferrer" className="dash-btn dash-btn-ghost !h-9 !px-3 sm:!px-4"><ExternalLink /> <span className="hidden sm:inline">View store</span></a>
            <div className="hidden sm:flex items-center gap-2.5 pl-2">
              <span className="w-9 h-9 rounded-full bg-emerald text-white grid place-items-center text-[13px] font-extrabold">{user.name.split(' ').map((x) => x[0]).join('').slice(0, 2)}</span>
              <span className="leading-tight">
                <span className="block text-[13px] font-bold text-navy">{user.name}</span>
                <span className="block text-[11px] text-charcoal/50">Administrator</span>
              </span>
            </div>
            <button className="icon-btn" onClick={async () => { await logout(); router.replace('/login'); }} aria-label="Log out" title="Log out"><LogOut /></button>
          </div>
        </div>
      </header>

      <main className="min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1500px]">{children}</main>
    </div>
  );
}
