'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, Check, X } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { money, fmtDate, REQUEST_STATUS } from '@/lib/format';
import { productImg } from '@/lib/catalogue';
import { PageHeader, Pill, Tabs, EmptyState, Drawer, Field } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Card, TableWrap, Skeleton } from '@/components/admin/common';

/** Admin reviews a supplier's new product → edits the master record → approves (or rejects). */
function Review({ req, onClose }) {
  const categories = useStore((s) => s.categories);
  const warehouses = useStore((s) => s.warehouses);
  const review = useStore((s) => s.reviewProductRequest);
  const toast = useToast();
  const [f, setF] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (req && f?.id !== req.id) {
    setF({ id: req.id, name: req.name, categoryId: req.categoryId, size: req.size || '', pack: req.pack || '', desc: req.desc || '', img: req.img || '', priceMode: req.suggestedPrice ? 'fixed' : 'request', price: req.suggestedPrice ?? '', note: '' });
    setErr('');
  }
  if (!req || !f) return <Drawer open={false} onClose={onClose} title="" />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const act = async (action) => {
    if (action === 'approve' && f.priceMode === 'fixed' && !(Number(f.price) > 0)) { setErr('Enter a store price, or choose “Price on request”.'); return; }
    if (action === 'reject' && !f.note.trim()) { setErr('Tell the supplier why (shown in their portal).'); return; }
    setBusy(true);
    const r = await review(req.id, action, action === 'approve'
      ? { name: f.name, categoryId: f.categoryId, size: f.size, pack: f.pack, desc: f.desc, img: f.img, price: f.priceMode === 'fixed' ? Number(f.price) : null, note: f.note }
      : { note: f.note });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    toast({ text: action === 'approve' ? `${f.name} added to the master catalogue — ${req.company} is now listed as a supplier` : 'Request rejected' });
    onClose();
  };
  const whName = (id) => warehouses.find((w) => w.id === id)?.name || id;
  return (
    <Drawer open={!!req} onClose={onClose} kicker={`From ${req.company}`} title="Review new product" width="max-w-[620px]"
      footer={req.status === 'pending' ? <>
        <button className="dash-btn dash-btn-danger mr-auto" disabled={busy} onClick={() => act('reject')}><X /> Reject</button>
        <button className="dash-btn dash-btn-ghost" onClick={onClose}>Close</button>
        <button className="dash-btn dash-btn-navy" disabled={busy} onClick={() => act('approve')}><Check /> Approve &amp; add to catalogue</button>
      </> : <button className="dash-btn dash-btn-ghost" onClick={onClose}>Close</button>}>
      <div className="space-y-5">
        <div className="flex gap-4 rounded-2xl bg-ivory p-4">
          <img src={productImg({ img: f.img })} alt="" className="w-20 h-20 rounded-xl object-contain bg-white p-1 shrink-0" />
          <div className="text-[13px] text-charcoal/70 space-y-0.5">
            <p><b className="text-navy">Supply price:</b> {req.cost != null ? money(req.cost) : 'per order'}</p>
            <p><b className="text-navy">Suggested retail:</b> {req.suggestedPrice != null ? money(req.suggestedPrice) : '—'}</p>
            <p><b className="text-navy">Stock offered:</b> {Object.entries(req.stock || {}).map(([w, n]) => `${whName(w)}: ${n}`).join(' · ') || '—'}</p>
          </div>
        </div>
        {req.status !== 'pending' && <p className="text-[13px] rounded-xl bg-ivory px-4 py-3">{REQUEST_STATUS[req.status].label} {fmtDate(req.reviewedAt)}{req.adminNote ? ` — ${req.adminNote}` : ''}{req.productId && <> · <Link href="/admin/products" className="font-bold text-emerald">View product</Link></>}</p>}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Product name" className="sm:col-span-2"><input className="dash-input" value={f.name} onChange={set('name')} /></Field>
          <Field label="Category">
            <select className="dash-input" value={f.categoryId} onChange={set('categoryId')}>
              {categories.filter((c) => c.dept !== 'Trading').map((c) => <option key={c.id} value={c.id}>{c.dept} · {c.name}</option>)}
            </select>
          </Field>
          <Field label="Size"><input className="dash-input" value={f.size} onChange={set('size')} /></Field>
          <Field label="Wholesale pack"><input className="dash-input" value={f.pack} onChange={set('pack')} /></Field>
          <Field label="Image (file name or URL)"><input className="dash-input" value={f.img} onChange={set('img')} /></Field>
          <Field label="Description" className="sm:col-span-2"><textarea rows={3} className="dash-input" value={f.desc} onChange={set('desc')} /></Field>
        </div>
        <div>
          <span className="dash-label">Store pricing</span>
          <div className="grid grid-cols-2 gap-2 p-1 bg-ivory rounded-full border border-navy/10">
            {[['fixed', 'Fixed price'], ['request', 'Price on request']].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setF({ ...f, priceMode: v })} className={`h-10 rounded-full text-[12.5px] font-bold transition ${f.priceMode === v ? 'bg-navy text-white' : 'text-navy/70'}`}>{l}</button>
            ))}
          </div>
          {f.priceMode === 'fixed' && <Field label="Store price (USD)" className="mt-3"><input type="number" min="0" step="0.01" className="dash-input" value={f.price} onChange={set('price')} /></Field>}
        </div>
        <Field label="Note to supplier" hint="Required when rejecting."><input className="dash-input" value={f.note} onChange={set('note')} /></Field>
        {err && <p className="text-[13px] font-bold text-[#B4432F]">{err}</p>}
      </div>
    </Drawer>
  );
}

export default function ProductRequestsPage() {
  const ready = useStoreReady();
  const requests = useStore((s) => s.productRequests);
  const [tab, setTab] = useState('pending');
  const [open, setOpen] = useState(null);
  const list = useMemo(() => requests.filter((r) => tab === 'all' || r.status === tab), [requests, tab]);
  const count = (t) => requests.filter((r) => t === 'all' || r.status === t).length;
  if (!ready) return <Skeleton />;
  return (
    <>
      <PageHeader kicker="Catalogue" title="Product requests" sub="Suppliers propose products that aren't in the catalogue yet. Approving creates the master product (you set the store price) and lists the supplier's stock against it." />
      <Card pad={false}>
        <div className="p-4 sm:p-5 border-b border-navy/5">
          <Tabs value={tab} onChange={setTab} tabs={['pending', 'approved', 'rejected', 'all'].map((t) => ({ value: t, label: t === 'all' ? 'All' : REQUEST_STATUS[t].label, count: count(t) }))} />
        </div>
        {list.length === 0 ? <EmptyState icon={ClipboardCheck} title="Nothing here" body="New product proposals from suppliers show up here for approval." /> : (
          <TableWrap>
            <table className="dash-table">
              <thead><tr><th>Product</th><th>Supplier</th><th>Category</th><th>Supply price</th><th className="text-center">Units</th><th>Sent</th><th>Status</th><th /></tr></thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <td className="min-w-[220px]"><div className="flex items-center gap-3"><img src={productImg({ img: r.img })} alt="" className="w-10 h-10 rounded-lg object-contain bg-ivory p-0.5 shrink-0" /><div className="min-w-0"><p className="font-bold text-navy truncate">{r.name}</p><p className="text-[11.5px] text-charcoal/50">{[r.size, r.pack].filter(Boolean).join(' · ')}</p></div></div></td>
                    <td className="text-navy font-semibold">{r.company}</td>
                    <td className="text-charcoal/70 whitespace-nowrap">{r.dept} · {r.cat}</td>
                    <td className="whitespace-nowrap">{r.cost != null ? money(r.cost) : '—'}{r.suggestedPrice != null && <span className="block text-[11px] text-charcoal/45">suggests {money(r.suggestedPrice)}</span>}</td>
                    <td className="text-center">{Object.values(r.stock || {}).reduce((s, n) => s + n, 0)}</td>
                    <td className="whitespace-nowrap text-charcoal/60">{fmtDate(r.createdAt)}</td>
                    <td><Pill meta={REQUEST_STATUS[r.status]} /></td>
                    <td className="text-right"><button className={`dash-btn ${r.status === 'pending' ? 'dash-btn-navy' : 'dash-btn-ghost'} !h-8 !px-3`} onClick={() => setOpen(r)}>{r.status === 'pending' ? 'Review' : 'View'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
      <Review req={open} onClose={() => setOpen(null)} />
    </>
  );
}
