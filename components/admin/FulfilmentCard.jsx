'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Warehouse, AlertTriangle, ArrowRightLeft, MapPin } from 'lucide-react';
import { useStore } from '@/lib/store';
import { money, fmtDateTime } from '@/lib/format';
import { getLocation, locationLabel, distanceKm, fmtKm } from '@/lib/locations';
import { fulfilmentGroups, rankWarehouses, indexOffers, stockAt, FUL_STATUS, UNASSIGNED } from '@/lib/fulfilment';
import { Pill } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Card } from './common';

/** Admin view of how an order was routed, with manual reassignment. */
export default function FulfilmentCard({ order }) {
  const warehouses = useStore((s) => s.warehouses);
  const offers = useStore((s) => s.offers);
  const users = useStore((s) => s.users);
  const reassignGroup = useStore((s) => s.reassignGroup);
  const toast = useToast();
  const [pick, setPick] = useState({});
  const groups = useMemo(() => fulfilmentGroups(order), [order]);
  const vById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);
  const idx = useMemo(() => indexOffers(offers), [offers]);
  const ranked = useMemo(() => rankWarehouses({ location: order.location, warehouses, users }), [order.location, warehouses, users]);
  const closed = ['cancelled', 'delivered'].includes(order.status);

  const move = async (g) => {
    const to = pick[g.key];
    if (!to) return;
    const r = await reassignGroup(order.id, g.key, to);
    toast({ text: r.ok ? 'Shipment reassigned — the supplier will see it in their portal.' : r.error });
    if (r.ok) setPick({ ...pick, [g.key]: '' });
  };

  return (
    <Card title="Routing & suppliers" action={order.location && <span className="text-[12px] font-bold text-charcoal/55 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-emerald" />{locationLabel(order.location)}</span>} className="print:hidden">
      <div className="space-y-3">
        {groups.map((g) => {
          const w = warehouses.find((x) => x.id === g.warehouseId);
          const v = vById[g.vendorId];
          const un = g.key === UNASSIGNED;
          const options = ranked.filter((r) => r.w.id !== g.warehouseId).map((r) => ({ ...r, ok: g.items.every((i) => !i.productId || stockAt(idx, r.w, i.productId) >= i.qty) }));
          return (
            <div key={g.key} className={`rounded-2xl border ${un ? 'border-[#B4432F]/40 bg-[#F8E7E3]/40' : 'border-navy/10'} p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${un ? 'bg-[#B4432F] text-white' : 'bg-emerald text-white'}`}>{un ? <AlertTriangle className="w-5 h-5" /> : <Warehouse className="w-5 h-5" />}</span>
                  <div className="min-w-0">
                    {un ? <p className="font-extrabold text-[#B4432F]">No supplier had enough stock</p> : (
                      <>
                        <Link href={`/admin/vendors/${v?.id}`} className="font-extrabold text-navy hover:text-emerald">{v?.company}</Link>
                        {v?.isHouse && <span className="ml-2 pill bg-gold-soft text-navy">JOLOF stock</span>}
                        <p className="text-[12.5px] text-charcoal/60">{w?.name} · {getLocation(w?.locationId)?.city} → {order.location?.city || '—'} · {fmtKm(g.distanceKm ?? distanceKm(order.location, getLocation(w?.locationId)))}{order.fulfilments?.[g.key]?.fee ? ` · delivery ${money(order.fulfilments[g.key].fee)}` : ''}</p>
                      </>
                    )}
                  </div>
                </div>
                <Pill meta={FUL_STATUS[g.status]} />
              </div>
              <ul className="mt-3 text-[13px] text-charcoal/75 space-y-0.5">
                {g.items.map((i) => <li key={i.idx} className="flex justify-between gap-3"><span className="truncate">{i.qty} × {i.name}</span><span className="text-charcoal/50 whitespace-nowrap">{i.price == null ? '—' : money(i.qty * i.price)}</span></li>)}
              </ul>
              {g.tracking && <p className="mt-2 text-[12.5px]"><span className="text-charcoal/55">Tracking:</span> <b className="text-navy">{g.tracking}</b></p>}
              {!closed && ['unassigned', 'assigned', 'accepted'].includes(g.status) && (
                <div className="mt-3 pt-3 border-t border-navy/5 flex flex-col sm:flex-row gap-2">
                  <select className="dash-input !h-9 flex-1" value={pick[g.key] || ''} onChange={(e) => setPick({ ...pick, [g.key]: e.target.value })} aria-label="Reassign to warehouse">
                    <option value="">{un ? 'Assign to a warehouse…' : 'Reassign to another warehouse…'}</option>
                    {options.map(({ w: x, km, ok }) => <option key={x.id} value={x.id} disabled={!ok}>{vById[x.vendorId]?.company} · {x.name} · {fmtKm(km)}{ok ? '' : ' — not enough stock'}</option>)}
                  </select>
                  <button className="dash-btn dash-btn-ghost !h-9" disabled={!pick[g.key]} onClick={() => move(g)}><ArrowRightLeft /> {un ? 'Assign' : 'Move'}</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {order.events?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-navy/5">
          <p className="dash-label">Routing log</p>
          <ul className="space-y-1.5">
            {[...order.events].reverse().map((e, k) => (
              <li key={k} className="text-[12.5px] text-charcoal/70"><span className="text-charcoal/45">{fmtDateTime(e.at)} · {e.by}:</span> {e.text}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
