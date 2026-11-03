'use client';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { money, fmtDate, ORDER_STATUS, paymentMeta } from '@/lib/format';
import { productImg } from '@/lib/catalogue';
import { Pill } from '@/components/ui';

function Thumbs({ items }) {
  return (
    <div className="flex -space-x-2 shrink-0">
      {items.slice(0, 3).map((it, i) => (
        <img key={i} src={productImg(it)} alt="" className="w-9 h-9 rounded-lg object-contain bg-white p-0.5 border border-navy/10" />
      ))}
      {items.length > 3 && <span className="w-9 h-9 rounded-lg bg-ivory border border-navy/10 grid place-items-center text-[11px] font-extrabold text-navy">+{items.length - 3}</span>}
    </div>
  );
}

/** Orders table on desktop, cards on mobile */
export default function OrdersList({ orders, compact = false }) {
  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="dash-table">
          <thead>
            <tr><th>Order</th><th>Date</th><th>Items</th><th>Status</th>{!compact && <th>Payment</th>}<th className="!text-right">Total</th><th /></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/account/orders/${o.id}`} className="font-extrabold text-navy hover:text-emerald whitespace-nowrap">{o.id}</Link>
                  {o.source === 'quote' && <span className="block text-[11px] text-[#5B3FA0] font-bold">From quote {o.inquiryId}</span>}
                </td>
                <td className="text-charcoal/70 whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                <td><div className="flex items-center gap-3"><Thumbs items={o.items} />{!compact && <span className="text-[12.5px] text-charcoal/60 whitespace-nowrap">{o.items.reduce((a, i) => a + i.qty, 0)} units</span>}</div></td>
                <td><Pill meta={ORDER_STATUS[o.status]} /></td>
                {!compact && <td><Pill meta={paymentMeta(o)} /></td>}
                <td className="text-right font-extrabold text-navy whitespace-nowrap">{money(o.total)}</td>
                <td className="text-right"><Link href={`/account/orders/${o.id}`} className="inline-flex items-center gap-1 text-[12.5px] font-bold text-emerald hover:text-navy">View <ChevronRight className="w-4 h-4" /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="md:hidden divide-y divide-navy/5">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/account/orders/${o.id}`} className="flex items-center gap-3 px-5 py-4 active:bg-ivory">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-navy">{o.id}</span>
                  <Pill meta={ORDER_STATUS[o.status]} />
                </div>
                <p className="text-[12px] text-charcoal/55 mt-1">{fmtDate(o.createdAt)} · {o.items.length} products · <b className="text-navy">{money(o.total)}</b></p>
                <div className="mt-2"><Thumbs items={o.items} /></div>
              </div>
              <ChevronRight className="w-5 h-5 text-navy/30" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
