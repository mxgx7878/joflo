'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FileCheck2, FileText, Phone, Truck, UserRound } from 'lucide-react';
import { useStore } from '@/lib/store';
import { money, DRIVER_STATUS, INVOICE_STATUS } from '@/lib/format';
import { getLocation } from '@/lib/locations';
import { Pill } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Card, KV } from './common';

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Pending order → admin sets final unit prices, delivery and discount, then confirms (invoice is issued). */
export function ConfirmOrderCard({ order }) {
  const confirmOrder = useStore((s) => s.confirmOrder);
  const toast = useToast();
  const [prices, setPrices] = useState({});
  const [fee, setFee] = useState('');
  const [discount, setDiscount] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const editing = order.status !== 'pending';

  useEffect(() => {
    setPrices(Object.fromEntries(order.items.map((i) => [i.id, i.price ?? ''])));
    setFee(order.shipping ?? 0);
    setDiscount(order.discount || '');
    setErr('');
  }, [order.id, order.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const subtotal = useMemo(() => r2(order.items.reduce((s, i) => s + (Number(prices[i.id]) || 0) * i.qty, 0)), [order.items, prices]);
  const total = r2(subtotal + (Number(fee) || 0) - (Number(discount) || 0));

  const submit = async () => {
    if (order.items.some((i) => prices[i.id] === '' || Number(prices[i.id]) < 0)) { setErr('Enter a price for every line.'); return; }
    setBusy(true); setErr('');
    const r = await confirmOrder(order.id, { prices, deliveryFee: fee, discount: discount || 0, note: note.trim() });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    toast({ text: editing ? `${order.id} prices updated — invoice re-issued` : `${order.id} confirmed — invoice ${order.id.replace('JT-', 'INV-')} issued to the customer` });
  };

  return (
    <Card title={editing ? 'Adjust pricing' : 'Confirm & invoice'} action={<FileCheck2 className="w-4 h-4 text-gold" />} className="print:hidden">
      {!editing && <p className="text-[12.5px] text-charcoal/60 mb-3">Check stock with the assigned warehouses, set the final prices, then confirm. The customer sees the final pricing and their invoice straight away.</p>}
      <ul className="space-y-2">
        {order.items.map((i) => (
          <li key={i.id} className="flex items-center gap-2">
            <span className="flex-1 min-w-0 text-[12.5px] text-navy font-semibold truncate" title={i.name}>{i.qty} × {i.name}</span>
            <span className="text-[12px] text-charcoal/45">$</span>
            <input type="number" min="0" step="0.01" className="dash-input !w-24 !h-9 text-right" value={prices[i.id] ?? ''} onChange={(e) => setPrices({ ...prices, [i.id]: e.target.value })} aria-label={`Unit price for ${i.name}`} />
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <label className="block"><span className="dash-label">Delivery ($)</span><input type="number" min="0" step="0.01" className="dash-input" value={fee} onChange={(e) => setFee(e.target.value)} /></label>
        <label className="block"><span className="dash-label">Discount ($)</span><input type="number" min="0" step="0.01" className="dash-input" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" /></label>
      </div>
      {order.deliveryMiles ? <p className="text-[11.5px] text-charcoal/50 mt-1.5">Calculated from ~{Math.round(order.deliveryMiles)} mi (furthest shipment). Edit to override.</p> : null}
      {!editing && <><label className="dash-label mt-3">Note for the customer (optional)</label><input className="dash-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Delivery Thursday morning" /></>}
      <div className="mt-4 rounded-xl bg-ivory px-4 py-3 text-[13px] space-y-1">
        <KV k="Subtotal" v={money(subtotal)} />
        <div className="flex justify-between pt-1 border-t border-navy/10"><span className="font-bold text-navy">Invoice total</span><span className="font-extrabold text-navy">{money(total)}</span></div>
      </div>
      {err && <p role="alert" className="mt-3 text-[12.5px] font-bold text-[#B4432F]">{err}</p>}
      <button className="dash-btn dash-btn-navy w-full mt-4" disabled={busy} onClick={submit}><FileCheck2 /> {busy ? 'Saving…' : editing ? 'Update prices & re-issue invoice' : 'Confirm order & issue invoice'}</button>
    </Card>
  );
}

/** Assign one of JOLOF's drivers to deliver the order. */
export function DriverCard({ order }) {
  const drivers = useStore((s) => s.drivers);
  const assignDriver = useStore((s) => s.assignDriver);
  const toast = useToast();
  const current = drivers.find((d) => d.id === order.driverId);
  const closed = ['cancelled', 'delivered'].includes(order.status);
  // suggest drivers based nearest to the delivery metro first
  const options = useMemo(() => {
    const here = order.location;
    const dist = (d) => { const l = getLocation(d.homeBase); return here && l ? Math.hypot(l.lat - here.lat, l.lng - here.lng) : 999; };
    return [...drivers].filter((d) => d.status !== 'inactive' || d.id === order.driverId).sort((a, b) => dist(a) - dist(b));
  }, [drivers, order.location, order.driverId]);

  const pick = async (id) => {
    const r = await assignDriver(order.id, id || null);
    if (r.ok) toast({ text: id ? `${drivers.find((d) => d.id === id)?.name} assigned to ${order.id}` : 'Driver unassigned' });
  };

  return (
    <Card title="Driver" action={<Truck className="w-4 h-4 text-gold" />} className="print:hidden">
      {current ? (
        <div className="flex items-center gap-3 mb-3">
          <span className="w-10 h-10 rounded-full bg-emerald text-white grid place-items-center"><UserRound className="w-5 h-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-navy truncate">{current.name}</p>
            <p className="text-[12px] text-charcoal/55 truncate">{current.vehicle}{current.plate ? ` · ${current.plate}` : ''}</p>
          </div>
          {current.phone && <a href={`tel:${current.phone}`} className="icon-btn !w-9 !h-9" aria-label={`Call ${current.name}`}><Phone className="w-4 h-4" /></a>}
        </div>
      ) : <p className="text-[12.5px] text-charcoal/55 mb-3">{order.status === 'pending' ? 'Assign a driver once the order is confirmed.' : 'No driver assigned yet.'}</p>}
      {!closed && (
        <select className="dash-input" value={order.driverId || ''} onChange={(e) => pick(e.target.value)} aria-label="Assign driver">
          <option value="">{current ? 'Unassign driver' : 'Choose a driver…'}</option>
          {options.map((d) => <option key={d.id} value={d.id}>{d.name} · {getLocation(d.homeBase)?.city || '—'}{d.status !== 'active' ? ` (${DRIVER_STATUS[d.status]?.label})` : ''}</option>)}
        </select>
      )}
      <Link href="/admin/drivers" className="mt-3 inline-block text-[12.5px] font-bold text-emerald hover:text-navy">Manage drivers →</Link>
    </Card>
  );
}

export function InvoiceCard({ order }) {
  const invoice = useStore((s) => s.invoices.find((v) => v.orderId === order.id));
  if (!invoice) return null;
  return (
    <Card title="Invoice" action={<FileText className="w-4 h-4 text-gold" />} className="print:hidden">
      <KV k="Number" v={<b className="text-navy">{invoice.id}</b>} />
      <KV k="Status" v={<Pill meta={INVOICE_STATUS[invoice.status]} />} />
      <KV k="Total" v={money(invoice.total)} />
      <Link href={`/admin/invoices/${invoice.id}`} className="dash-btn dash-btn-ghost w-full mt-3"><FileText /> Open invoice</Link>
    </Card>
  );
}
