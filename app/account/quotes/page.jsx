'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, FileText, Plus } from 'lucide-react';
import { quoteTotal } from '@/lib/store';
import { money, fmtDate, timeAgo, INQUIRY_STATUS, INQUIRY_TYPE, qtyUnit } from '@/lib/format';
import { PageHeader, Tabs, Pill, EmptyState } from '@/components/ui';
import { useMyInquiries } from '@/components/account/shared';

const GROUPS = [
  { value: 'all', label: 'All' },
  { value: 'quoted', label: 'Quote ready' },
  { value: 'open', label: 'Awaiting reply' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'closed', label: 'Closed' },
];
const inGroup = (i, g) => g === 'all' || (g === 'open' ? ['new', 'in_review'].includes(i.status) : g === 'closed' ? ['closed', 'declined'].includes(i.status) : i.status === g);

export default function MyQuotes() {
  const inquiries = useMyInquiries();
  const [tab, setTab] = useState('all');
  const list = useMemo(() => inquiries.filter((i) => inGroup(i, tab)), [inquiries, tab]);

  return (
    <>
      <PageHeader kicker="Quotes & inquiries" title="Quotes & inquiries"
        sub="Price-on-request products, bulk orders and commodity trading are quoted by our team. Accept a quote to turn it into an order."
        actions={<Link href="/account/quotes/new" className="dash-btn dash-btn-navy"><Plus />New request</Link>} />
      <div className="dash-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-navy/5">
          <Tabs tabs={GROUPS.map((g) => ({ ...g, count: inquiries.filter((i) => inGroup(i, g.value)).length }))} value={tab} onChange={setTab} />
        </div>
        {list.length ? (
          <ul className="divide-y divide-navy/5">
            {list.map((i) => (
              <li key={i.id}>
                <Link href={`/account/quotes/${i.id}`} className={`flex items-center gap-4 px-5 sm:px-6 py-4 hover:bg-[#FCFBF8] transition ${i.status === 'quoted' ? 'bg-gold-pale/30' : ''}`}>
                  <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${i.status === 'quoted' ? 'bg-gold-soft text-navy' : 'bg-ivory text-navy'}`}><FileText className="w-5 h-5" strokeWidth={1.8} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-navy">{i.id}</span>
                      <span className="text-[12px] font-semibold text-charcoal/50">{INQUIRY_TYPE[i.type]}</span>
                      <Pill meta={INQUIRY_STATUS[i.status]} />
                    </div>
                    <p className="text-[13px] text-charcoal/65 mt-1 line-clamp-1">{i.items.length ? i.items.map((x) => `${qtyUnit(x.qty, x.unit)} ${x.name}`).join(' · ') : i.message}</p>
                    <p className="text-[11.5px] text-charcoal/45 mt-0.5">Sent {timeAgo(i.createdAt)}{i.quote?.validUntil && i.status === 'quoted' ? ` · Quote valid until ${fmtDate(i.quote.validUntil)}` : ''}</p>
                  </div>
                  {i.quote && <span className="hidden sm:block text-right"><span className="block text-[11px] font-extrabold uppercase tracking-[.12em] text-charcoal/45">Quoted</span><span className="font-extrabold text-navy">{money(quoteTotal(i.quote))}</span></span>}
                  <ChevronRight className="w-5 h-5 text-navy/30 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={FileText} title={inquiries.length ? 'Nothing here' : 'No requests yet'} body={inquiries.length ? 'No inquiries in this group.' : 'Ask for wholesale pricing on any product or request a commodity quote.'}
            action={<Link href="/account/quotes/new" className="dash-btn dash-btn-navy"><Plus />New request</Link>} />
        )}
      </div>
    </>
  );
}
