'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Printer, Truck, MapPin, Phone, Mail, FileText, Warehouse, XCircle, CheckCircle2 } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { money, fmtDate, fmtDateTime, PAYMENT_METHODS } from '@/lib/format';
import { productImg } from '@/lib/catalogue';
import { locationLabel, fmtKm, getLocation } from '@/lib/locations';
import { FUL_FLOW, FUL_STATUS, FUL_SHORT, indexOffers } from '@/lib/fulfilment';
import { Pill, OrderProgress, EmptyState, Modal, Field } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Card, KV, Skeleton } from '@/components/admin/common';
import { useVendor } from '@/components/vendor/hooks';

const NEXT = { assigned: 'accepted', accepted: 'packed', packed: 'shipped', shipped: 'delivered' };
const NEXT_LABEL = { accepted: 'Accept order', packed: 'Mark as packed', shipped: 'Mark as shipped', delivered: 'Mark as delivered' };
const DECLINE_REASONS = ['Out of stock', 'Stock damaged', 'Cannot deliver to this area', 'Other'];

function Job({ job, offersIdx }) {
  const setFulfilmentStatus = useStore((s) => s.setFulfilmentStatus);
  const rejectFulfilment = useStore((s) => s.rejectFulfilment);
  const toast = useToast();
  const router = useRouter();
  const [tracking, setTracking] = useState(job.tracking || '');
  const [decline, setDecline] = useState(null);
  const next = NEXT[job.status];
  const done = ['delivered', 'cancelled'].includes(job.status);

  const advance = () => {
    if (next === 'shipped' && !tracking.trim()) { toast({ text: 'Add a tracking number before marking as shipped.' }); document.getElementById(`trk-${job.key}`)?.focus(); return; }
    const r = setFulfilmentStatus(job.order.id, job.warehouseId, next, { tracking: tracking.trim() });
    toast({ text: r.ok ? `${job.order.id} · ${FUL_SHORT[next].toLowerCase()}` : r.error });
  };
  const doDecline = () => {
    const r = rejectFulfilment(job.order.id, job.warehouseId, decline.reason === 'Other' ? decline.note : decline.reason);
    setDecline(null);
    if (!r.ok) { toast({ text: r.error }); return; }
    toast({ text: `Declined — ${job.order.id} has been passed to another supplier.` });
    router.push('/vendor/orders');
  };

  return (
    <div className="space-y-5">
      <Card title={<span className="flex items-center gap-2"><Warehouse className="w-4 h-4 text-gold" />{job.warehouse?.name}</span>} action={<Pill meta={FUL_STATUS[job.status]}>{FUL_SHORT[job.status]}</Pill>}>
        {job.status !== 'cancelled' && <OrderProgress status={job.status} flow={FUL_FLOW} />}
        {job.status === 'cancelled' && <p className="text-[13px] font-bold text-[#B4432F]">The customer's order was cancelled — stock has been returned to this warehouse.</p>}
        <ul className="divide-y divide-navy/5 mt-5 -mx-5">
          {job.items.map((i) => {
            const o = offersIdx.get(`${i.vendorId}|${i.productId}`);
            const unit = typeof o?.cost === 'number' ? o.cost : i.price;
            return (
              <li key={i.idx} className="flex items-center gap-4 px-5 py-3">
                <img src={i.img ? productImg({ img: i.img }) : '/brand/logo.webp'} alt="" className="w-14 h-14 rounded-xl object-contain bg-ivory border border-navy/5 p-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-navy text-[14px] truncate">{i.name}</p>
                  <p className="text-[12px] text-charcoal/55">{i.size}</p>
                </div>
                <p className="text-[13px] text-charcoal/65 whitespace-nowrap"><b className="text-navy text-[15px]">{i.qty}</b> × {money(unit)}</p>
                <p className="w-24 text-right font-extrabold text-navy">{money(i.qty * unit)}</p>
              </li>
            );
          })}
        </ul>
        <div className="flex justify-between pt-3 mt-1 border-t border-navy/10 text-[14px]"><span className="font-bold text-navy">Your supply value</span><span className="font-extrabold text-navy">{money(job.value)}</span></div>
      </Card>

      {!done && (
        <Card title="Update this shipment" className="print:hidden">
          {['packed', 'shipped'].includes(next) || job.status === 'shipped' ? (
            <>
              <label className="dash-label" htmlFor={`trk-${job.key}`}>Tracking number{next === 'shipped' ? ' *' : ''}</label>
              <input id={`trk-${job.key}`} className="dash-input" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="e.g. AUP123456789" />
            </>
          ) : null}
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            {next && <button className="dash-btn dash-btn-navy flex-1" onClick={advance}>{next === 'accepted' ? <CheckCircle2 /> : <Truck />}{NEXT_LABEL[next]} <ArrowRight /></button>}
            {['assigned', 'accepted'].includes(job.status) && <button className="dash-btn dash-btn-danger" onClick={() => setDecline({ reason: DECLINE_REASONS[0], note: '' })}><XCircle /> Can&apos;t fulfil</button>}
          </div>
          {job.status === 'assigned' && <p className="text-[12px] text-charcoal/55 mt-3">Stock for these items is already reserved from this warehouse. If you can&apos;t fill it, decline and it goes to the next nearest supplier.</p>}
        </Card>
      )}

      <Modal open={!!decline} onClose={() => setDecline(null)} kicker={job.order.id} title="Decline this shipment?" size="max-w-md"
        footer={<><button className="dash-btn dash-btn-ghost" onClick={() => setDecline(null)}>Keep it</button><button className="dash-btn bg-[#B4432F] text-white hover:bg-[#93351f]" onClick={doDecline}>Decline &amp; pass on</button></>}>
        {decline && (
          <div className="space-y-4">
            <p className="text-[13.5px] text-charcoal/65">The reserved stock returns to your warehouse and the order is routed to the next nearest supplier.</p>
            <Field label="Reason"><select className="dash-input" value={decline.reason} onChange={(e) => setDecline({ ...decline, reason: e.target.value })}>{DECLINE_REASONS.map((r) => <option key={r}>{r}</option>)}</select></Field>
            {decline.reason === 'Other' && <Field label="Details"><input className="dash-input" value={decline.note} onChange={(e) => setDecline({ ...decline, note: e.target.value })} /></Field>}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function VendorOrderDetail() {
  const { id } = useParams();
  const ready = useStoreReady();
  const offers = useStore((s) => s.offers);
  const { jobs } = useVendor();
  const mine = jobs.filter((j) => j.order.id === id);

  if (!ready) return <Skeleton />;
  if (!mine.length) return <EmptyState icon={FileText} title="Order not found" body={`${id} isn't assigned to your warehouses (it may have been re-routed).`} action={<Link href="/vendor/orders" className="dash-btn dash-btn-navy">Back to my orders</Link>} />;

  const order = mine[0].order;
  const otherParts = Object.keys(order.fulfilments || {}).length + (order.items.some((i) => !i.warehouseId) ? 1 : 0) - mine.length;
  const idx = indexOffers(offers);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          <Link href="/vendor/orders" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-charcoal/60 hover:text-navy"><ArrowLeft className="w-4 h-4" /> My orders</Link>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <h1 className="h-display text-navy text-[2rem]">{order.id}</h1>
            {order.guest && <span className="pill bg-ivory text-charcoal/70 border border-navy/10">Guest order</span>}
          </div>
          <p className="text-[13px] text-charcoal/55 mt-1">Placed {fmtDateTime(order.createdAt)} · delivering to {locationLabel(order.location)} · {fmtKm(mine[0].distanceKm)} from {getLocation(mine[0].warehouse?.locationId)?.city}</p>
        </div>
        <button className="dash-btn dash-btn-ghost" onClick={() => window.print()}><Printer /> Packing slip</button>
      </div>

      <div className="hidden print:flex items-center justify-between mb-6">
        <img src="/brand/logo.webp" alt="" className="h-16" />
        <div className="text-right"><p className="font-display text-2xl text-navy">Packing slip</p><p className="text-sm">{order.id} · {fmtDate(order.createdAt)}</p></div>
      </div>

      {otherParts > 0 && (
        <p className="mb-5 rounded-xl bg-[#E6EEF8] px-4 py-3 text-[13px] text-navy-600 print:hidden">This is a split order — {otherParts} other part{otherParts > 1 ? 's ship' : ' ships'} from another warehouse. Only pack the items listed here.</p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5">
        <div className="space-y-5 min-w-0">
          {mine.map((j) => <Job key={j.key} job={j} offersIdx={idx} />)}
        </div>
        <div className="space-y-5">
          <Card title="Deliver to">
            <p className="font-bold text-navy">{order.customer.company || order.customer.name}</p>
            {order.customer.company && <p className="text-[13px] text-charcoal/60">{order.customer.name}</p>}
            {order.address && (
              <p className="flex gap-2 text-[13.5px] text-charcoal/80 leading-relaxed mt-3"><MapPin className="w-4 h-4 mt-0.5 text-navy/40 shrink-0" />
                <span>{order.address.line1}<br />{order.address.city} {order.address.state} {order.address.postcode}<br />{order.address.country}</span>
              </p>
            )}
            <div className="mt-3 space-y-1 text-[13px] text-charcoal/75">
              {order.customer.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-navy/40" />{order.customer.phone}</p>}
              <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-navy/40" />{order.customer.email}</p>
            </div>
            {order.notes && <p className="mt-3 text-[13px] bg-ivory rounded-xl p-3"><b className="text-navy">Customer note:</b> {order.notes}</p>}
          </Card>
          <Card title="Order info" className="print:hidden">
            <KV k="Payment" v={PAYMENT_METHODS[order.paymentMethod]} />
            <KV k="Collected by" v="JOLOF TRADING" />
            <p className="text-[12px] text-charcoal/50 mt-2">JOLOF TRADING collects payment from the customer and settles your supply value.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
