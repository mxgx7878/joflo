'use client';
import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Inbox, Package, Wheat, ShoppingBag, Mail, Layers } from 'lucide-react';
import { useStore, useStoreReady, quoteTotal } from '@/lib/store';
import { money, timeAgo, INQUIRY_STATUS, INQUIRY_TYPE, qtyUnit } from '@/lib/format';
import { PageHeader, Pill, Tabs, EmptyState } from '@/components/ui';
import { Card, SearchBox, Select, Skeleton } from '@/components/admin/common';

const TYPE_ICON = { bulk: Layers, product: Package, cart: ShoppingBag, commodity: Wheat, contact: Mail };
const STATUSES = ['all', 'new', 'in_review', 'quoted', 'accepted', 'declined', 'closed'];

function InquiriesInner() {
  const ready = useStoreReady();
  const inquiries = useStore((s) => s.inquiries);
  const sp = useSearchParams();
  const [tab, setTab] = useState(sp.get('status') || 'all');
  const [type, setType] = useState(sp.get('type') || '');
  const [q, setQ] = useState('');

  const counts = useMemo(() => Object.fromEntries(STATUSES.map((s) => [s, s === 'all' ? inquiries.length : inquiries.filter((i) => i.status === s).length])), [inquiries]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return inquiries.filter((i) => (tab === 'all' || i.status === tab) && (!type || i.type === type)
      && (!t || `${i.id} ${i.name} ${i.company} ${i.email} ${i.message} ${i.items.map((x) => x.name).join(' ')}`.toLowerCase().includes(t)));
  }, [inquiries, tab, type, q]);

  if (!ready) return <Skeleton />;

  return (
    <>
      <PageHeader kicker="Sales" title="Inquiries & quotes"
        sub="Everything sent from the storefront — bulk pricing, product enquiries, cart quotes, commodity requests and contact messages. Reply with a quote; when the customer accepts it, an order is created automatically." />

      <ol className="mb-5 grid sm:grid-cols-4 gap-2 text-[12px] font-bold">
        {[['1', 'Inquiry arrives', 'New'], ['2', 'You review & build a quote', 'In review'], ['3', 'Customer accepts in their account', 'Quote sent'], ['4', 'Order is created', 'Accepted']].map(([n, t, s]) => (
          <li key={n} className="flex items-center gap-3 bg-white border border-navy/[.07] rounded-2xl px-4 py-3">
            <span className="w-7 h-7 rounded-full bg-navy text-gold-soft grid place-items-center text-[12px] font-extrabold shrink-0">{n}</span>
            <span className="leading-tight"><span className="block text-navy">{t}</span><span className="block text-[11px] text-charcoal/45 font-semibold">{s}</span></span>
          </li>
        ))}
      </ol>

      <Card pad={false}>
        <div className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center gap-3 justify-between border-b border-navy/5">
          <Tabs value={tab} onChange={setTab} tabs={STATUSES.map((s) => ({ value: s, label: s === 'all' ? 'All' : INQUIRY_STATUS[s].label, count: counts[s] }))} />
          <div className="flex gap-2 min-w-0">
            <Select value={type} onChange={setType} options={[{ value: '', label: 'All types' }, ...Object.entries(INQUIRY_TYPE).map(([value, label]) => ({ value, label }))]} />
            <SearchBox value={q} onChange={setQ} placeholder="Name, company, product…" className="flex-1 min-w-0 xl:w-[260px]" />
          </div>
        </div>
        {list.length === 0 ? <EmptyState icon={Inbox} title="No inquiries here" body="New requests from the storefront appear here instantly." /> : (
          <ul className="divide-y divide-navy/5">
            {list.map((i) => {
              const Icon = TYPE_ICON[i.type] || Inbox;
              const isNew = i.status === 'new';
              return (
                <li key={i.id}>
                  <Link href={`/admin/inquiries/${i.id}`} className={`flex gap-4 px-5 py-4 hover:bg-ivory/70 transition ${isNew ? 'bg-gold-pale/30' : ''}`}>
                    <span className={`w-10 h-10 rounded-full grid place-items-center shrink-0 ${isNew ? 'bg-gold-soft text-navy' : 'bg-ivory text-navy/60'}`}><Icon className="w-[18px] h-[18px]" /></span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className={`text-[14px] text-navy ${isNew ? 'font-extrabold' : 'font-bold'}`}>{i.company || i.name}</p>
                        {i.company && <span className="text-[12.5px] text-charcoal/50">{i.name}</span>}
                        {!i.userId && <span className="pill bg-sand text-charcoal/60">Guest</span>}
                        <span className="ml-auto text-[11.5px] text-charcoal/45 whitespace-nowrap">{timeAgo(i.createdAt)}</span>
                      </div>
                      <p className="text-[12px] font-bold text-charcoal/50 mt-0.5">{i.id} · {INQUIRY_TYPE[i.type]}{i.dept ? ` · ${i.dept}` : ''}{i.items.length ? ` · ${i.items.length} item${i.items.length > 1 ? 's' : ''}` : ''}</p>
                      <p className="text-[13px] text-charcoal/70 mt-1 line-clamp-1">{i.message || i.items.map((x) => `${qtyUnit(x.qty, x.unit)} ${x.name}`).join(', ')}</p>
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
                      <Pill meta={INQUIRY_STATUS[i.status]} />
                      {i.quote && <span className="text-[12.5px] font-extrabold text-navy">{money(quoteTotal(i.quote))}</span>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}

export default function InquiriesPage() {
  return <Suspense fallback={<Skeleton />}><InquiriesInner /></Suspense>;
}
