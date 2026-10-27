'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText, Heart, Package, RotateCcw, Sparkles, Wallet, Plus } from 'lucide-react';
import { useStore, useCurrentUser, quoteTotal } from '@/lib/store';
import { money, fmtDate, INQUIRY_TYPE } from '@/lib/format';
import { StatCard, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { SectionCard, useMyInquiries, useMyOrders } from '@/components/account/shared';
import OrdersList from '@/components/account/OrdersList';
import { TypeBadge } from '@/components/account/AccountShell';

export default function AccountOverview() {
  const user = useCurrentUser();
  const router = useRouter();
  const toast = useToast();
  const orders = useMyOrders();
  const inquiries = useMyInquiries();
  const wishCount = useStore((s) => s.wish.length);
  const products = useStore((s) => s.products);
  const addToCart = useStore((s) => s.addToCart);
  if (!user) return null;

  const active = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const quoted = inquiries.filter((i) => i.status === 'quoted');
  const openInq = inquiries.filter((i) => ['new', 'in_review'].includes(i.status));
  const spent = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const lastDelivered = orders.find((o) => o.status === 'delivered');
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const reorder = () => {
    let n = 0;
    lastDelivered.items.forEach((it) => {
      const p = products.find((x) => x.id === it.productId);
      if (p && p.status === 'active' && typeof p.price === 'number' && addToCart(p.id, it.qty)) n++;
    });
    if (!n) { toast({ text: 'These items are no longer available to order online.' }); return; }
    toast({ text: `${n} product${n === 1 ? '' : 's'} from ${lastDelivered.id} added to your cart` });
    router.push('/checkout');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="kicker">My account</p>
          <h1 className="h-display text-navy text-[1.9rem] sm:text-[2.4rem] mt-2">{greet}, {user.name.split(' ')[0]}.</h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap text-[13.5px] text-charcoal/60">
            <TypeBadge user={user} />
            {user.company && <span>{user.company}</span>}
            <span>· Customer since {fmtDate(user.createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/account/quotes/new" className="dash-btn dash-btn-ghost"><Plus />New quote request</Link>
          <Link href="/#shop" className="dash-btn dash-btn-navy">Shop products <ArrowRight /></Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={Package} label="Active orders" value={active.length} hint={`${orders.length} orders in total`} href="/account/orders" />
        <StatCard icon={FileText} tone="gold" label="Quotes to review" value={quoted.length} hint={`${openInq.length} inquiries in progress`} href="/account/quotes" />
        <StatCard icon={Heart} tone="ivory" label="Saved items" value={wishCount} hint="Your wishlist" href="/account/saved" />
        <StatCard icon={Wallet} tone="emerald" label="Total spent" value={money(spent)} hint="Excludes cancelled" />
      </div>

      {quoted.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {quoted.map((q) => (
            <div key={q.id} className="relative overflow-hidden rounded-[20px] bg-navy text-white p-5 sm:p-6">
              <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gold/20" />
              <div className="relative">
                <span className="pill bg-gold-soft text-navy"><Sparkles className="w-3 h-3" />Quote ready</span>
                <p className="font-display text-[1.45rem] mt-3 leading-snug">{q.quote.lines.length} item{q.quote.lines.length === 1 ? '' : 's'} quoted at {money(quoteTotal(q.quote))}</p>
                <p className="text-[13px] text-white/65 mt-1">{q.id} · {INQUIRY_TYPE[q.type]} · valid until {fmtDate(q.quote.validUntil)}</p>
                <Link href={`/account/quotes/${q.id}`} className="btn btn-gold mt-5 !min-h-[42px] !py-2.5">Review quote <ArrowRight className="mv" /></Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <SectionCard title="Recent orders" action={<Link href="/account/orders" className="text-[12.5px] font-bold text-emerald hover:text-navy">View all</Link>} bodyClass="pt-4">
          {orders.length ? <OrdersList compact orders={orders.slice(0, 5)} /> : (
            <EmptyState icon={Package} title="No orders yet" body="When you place an order it will show up here." action={<Link href="/#shop" className="dash-btn dash-btn-navy">Start shopping</Link>} />
          )}
        </SectionCard>

        <div className="space-y-6">
          {lastDelivered && (
            <SectionCard kicker="Quick reorder" title={`Order ${lastDelivered.id} again`}>
              <ul className="space-y-1.5 text-[13px] text-charcoal/70">
                {lastDelivered.items.slice(0, 4).map((it) => <li key={it.name} className="flex justify-between gap-3"><span className="truncate">{it.name}</span><span className="font-bold text-navy shrink-0">× {it.qty}</span></li>)}
                {lastDelivered.items.length > 4 && <li className="text-charcoal/45">+ {lastDelivered.items.length - 4} more</li>}
              </ul>
              <button type="button" onClick={reorder} className="dash-btn dash-btn-gold w-full mt-4"><RotateCcw />Add all to cart</button>
              <p className="text-[11.5px] text-charcoal/45 mt-2 text-center">Delivered {fmtDate(lastDelivered.timeline[lastDelivered.timeline.length - 1]?.at)}</p>
            </SectionCard>
          )}
          <SectionCard title="Open inquiries" action={<Link href="/account/quotes" className="text-[12.5px] font-bold text-emerald hover:text-navy">All</Link>}>
            {openInq.length ? (
              <ul className="space-y-3">
                {openInq.slice(0, 4).map((i) => (
                  <li key={i.id}>
                    <Link href={`/account/quotes/${i.id}`} className="block rounded-xl bg-ivory hover:bg-sand p-3 transition">
                      <p className="text-[13px] font-extrabold text-navy">{i.id} <span className="font-semibold text-charcoal/50">· {INQUIRY_TYPE[i.type]}</span></p>
                      <p className="text-[12px] text-charcoal/60 mt-0.5 line-clamp-1">{i.items.length ? i.items.map((x) => x.name).join(', ') : i.message}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[13px] text-charcoal/55">No inquiries waiting on our team.</p>}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
