'use client';
import { useMemo } from 'react';
import { Printer, MapPin, Phone, Package, Truck } from 'lucide-react';
import { useStore } from '@/lib/store';
import { fmtDate, fmtDateTime, ORDER_STATUS } from '@/lib/format';

/**
 * Printable driver slip (browser print → PDF): where to pick each item up, where to drop it,
 * how many units — everything about the order except pricing.
 */
export default function DriverSlip({ order, back }) {
  const settings = useStore((s) => s.settings);
  const warehouses = useStore((s) => s.warehouses);
  const users = useStore((s) => s.users);
  const drivers = useStore((s) => s.drivers);
  const store = settings.store || {};
  const driver = drivers.find((d) => d.id === order.driverId) || order.driver;
  const a = order.address || null;
  const c = order.customer || {};

  // one pickup stop per warehouse, in the order the items appear
  const stops = useMemo(() => {
    const map = new Map();
    order.items.forEach((i) => {
      const key = i.warehouseId || (i.productId ? 'unassigned' : 'direct');
      if (!map.has(key)) {
        const w = warehouses.find((x) => x.id === i.warehouseId);
        const v = users.find((u) => u.id === (w?.vendorId || i.vendorId));
        map.set(key, { key, w, v, items: [] });
      }
      map.get(key).items.push(i);
    });
    return [...map.values()];
  }, [order.items, warehouses, users]);

  const units = order.items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const unitLabel = (i) => (i.unit && i.unit !== 'units' ? i.unit : 'units');
  const mapsLink = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  const addr = (x) => [x.line1, [x.city, x.state].filter(Boolean).join(', '), x.postcode].filter(Boolean).join(' ');

  return (
    <div className="slip-page">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-5">
        {back}
        <button type="button" onClick={() => window.print()} className="dash-btn dash-btn-navy"><Printer /> Print / Save PDF</button>
      </div>

      <article className="dash-card p-6 sm:p-10 max-w-[880px] mx-auto bg-white">
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-navy/10">
          <div>
            <img src="/brand/logo.webp" alt="JOLOF TRADING" className="h-16 w-auto" />
            <p className="text-[12.5px] text-charcoal/65 mt-3 leading-relaxed">{store.name || 'JOLOF TRADING'}<br />{store.address}<br />{store.phone}</p>
          </div>
          <div className="sm:text-right">
            <p className="font-display text-[2rem] text-navy leading-none">Driver slip</p>
            <p className="text-[14px] font-extrabold text-navy mt-2">{order.id}</p>
            <dl className="mt-3 text-[12.5px] text-charcoal/70 space-y-0.5">
              <div><dt className="inline">Order date: </dt><dd className="inline font-bold text-navy">{fmtDate(order.createdAt)}</dd></div>
              <div><dt className="inline">Status: </dt><dd className="inline font-bold text-navy">{ORDER_STATUS[order.status]?.label || order.status}</dd></div>
              <div><dt className="inline">Printed: </dt><dd className="inline font-bold text-navy">{fmtDateTime(new Date().toISOString())}</dd></div>
            </dl>
          </div>
        </header>

        <section className="grid sm:grid-cols-3 gap-4 py-6 border-b border-navy/10 text-[13px]">
          <div>
            <p className="dash-label">Driver</p>
            {driver ? (
              <>
                <p className="font-bold text-navy">{driver.name}</p>
                <p className="text-charcoal/70">{[driver.vehicle, driver.plate].filter(Boolean).join(' · ')}</p>
                {driver.phone && <p className="text-charcoal/70">{driver.phone}</p>}
              </>
            ) : <p className="text-charcoal/55">Not assigned yet</p>}
          </div>
          <div>
            <p className="dash-label">Load</p>
            <p className="font-bold text-navy">{order.items.length} line{order.items.length === 1 ? '' : 's'} · {units} unit{units === 1 ? '' : 's'}</p>
            <p className="text-charcoal/70">{stops.length} pickup stop{stops.length === 1 ? '' : 's'}</p>
          </div>
          <div>
            <p className="dash-label">Distance</p>
            <p className="font-bold text-navy">{order.deliveryMiles ? `~${Math.round(order.deliveryMiles)} mi` : '—'}</p>
            {order.tracking && <p className="text-charcoal/70">Tracking: {order.tracking}</p>}
          </div>
        </section>

        {/* Pickups */}
        <section className="py-6">
          <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-navy uppercase tracking-[.08em]"><Package className="w-4 h-4 text-gold" /> Pick up</h2>
          <ol className="mt-4 space-y-5">
            {stops.map((s, n) => (
              <li key={s.key} className="slip-stop rounded-2xl border border-navy/10 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 px-4 py-3 bg-ivory/70 border-b border-navy/10">
                  <div className="flex gap-3">
                    <span className="w-7 h-7 rounded-full bg-navy text-white grid place-items-center text-[12px] font-extrabold shrink-0">{n + 1}</span>
                    <div className="text-[13px]">
                      {s.w ? (
                        <>
                          <p className="font-bold text-navy">{s.w.name}</p>
                          <p className="text-charcoal/75">{addr(s.w) || s.w.suburb}</p>
                          <p className="text-charcoal/60">{s.v?.isHouse ? 'JOLOF TRADING' : s.v?.company || s.v?.name}{s.v?.phone ? ` · ${s.v.phone}` : ''}</p>
                        </>
                      ) : s.key === 'direct' ? (
                        <p className="font-bold text-navy">Direct from JOLOF TRADING</p>
                      ) : (
                        <p className="font-bold text-[#B4432F]">Pickup location not assigned yet — check with dispatch</p>
                      )}
                    </div>
                  </div>
                  {s.w && addr(s.w) && <a href={mapsLink(addr(s.w))} target="_blank" rel="noreferrer" className="no-print text-[12px] font-bold text-emerald hover:text-navy inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Open in Maps</a>}
                </div>
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-[10.5px] uppercase tracking-[.12em] text-charcoal/55 border-b border-navy/5">
                      <th className="py-2 pl-4 font-extrabold w-8">✓</th>
                      <th className="py-2 font-extrabold">Item</th>
                      <th className="py-2 pr-4 font-extrabold text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.items.map((i) => (
                      <tr key={i.id} className="border-b border-navy/5 last:border-0 align-top">
                        <td className="py-2.5 pl-4"><span className="inline-block w-4 h-4 rounded border-2 border-navy/30" /></td>
                        <td className="py-2.5 pr-3">
                          <p className="font-bold text-navy">{i.name}</p>
                          {i.size && <p className="text-[12px] text-charcoal/55">{i.size}</p>}
                        </td>
                        <td className="py-2.5 pr-4 text-right whitespace-nowrap font-extrabold text-navy">{i.qty} <span className="font-semibold text-charcoal/60 text-[12px]">{unitLabel(i)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </li>
            ))}
          </ol>
        </section>

        {/* Drop-off */}
        <section className="py-6 border-t border-navy/10">
          <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-navy uppercase tracking-[.08em]"><Truck className="w-4 h-4 text-gold" /> Drop off</h2>
          <div className="mt-4 grid sm:grid-cols-2 gap-6 text-[13.5px]">
            <div>
              <p className="dash-label">Deliver to</p>
              <p className="font-bold text-navy">{c.company || c.name}</p>
              {c.company && <p className="text-charcoal/75">Attn: {c.name}</p>}
              {c.phone && <p className="flex items-center gap-1.5 text-charcoal/75 mt-1"><Phone className="w-3.5 h-3.5 text-navy/40" />{c.phone}</p>}
            </div>
            <div>
              <p className="dash-label">Address</p>
              {a ? (
                <>
                  <p className="text-charcoal/80 leading-relaxed">{a.label && <b className="text-navy">{a.label}<br /></b>}{a.line1}<br />{a.city} {a.state} {a.postcode}<br />{a.country || 'United States'}</p>
                  <a href={mapsLink(addr(a))} target="_blank" rel="noreferrer" className="no-print mt-1 text-[12px] font-bold text-emerald hover:text-navy inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Open in Maps</a>
                </>
              ) : <p className="text-charcoal/55">No address on file — call the customer.</p>}
            </div>
          </div>
          {order.notes && <p className="mt-4 text-[13px] bg-ivory rounded-xl p-3"><b className="text-navy">Customer note:</b> {order.notes}</p>}
          <p className="mt-4 text-[13px]"><b className="text-navy">Payment:</b> Cash on delivery{order.payment === 'paid' ? ' — already collected' : ' — collect payment at drop-off (amount on the customer invoice)'}.</p>
        </section>

        <footer className="mt-4 pt-6 border-t border-navy/10 grid sm:grid-cols-2 gap-8 text-[12.5px] text-charcoal/65">
          <div><p className="border-b border-navy/30 h-10" /><p className="mt-1.5">Received by (name &amp; signature)</p></div>
          <div><p className="border-b border-navy/30 h-10" /><p className="mt-1.5">Date &amp; time delivered</p></div>
        </footer>
      </article>
      <style>{`
        @media print {
          aside, nav, header.no-print, .no-print, [role="status"] { display: none !important; }
          body { background: #fff !important; }
          main { padding: 0 !important; }
          .slip-page .dash-card { border: none !important; box-shadow: none !important; padding: 0 !important; }
          .slip-stop { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
