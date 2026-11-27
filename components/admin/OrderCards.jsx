'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Ban, Banknote, Copy, CreditCard, ExternalLink, FileCheck2, FileText, Mail, Phone, RefreshCw, RotateCcw, Trash2, Truck, UserRound } from 'lucide-react';
import { useStore } from '@/lib/store';
import { money, fmtDate, fmtDateTime, DRIVER_STATUS, INVOICE_STATUS, PAYMENT_METHODS, CASH_METHODS, isOnDelivery, PAYREQ_STATUS, paymentMeta, cardLine, holdDaysLeft } from '@/lib/format';
import { getLocation } from '@/lib/locations';
import { Pill } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Card, KV, useConfirm } from './common';
import { cardFeeFor } from '@/lib/cardfee';

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Pending order → admin sets final unit prices, delivery and discount, then confirms (invoice is issued). */
export function ConfirmOrderCard({ order }) {
  const confirmOrder = useStore((s) => s.confirmOrder);
  const feeCfg = useStore((s) => s.settings.payments?.cardFee);
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
  const isCard = order.paymentMethod === 'card';
  const base = r2(subtotal + (Number(fee) || 0) - (Number(discount) || 0));
  // card orders: the Square processing fee is recalculated on the new total (same as the server — lib/cardfee.js)
  const cardFee = isCard ? cardFeeFor(base, feeCfg) : 0;
  const total = r2(base + cardFee);
  const held = isCard ? (order.payments || []).filter((p) => p.status === 'APPROVED').reduce((t, p) => t + p.amount, 0) : 0;
  const paid = isCard ? r2((order.paid || 0) + held) : 0;
  const diff = isCard ? r2(total - paid) : 0;
  const openReq = isCard ? (order.requests || []).find((r) => r.kind === 'balance' && r.status === 'open') : null;
  const sameLink = openReq && Math.abs(openReq.amount - diff) < 0.005;

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
      {isCard && <p className="text-[12.5px] mb-3 rounded-xl bg-[#E6EEF8] text-navy-600 px-3 py-2"><b>Card order:</b> the customer {held ? `has ${money(held)} held on their card` : `paid ${money(paid)}`}. A lower total refunds the difference automatically; a higher total emails them a link to pay only the extra.</p>}
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
        {cardFee > 0 && <KV k="Card processing fee" v={money(cardFee)} />}
        <div className="flex justify-between pt-1 border-t border-navy/10"><span className="font-bold text-navy">Invoice total</span><span className="font-extrabold text-navy">{money(total)}</span></div>
      </div>
      {isCard && diff < -0.004 && <p className="mt-3 text-[12.5px] font-bold text-emerald">{money(-diff)} will be refunded to the customer&apos;s card.</p>}
      {isCard && diff > 0.004 && <p className="mt-3 text-[12.5px] font-bold text-[#8a6417]">{sameLink ? `The customer already has a link to pay the extra ${money(diff)} (${openReq.id}).` : `The customer will be emailed a link to pay the extra ${money(diff)}${openReq ? ` — it replaces ${openReq.id}` : ''}.`} The order can&apos;t be shipped until it&apos;s paid.</p>}
      {err && <p role="alert" className="mt-3 text-[12.5px] font-bold text-[#B4432F]">{err}</p>}
      <button className="dash-btn dash-btn-navy w-full mt-4" disabled={busy} onClick={submit}><FileCheck2 /> {busy ? 'Saving…' : editing ? 'Update prices & re-issue invoice' : isCard && diff > 0.004 ? `Confirm & request ${money(diff)}` : isCard && diff < -0.004 ? `Confirm & refund ${money(-diff)}` : 'Confirm order & issue invoice'}</button>
    </Card>
  );
}

/** Assign one of JOLOF's drivers to deliver the order. */
export function DriverCard({ order }) {
  const drivers = useStore((s) => s.drivers);
  const assignDriver = useStore((s) => s.assignDriver);
  const emailDriverSlip = useStore((s) => s.emailDriverSlip);
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
    if (!r.ok) return;
    const d = drivers.find((x) => x.id === id);
    toast({ text: d ? `${d.name} assigned to ${order.id}${d.email ? ` — slip emailed to ${d.email}` : ' — no email on file, slip not sent'}` : 'Driver unassigned' });
  };
  const resendSlip = async () => { const r = await emailDriverSlip(order.id); if (r.ok) toast({ text: `Driver slip emailed to ${current.email}` }); };

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
      {current && !current.email && order.status !== 'cancelled' && <p className="mt-3 text-[12px] rounded-xl bg-gold-pale text-[#6d4f12] px-3 py-2">{current.name} has no email address, so the slip can&apos;t be emailed. Add one under Drivers.</p>}
      {order.status !== 'cancelled' && <Link href={`/admin/orders/${order.id}/driver-slip`} className="dash-btn dash-btn-ghost w-full mt-3"><FileText /> Open driver slip</Link>}
      {current?.email && !closed && <button type="button" className="dash-btn dash-btn-ghost w-full mt-2" onClick={resendSlip}><Mail /> Email slip to driver</button>}
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

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fmtReceived = (iso) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '');

/**
 * Cash / check on delivery: the admin records what the store actually paid — in full, a deposit,
 * or later ("bill to bill"). The status (Unpaid → Deposit · balance due → Paid in full) follows the amounts.
 */
function CashPaymentCard({ order }) {
  const recordCashPayment = useStore((s) => s.recordCashPayment);
  const voidCashPayment = useStore((s) => s.voidCashPayment);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState('check');
  const [full, setFull] = useState(true);
  const [amount, setAmount] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [receivedAt, setReceivedAt] = useState('');
  const [note, setNote] = useState('');
  const [voiding, setVoiding] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const rows = order.cashPayments || [];
  const balance = r2(order.balanceDue || 0);
  const onDelivery = isOnDelivery(order.paymentMethod);
  const canRecord = onDelivery && !['pending', 'cancelled'].includes(order.status) && balance > 0;

  const start = (asFull) => { setOpen(true); setFull(asFull); setAmount(''); setCheckNumber(''); setReceivedAt(today()); setNote(''); setErr(''); };
  const save = async () => {
    const amt = r2(amount);
    if (!full && !(amt > 0)) { setErr('Enter the amount received, or tick Paid in full.'); return; }
    if (!full && amt > balance) { setErr(`That's more than the ${money(balance)} still owed.`); return; }
    setBusy(true); setErr('');
    const r = await recordCashPayment(order.id, { method, full, amount: full ? undefined : amt, checkNumber: method === 'check' ? checkNumber.trim() : '', receivedAt, note: note.trim() });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setOpen(false);
    toast({ text: full || amt >= balance ? 'Marked as paid in full' : `${money(amt)} recorded — ${money(r2(balance - amt))} still owed` });
  };
  const doVoid = async (pm) => {
    setBusy(true);
    const r = await voidCashPayment(order.id, pm.id, voidReason.trim());
    setBusy(false);
    if (!r.ok) { toast({ text: r.error }); return; }
    setVoiding(null); setVoidReason('');
    toast({ text: `${money(pm.amount)} payment voided` });
  };

  return (
    <Card title="Payment" action={<Banknote className="w-4 h-4 text-gold" />} className="print:hidden">
      <KV k="Method" v={PAYMENT_METHODS[order.paymentMethod] || PAYMENT_METHODS.cod} />
      <KV k="Status" v={<Pill meta={paymentMeta(order)} />} />
      {onDelivery && order.status !== 'cancelled' && (
        <>
          <KV k="Total" v={money(order.total)} />
          <KV k="Paid" v={<b className="text-navy">{money(order.paid || 0)}</b>} />
          <KV k="Balance due" v={<b className={balance > 0 ? 'text-[#8a6417]' : 'text-emerald'}>{money(balance)}</b>} />
        </>
      )}
      {order.overpaid > 0 && <p className="text-[12px] mt-2 rounded-xl px-3 py-2 bg-[#F8E7E3] text-[#B4432F]">Recorded payments are {money(order.overpaid)} more than the order total — void the wrong entry or settle the difference with the store.</p>}

      {rows.length > 0 && (
        <ul className="mt-3 divide-y divide-navy/5 border-y border-navy/5">
          {rows.map((pm) => (
            <li key={pm.id} className="py-2 text-[12.5px]">
              <div className="flex items-start justify-between gap-2">
                <span className={`min-w-0 ${pm.voided ? 'line-through text-charcoal/40' : ''}`}>
                  <b className={pm.voided ? '' : 'text-navy'}>{CASH_METHODS[pm.method] || 'Cash / check'}{pm.checkNumber ? ` #${pm.checkNumber}` : ''}</b>
                  {' · '}{pm.receivedAt ? `received ${fmtReceived(pm.receivedAt)}` : `recorded ${fmtDate(pm.at)}`}
                  <span className="block text-charcoal/50 no-underline">{pm.by}{pm.note ? ` · ${pm.note}` : ''}</span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <b className={pm.voided ? 'line-through text-charcoal/40' : 'text-navy'}>{money(pm.amount)}</b>
                  {!pm.voided && voiding !== pm.id && <button className="text-[11.5px] font-bold text-[#B4432F] hover:underline" disabled={busy} onClick={() => { setVoiding(pm.id); setVoidReason(''); }}>Void</button>}
                </span>
              </div>
              {pm.voided && <p className="text-[11.5px] text-[#B4432F] mt-0.5">Voided by {pm.voidedBy} · {fmtDate(pm.voidedAt)}{pm.voidReason ? ` · ${pm.voidReason}` : ''}</p>}
              {voiding === pm.id && (
                <div className="mt-2 rounded-xl border border-[#B4432F]/30 p-2.5">
                  <input className="dash-input !py-1.5 !text-[12.5px]" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Why? e.g. check bounced, wrong amount" />
                  <div className="flex gap-1.5 mt-2">
                    <button className="dash-btn dash-btn-ghost flex-1 !h-8 !text-[12px]" onClick={() => setVoiding(null)}>Keep</button>
                    <button className="dash-btn dash-btn-danger flex-1 !h-8 !text-[12px]" disabled={busy} onClick={() => doVoid(pm)}>Void payment</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {onDelivery && !rows.length && order.status !== 'cancelled' && <p className="text-[12px] text-charcoal/55 mt-2">No payment recorded yet.</p>}
      {onDelivery && order.status === 'pending' && <p className="text-[12px] text-charcoal/55 mt-2">Confirm the order first — payments can be recorded once the total is final.</p>}

      {canRecord && !open && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button className="dash-btn dash-btn-navy min-w-0" onClick={() => start(true)}>Paid in full</button>
          <button className="dash-btn dash-btn-ghost min-w-0" onClick={() => start(false)}>Deposit / part</button>
        </div>
      )}
      {canRecord && open && (
        <div className="mt-3 rounded-xl border border-navy/10 p-3">
          <label className="dash-label">Paid by</label>
          <div className="grid grid-cols-2 gap-1.5">
            {['cash', 'check'].map((m) => (
              <button key={m} type="button" onClick={() => setMethod(m)} className={`dash-btn !h-9 min-w-0 ${method === m ? 'dash-btn-navy' : 'dash-btn-ghost'}`}>{CASH_METHODS[m]}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 mt-3 text-[13px] font-bold text-navy cursor-pointer">
            <input type="checkbox" checked={full} onChange={(e) => setFull(e.target.checked)} className="accent-emerald w-4 h-4" />
            Paid in full ({money(balance)})
          </label>
          {!full && (
            <>
              <label className="dash-label mt-3">Amount received (max {money(balance)})</label>
              <input type="number" min="0.01" step="0.01" max={balance} className="dash-input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 200" />
            </>
          )}
          {method === 'check' && (
            <>
              <label className="dash-label mt-3">Check number <span className="normal-case font-normal text-charcoal/45">(optional)</span></label>
              <input className="dash-input" value={checkNumber} onChange={(e) => setCheckNumber(e.target.value)} placeholder="e.g. 10452" />
            </>
          )}
          <label className="dash-label mt-3">Date received <span className="normal-case font-normal text-charcoal/45">(optional)</span></label>
          <input type="date" className="dash-input" value={receivedAt} max={today()} onChange={(e) => setReceivedAt(e.target.value)} />
          <label className="dash-label mt-3">Note <span className="normal-case font-normal text-charcoal/45">(optional)</span></label>
          <input className="dash-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Manager paid deposit, rest next week" />
          {err && <p className="mt-2 text-[12px] font-bold text-[#B4432F]">{err}</p>}
          <div className="flex gap-2 mt-3">
            <button className="dash-btn dash-btn-ghost flex-1" onClick={() => setOpen(false)}>Cancel</button>
            <button className="dash-btn dash-btn-navy flex-1" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save payment'}</button>
          </div>
        </div>
      )}
      {onDelivery && order.status !== 'cancelled' && <p className="text-[11.5px] text-charcoal/50 mt-3">Marking the order Delivered doesn&apos;t change the payment — record what the store actually paid, then print the invoice.</p>}
    </Card>
  );
}

/** Payment card on the admin order page — cash / check on delivery, or Square card payments, balance requests and refunds. */
export function PaymentCard({ order }) {
  const refundOrderPayment = useStore((s) => s.refundOrderPayment);
  const syncOrderPayment = useStore((s) => s.syncOrderPayment);
  const paymentRequestAction = useStore((s) => s.paymentRequestAction);
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const card = order.card;

  if (order.paymentMethod !== 'card') return <CashPaymentCard order={order} />;

  const daysLeft = holdDaysLeft(card);
  const refundable = r2(order.paid || 0);
  const pays = order.payments || [];
  const requests = order.requests || [];
  const refresh = async () => { setBusy(true); const r = await syncOrderPayment(order.id); setBusy(false); if (r.ok) toast({ text: 'Payments refreshed from Square' }); else toast({ text: r.error }); };
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
  const reqAction = async (rq, action) => {
    setBusy(true);
    const r = await paymentRequestAction(rq.id, action);
    setBusy(false);
    if (!r.ok) { toast({ text: r.error }); return; }
    toast({ text: action === 'resend' ? `Payment link ${rq.id} emailed again` : `${rq.id} cancelled` });
  };
  const copy = (rq) => { navigator.clipboard?.writeText(`${window.location.origin}/pay/${rq.token}`); toast({ text: 'Payment link copied' }); };
  const KIND = { checkout: 'Checkout', quote: 'Quote', balance: 'Balance' };

  return (
    <Card title="Payment" action={<CreditCard className="w-4 h-4 text-gold" />} className="print:hidden">
      <KV k="Method" v={`Card${cardLine(card) ? ` · ${cardLine(card)}` : ''}`} />
      <KV k="Status" v={<Pill meta={paymentMeta(order)} />} />
      <KV k="Paid (net)" v={<b className="text-navy">{money(order.paid || 0)}</b>} />
      {order.refunded > 0 && <KV k="Refunded" v={money(order.refunded)} />}
      {order.balanceDue > 0 && <KV k="Balance due" v={<b className="text-[#8a6417]">{money(order.balanceDue)}</b>} />}
      {daysLeft != null && (
        <p className={`text-[12px] mt-2 rounded-xl px-3 py-2 ${daysLeft <= 2 ? 'bg-[#F8E7E3] text-[#B4432F]' : 'bg-gold-pale text-[#8a6417]'}`}>
          Older order with a card hold: {daysLeft === 0 ? 'it expires today — confirm now or it is released.' : `confirm within ${daysLeft} day${daysLeft === 1 ? '' : 's'} — Square releases the hold after 7 days.`}
        </p>
      )}

      {pays.length > 0 && (
        <ul className="mt-3 divide-y divide-navy/5 border-y border-navy/5">
          {pays.map((pm) => (
            <li key={pm.id} className="py-2 flex items-center justify-between gap-2 text-[12.5px]">
              <span className="min-w-0"><b className="text-navy">{KIND[pm.kind] || 'Card'}</b> · {fmtDate(pm.at)}<span className="block text-charcoal/50">{pm.status === 'COMPLETED' ? 'Charged' : pm.status === 'APPROVED' ? 'On hold' : pm.status.toLowerCase()}{pm.refunded > 0 ? ` · ${money(pm.refunded)} refunded` : ''}</span></span>
              <span className="flex items-center gap-2 shrink-0"><b className="text-navy">{money(pm.amount)}</b>{pm.receiptUrl && <a href={pm.receiptUrl} target="_blank" rel="noreferrer" className="text-emerald" aria-label="Square receipt"><ExternalLink className="w-3.5 h-3.5" /></a>}</span>
            </li>
          ))}
        </ul>
      )}
      {!pays.length && <p className="text-[12px] text-charcoal/55 mt-2">No card payment recorded.</p>}

      {requests.length > 0 && (
        <div className="mt-4">
          <p className="dash-label">Payment requests</p>
          <ul className="space-y-2">
            {requests.map((rq) => (
              <li key={rq.id} className="rounded-xl border border-navy/10 p-3 text-[12.5px]">
                <div className="flex items-center justify-between gap-2"><b className="text-navy">{rq.id} · {money(rq.amount)}</b><Pill meta={PAYREQ_STATUS[rq.status] || PAYREQ_STATUS.open} /></div>
                <p className="text-charcoal/55 mt-1">{rq.kind === 'balance' ? 'Extra after confirmation' : 'Quote'} · {fmtDateTime(rq.createdAt)}{rq.paidAt ? ` · paid ${fmtDateTime(rq.paidAt)}` : ''}</p>
                {rq.status === 'open' && (
                  <div className="grid grid-cols-3 gap-1.5 mt-2">
                    <button className="dash-btn dash-btn-ghost !h-8 !px-2 !text-[12px] min-w-0" disabled={busy} onClick={() => copy(rq)}><Copy /> Link</button>
                    <button className="dash-btn dash-btn-ghost !h-8 !px-2 !text-[12px] min-w-0" disabled={busy} onClick={() => reqAction(rq, 'resend')}><Mail /> Resend</button>
                    <button className="dash-btn dash-btn-ghost !h-8 !px-2 !text-[12px] min-w-0" disabled={busy} onClick={() => reqAction(rq, 'cancel')} title="Waive it — the order can then ship"><Ban /> Cancel</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {refundable > 0 && !open && <button className="dash-btn dash-btn-ghost w-full mt-3" onClick={() => { setOpen(true); setAmount(String(refundable)); setErr(''); }}><RotateCcw /> Refund to card</button>}
      {open && (
        <div className="mt-3 rounded-xl border border-navy/10 p-3">
          <label className="dash-label">Amount (max {money(refundable)})</label>
          <input type="number" min="0.01" step="0.01" max={refundable} className="dash-input" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <label className="dash-label mt-3">Reason (shown to the customer)</label>
          <input className="dash-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. 2 cases out of stock" />
          {err && <p className="mt-2 text-[12px] font-bold text-[#B4432F]">{err}</p>}
          <div className="flex gap-2 mt-3">
            <button className="dash-btn dash-btn-ghost flex-1" onClick={() => setOpen(false)}>Cancel</button>
            <button className="dash-btn dash-btn-danger flex-1" disabled={busy} onClick={refund}>{busy ? 'Refunding…' : 'Refund'}</button>
          </div>
        </div>
      )}
      {pays.length > 0 && <button className="dash-btn dash-btn-ghost w-full mt-3" disabled={busy} onClick={refresh}><RefreshCw /> Refresh from Square</button>}
    </Card>
  );
}

/**
 * Why an order can't be deleted yet (same rules as the server), or '' when it can.
 * Money must never disappear with an order: card money held / charged → cancel first (releases / refunds);
 * cash / check payments recorded → void them first.
 */
export function deleteBlocker(order) {
  if (order.paymentMethod === 'card') {
    if ((order.payments || []).some((p) => p.status === 'APPROVED')) return 'Card hold on this order — cancel it first so the hold is released, then delete.';
    if ((order.paid || 0) > 0.005) return `${money(order.paid)} charged by card — cancel the order first so it's refunded, then delete.`;
    return '';
  }
  if (isOnDelivery(order.paymentMethod) && (order.paid || 0) > 0.005) return `${money(order.paid)} in cash / check payments recorded — void them in the Payment card first, then delete.`;
  return '';
}

/** What deleting does, for the confirmation dialog. */
export function deleteNote(order) {
  const restock = !['cancelled', 'shipped', 'delivered'].includes(order.status);
  return `This permanently removes ${order.id} with its items, invoice${order.invoiceId ? ` ${order.invoiceId}` : ''}, supplier shares and payment records. ${restock ? 'Its items go back to the warehouses they were taken from. ' : order.status === 'cancelled' ? 'Stock was already returned when it was cancelled. ' : 'Stock is not returned — the goods already left the warehouse. '}The customer will no longer see it. This can't be undone.`;
}

/** Danger zone on the admin order page: permanently delete the order. */
export function DeleteOrderCard({ order }) {
  const deleteOrder = useStore((s) => s.deleteOrder);
  const toast = useToast();
  const router = useRouter();
  const [ask, dialog] = useConfirm();
  const blocked = deleteBlocker(order);
  const run = () => ask({ title: `Delete ${order.id}?`, body: deleteNote(order), confirm: 'Delete order', danger: true }, async () => {
    const r = await deleteOrder(order.id);
    if (!r.ok) return;
    toast({ text: `${order.id} deleted` });
    router.push('/admin/orders');
  });
  return (
    <Card title="Delete order" className="print:hidden">
      {dialog}
      <p className="text-[12.5px] text-charcoal/60">Remove a test, duplicate or mistaken order for good. {['cancelled', 'shipped', 'delivered'].includes(order.status) ? '' : 'Its stock goes back to the warehouses.'}</p>
      {blocked && <p className="text-[12px] mt-2 rounded-xl px-3 py-2 bg-gold-pale text-[#8a6417]">{blocked}</p>}
      <button type="button" className="dash-btn dash-btn-ghost w-full mt-3 !text-[#B4432F] !border-[#B4432F]/30 hover:!bg-[#F8E7E3]" disabled={!!blocked} onClick={run}><Trash2 /> Delete order</button>
    </Card>
  );
}
