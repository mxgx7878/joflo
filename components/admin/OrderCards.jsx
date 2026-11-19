'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CreditCard, ExternalLink, FileCheck2, FileText, Phone, RefreshCw, RotateCcw, Truck, UserRound } from 'lucide-react';
import { useStore } from '@/lib/store';
import { money, DRIVER_STATUS, INVOICE_STATUS, PAYMENT_METHODS, paymentMeta, cardLine, holdDaysLeft } from '@/lib/format';
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
  const card = order.paymentMethod === 'card' ? order.card : null;
  const held = card?.status === 'APPROVED' ? card.amount : null;
  const charged = card?.status === 'COMPLETED' ? card.amount : null;
  const overHold = held != null && total > held + 0.001;

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
      {held != null && <p className="text-[12.5px] mb-3 rounded-xl bg-[#E6EEF8] text-navy-600 px-3 py-2"><b>Card order:</b> confirming charges the customer&apos;s card. {money(held)} is held — the total can be lower, not higher.</p>}
      {charged != null && <p className="text-[12.5px] mb-3 rounded-xl bg-ivory text-charcoal/70 px-3 py-2">Card already charged {money(charged)}, so the total can&apos;t change. Use <b>Refund</b> in the Payment card to give money back.</p>}
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
      {overHold && <p className="mt-3 text-[12.5px] font-bold text-[#B4432F]">The total is more than the {money(held)} held on the card. Lower it, or cancel and ask the customer to re-order.</p>}
      {err && <p role="alert" className="mt-3 text-[12.5px] font-bold text-[#B4432F]">{err}</p>}
      <button className="dash-btn dash-btn-navy w-full mt-4" disabled={busy || overHold} onClick={submit}><FileCheck2 /> {busy ? 'Saving…' : editing ? 'Update prices & re-issue invoice' : held != null ? `Confirm, charge ${money(total)} & invoice` : 'Confirm order & issue invoice'}</button>
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
      {order.status !== 'cancelled' && <Link href={`/admin/orders/${order.id}/driver-slip`} className="dash-btn dash-btn-ghost w-full mt-3"><FileText /> Open driver slip</Link>}
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

/** Payment card on the admin order page — cash on delivery or Square card (hold / charge / refund). */
export function PaymentCard({ order }) {
  const setOrderPayment = useStore((s) => s.setOrderPayment);
  const refundOrderPayment = useStore((s) => s.refundOrderPayment);
  const syncOrderPayment = useStore((s) => s.syncOrderPayment);
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const card = order.card;

  if (order.paymentMethod !== 'card') {
    return (
      <Card title="Payment" className="print:hidden">
        <KV k="Method" v={PAYMENT_METHODS[order.paymentMethod] || PAYMENT_METHODS.cod} />
        <KV k="Status" v={<Pill meta={paymentMeta(order)} />} />
        {order.payment !== 'paid' && order.status !== 'cancelled' && <KV k="Driver collects" v={<b className="text-navy">{money(order.total)}</b>} />}
        <p className="text-[12px] text-charcoal/55 mt-2">Cash is marked as collected automatically when the order is marked Delivered.</p>
        <button className="dash-btn dash-btn-ghost w-full mt-3" disabled={order.status === 'pending' || order.status === 'cancelled'} onClick={async () => { const p = order.payment === 'paid' ? 'unpaid' : 'paid'; const r = await setOrderPayment(order.id, p); if (r.ok) toast({ text: p === 'paid' ? 'Cash marked as collected' : 'Cash marked as not collected' }); }}>
          {order.payment === 'paid' ? 'Mark cash as not collected' : 'Mark cash collected'}
        </button>
      </Card>
    );
  }

  const daysLeft = holdDaysLeft(card);
  const refundable = card?.status === 'COMPLETED' ? r2(card.amount - (card.refunded || 0)) : 0;
  const refresh = async () => { setBusy(true); const r = await syncOrderPayment(order.id); setBusy(false); if (r.ok) toast({ text: 'Payment refreshed from Square' }); else toast({ text: r.error }); };
  const refund = async () => {
    const amt = r2(amount);
    if (!(amt > 0) || amt > refundable) { setErr(`Enter an amount between $0.01 and ${money(refundable)}.`); return; }
    setBusy(true); setErr('');
    const r = await refundOrderPayment(order.id, amt, reason.trim());
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setOpen(false); setAmount(''); setReason('');
    toast({ text: `${money(amt)} refunded to the customer's card` });
  };

  return (
    <Card title="Payment" action={<CreditCard className="w-4 h-4 text-gold" />} className="print:hidden">
      <KV k="Method" v={`Card${cardLine(card) ? ` · ${cardLine(card)}` : ''}`} />
      <KV k="Status" v={<Pill meta={paymentMeta(order)} />} />
      {card && <KV k={card.status === 'APPROVED' ? 'Held on card' : 'Charged'} v={<b className="text-navy">{money(card.amount)}</b>} />}
      {card?.refunded > 0 && <KV k="Refunded" v={money(card.refunded)} />}
      {daysLeft != null && order.status !== 'cancelled' && (
        <p className={`text-[12px] mt-2 rounded-xl px-3 py-2 ${daysLeft <= 2 ? 'bg-[#F8E7E3] text-[#B4432F] font-bold' : 'bg-gold-pale text-[#6d4f12]'}`}>
          {daysLeft === 0 ? 'The card hold expires today — confirm now or it is released.' : `Confirm within ${daysLeft} day${daysLeft === 1 ? '' : 's'} — Square releases the hold after 7 days.`}
        </p>
      )}
      {!card && <p className="text-[12px] text-charcoal/55 mt-2">No card payment recorded.</p>}
      {card?.status === 'APPROVED' && <p className="text-[12px] text-charcoal/55 mt-2">Nothing charged yet. Confirming the order charges the card; cancelling releases the hold.</p>}

      {refundable > 0 && !open && <button className="dash-btn dash-btn-ghost w-full mt-3" onClick={() => { setOpen(true); setAmount(String(refundable)); setErr(''); }}><RotateCcw /> Refund to card</button>}
      {open && (
        <div className="mt-3 rounded-xl border border-navy/10 p-3">
          <label className="dash-label">Amount (max {money(refundable)})</label>
          <input type="number" min="0.01" step="0.01" max={refundable} className="dash-input" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <label className="dash-label mt-3">Reason (optional)</label>
          <input className="dash-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. 2 cases out of stock" />
          {err && <p role="alert" className="mt-2 text-[12.5px] font-bold text-[#B4432F]">{err}</p>}
          <div className="flex gap-2 mt-3">
            <button className="dash-btn dash-btn-ghost flex-1" disabled={busy} onClick={() => setOpen(false)}>Close</button>
            <button className="dash-btn dash-btn-danger flex-1" disabled={busy} onClick={refund}>{busy ? 'Refunding…' : 'Refund'}</button>
          </div>
        </div>
      )}
      <div className="flex gap-2 mt-3">
        {card?.receiptUrl && card.status === 'COMPLETED' && <a href={card.receiptUrl} target="_blank" rel="noreferrer" className="dash-btn dash-btn-ghost flex-1"><ExternalLink /> Receipt</a>}
        {card && <button className="dash-btn dash-btn-ghost flex-1" disabled={busy} onClick={refresh}><RefreshCw /> Refresh</button>}
      </div>
    </Card>
  );
}
