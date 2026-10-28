'use client';
import { Printer } from 'lucide-react';
import { useStore } from '@/lib/store';
import { money, fmtDate, INVOICE_STATUS } from '@/lib/format';
import { Pill } from '@/components/ui';

/** Printable invoice (browser print → PDF). Used in the customer account and the admin. */
export default function InvoiceView({ invoice, back }) {
  const settings = useStore((s) => s.settings);
  const store = settings.store || {};
  const inv = settings.invoice || {};
  const b = invoice.billTo || {};
  const a = invoice.shipTo || null;
  return (
    <div className="invoice-page">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-5">
        {back}
        <button type="button" onClick={() => window.print()} className="dash-btn dash-btn-navy"><Printer /> Print / Save PDF</button>
      </div>
      <article className="dash-card p-6 sm:p-10 max-w-[880px] mx-auto bg-white">
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-navy/10">
          <div>
            <img src="/brand/logo.webp" alt="JOLOF TRADING" className="h-16 w-auto" />
            <p className="text-[12.5px] text-charcoal/65 mt-3 leading-relaxed">{store.name || 'JOLOF TRADING'}<br />{store.address}<br />{store.email}{store.phone ? ` · ${store.phone}` : ''}</p>
          </div>
          <div className="sm:text-right">
            <p className="font-display text-[2rem] text-navy leading-none">Invoice</p>
            <p className="text-[14px] font-extrabold text-navy mt-2">{invoice.id}</p>
            <div className="mt-2 sm:flex sm:justify-end"><Pill meta={INVOICE_STATUS[invoice.status] || INVOICE_STATUS.unpaid} /></div>
            <dl className="mt-3 text-[12.5px] text-charcoal/70 space-y-0.5">
              <div><dt className="inline">Issued: </dt><dd className="inline font-bold text-navy">{fmtDate(invoice.issuedAt)}</dd></div>
              {invoice.dueAt && <div><dt className="inline">Due: </dt><dd className="inline font-bold text-navy">{fmtDate(invoice.dueAt)}</dd></div>}
              <div><dt className="inline">Order: </dt><dd className="inline font-bold text-navy">{invoice.orderId}</dd></div>
            </dl>
          </div>
        </header>

        <section className="grid sm:grid-cols-2 gap-6 py-6 text-[13.5px]">
          <div>
            <p className="dash-label">Bill to</p>
            <p className="font-bold text-navy">{b.company || b.name}</p>
            {b.company && <p className="text-charcoal/70">{b.name}</p>}
            <p className="text-charcoal/70">{b.email}{b.phone ? ` · ${b.phone}` : ''}</p>
          </div>
          {a && (
            <div>
              <p className="dash-label">Deliver to</p>
              <p className="text-charcoal/80 leading-relaxed">{a.line1}<br />{a.city} {a.state} {a.postcode}<br />{a.country || 'United States'}</p>
            </div>
          )}
        </section>

        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-y border-navy/10 text-left text-[11px] uppercase tracking-[.12em] text-charcoal/55">
              <th className="py-2.5 font-extrabold">Item</th><th className="py-2.5 font-extrabold text-right">Qty</th><th className="py-2.5 font-extrabold text-right">Unit price</th><th className="py-2.5 font-extrabold text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.lines || []).map((l, i) => (
              <tr key={i} className="border-b border-navy/5 align-top">
                <td className="py-3 pr-3"><p className="font-bold text-navy">{l.name}</p>{l.size && <p className="text-[12px] text-charcoal/55">{l.size}</p>}</td>
                <td className="py-3 text-right whitespace-nowrap">{l.qty}{l.unit && l.unit !== 'units' ? ` ${l.unit}` : ''}</td>
                <td className="py-3 text-right whitespace-nowrap">{money(l.price)}</td>
                <td className="py-3 text-right whitespace-nowrap font-bold text-navy">{money(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-5 ml-auto max-w-[300px] text-[13.5px] space-y-1.5">
          <div className="flex justify-between"><span className="text-charcoal/60">Subtotal</span><span className="font-bold">{money(invoice.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-charcoal/60">Delivery</span><span className="font-bold">{invoice.deliveryFee ? money(invoice.deliveryFee) : 'Free'}</span></div>
          {invoice.discount > 0 && <div className="flex justify-between"><span className="text-charcoal/60">Discount</span><span className="font-bold">−{money(invoice.discount)}</span></div>}
          <div className="flex justify-between pt-2 border-t border-navy/15 text-[17px]"><span className="font-extrabold text-navy">Total due</span><span className="font-extrabold text-navy">{money(invoice.total)} <span className="text-[11px] text-charcoal/45">USD</span></span></div>
        </div>

        <footer className="mt-8 pt-5 border-t border-navy/10 text-[12.5px] text-charcoal/65 space-y-2">
          <p><b className="text-navy">Payment:</b> {invoice.notes || inv.payTo} Please use <b className="text-navy">{invoice.id}</b> as your payment reference.</p>
          {inv.footer && <p>{inv.footer}</p>}
        </footer>
      </article>
      <style>{`
        @media print {
          aside, nav, header.no-print, .no-print, [role="status"] { display: none !important; }
          body { background: #fff !important; }
          main { padding: 0 !important; }
          .invoice-page .dash-card { border: none !important; box-shadow: none !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
