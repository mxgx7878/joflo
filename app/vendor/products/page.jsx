'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Package, Plus, Pencil, Trash2, Warehouse, PauseCircle, PlayCircle, Check } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { money, sizeLine, catLine, priced, fmtDate } from '@/lib/format';
import { DEPARTMENTS } from '@/lib/catalogue';
import { PageHeader, Pill, Modal, Drawer, Field, EmptyState, Tabs } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Card, TableWrap, SearchBox, Select, Thumb, Skeleton, useConfirm } from '@/components/admin/common';
import { useVendor, totalStock } from '@/components/vendor/hooks';

/** Supply price + stock per warehouse for one catalogue product */
function OfferEditor({ open, product, offer, warehouses, onClose }) {
  const saveOffer = useStore((s) => s.saveOffer);
  const toast = useToast();
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState({});
  const [key, setKey] = useState(null);
  if (open && product && key !== product.id + (offer?.id || '')) {
    setKey(product.id + (offer?.id || ''));
    setCost(offer?.cost ?? '');
    setStock(Object.fromEntries(warehouses.map((w) => [w.id, offer?.stock?.[w.id] ?? ''])));
  }
  const total = Object.values(stock).reduce((s, n) => s + (parseInt(n, 10) || 0), 0);
  const save = () => {
    saveOffer({ productId: product.id, cost: cost === '' ? null : Number(cost), stock });
    toast({ text: `${product.name} ${offer ? 'updated' : 'added to your products'} · ${total} units`, product });
    setKey(null);
    onClose();
  };
  return (
    <Modal open={open} onClose={() => { setKey(null); onClose(); }} kicker={offer ? 'Update listing' : 'Add to my products'} title={product?.name || ''} size="max-w-lg"
      footer={<><button className="dash-btn dash-btn-ghost" onClick={() => { setKey(null); onClose(); }}>Cancel</button><button className="dash-btn dash-btn-navy" disabled={!warehouses.length} onClick={save}><Check /> {offer ? 'Save changes' : 'Add product'}</button></>}>
      {product && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-2xl bg-ivory p-3">
            <Thumb p={product} size="w-14 h-14" />
            <div className="min-w-0">
              <p className="text-[12px] text-charcoal/55">{catLine(product)} · {product.sku}</p>
              <p className="text-[13px] text-navy font-semibold">{sizeLine(product)}</p>
              <p className="text-[12px] text-charcoal/55">Store price: {priced(product) ? money(product.price) : 'Price on request'}</p>
            </div>
          </div>
          <Field label="Your supply price (per unit, USD)" hint="What JOLOF TRADING pays you per unit. Leave empty to agree per order.">
            <input type="number" min="0" step="0.01" className="dash-input" value={cost} onChange={(e) => setCost(e.target.value)} placeholder={priced(product) ? `e.g. ${(product.price * 0.75).toFixed(2)}` : ''} />
          </Field>
          <div>
            <p className="dash-label">Stock on hand per warehouse</p>
            {warehouses.length === 0 ? (
              <p className="text-[13px] text-[#8a6417] bg-gold-pale rounded-xl px-4 py-3">Add a warehouse first. <Link href="/vendor/warehouses" className="font-bold underline">Go to warehouses</Link></p>
            ) : (
              <div className="space-y-2">
                {warehouses.map((w) => (
                  <label key={w.id} className="flex items-center gap-3 rounded-xl border border-navy/10 px-3 py-2">
                    <Warehouse className={`w-4 h-4 shrink-0 ${w.active ? 'text-emerald' : 'text-navy/30'}`} />
                    <span className="flex-1 min-w-0 text-[13.5px] font-semibold text-navy truncate">{w.name}{!w.active && <span className="text-charcoal/45 font-normal"> · inactive</span>}</span>
                    <input type="number" min="0" className="dash-input !w-28 !h-9 text-right" value={stock[w.id] ?? ''} onChange={(e) => setStock({ ...stock, [w.id]: e.target.value })} placeholder="0" />
                  </label>
                ))}
                <p className="text-right text-[12.5px] text-charcoal/60">Total: <b className="text-navy">{total}</b> units</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function VendorProducts() {
  const ready = useStoreReady();
  const { me, offers, warehouses, products } = useVendor();
  const saveOffer = useStore((s) => s.saveOffer);
  const removeOffer = useStore((s) => s.removeOffer);
  const toast = useToast();
  const [ask, dialog] = useConfirm();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [edit, setEdit] = useState(null); // { product, offer }
  const [browse, setBrowse] = useState(false);
  const [bq, setBq] = useState('');
  const [bdept, setBdept] = useState('');

  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return offers.map((o) => ({ o, p: byId[o.productId], n: totalStock(o) })).filter((r) => r.p)
      .filter((r) => (tab === 'all' || (tab === 'out' ? r.n === 0 : tab === 'paused' ? r.o.status === 'paused' : r.n > 0 && r.o.status !== 'paused')) && (!t || `${r.p.name} ${r.p.sku}`.toLowerCase().includes(t)))
      .sort((a, b) => a.p.name.localeCompare(b.p.name));
  }, [offers, byId, q, tab]);
  const offered = useMemo(() => new Set(offers.map((o) => o.productId)), [offers]);
  const catalogue = useMemo(() => {
    const t = bq.trim().toLowerCase();
    return products.filter((p) => p.status !== 'hidden' && (!bdept || p.dept === bdept) && (!t || `${p.name} ${p.cat} ${p.sku}`.toLowerCase().includes(t)));
  }, [products, bq, bdept]);

  if (!ready || !me) return <Skeleton />;

  const counts = { all: offers.length, live: offers.filter((o) => totalStock(o) > 0 && o.status !== 'paused').length, out: offers.filter((o) => totalStock(o) === 0).length, paused: offers.filter((o) => o.status === 'paused').length };

  return (
    <>
      {dialog}
      <PageHeader kicker="Catalogue" title="My products" sub="Add the JOLOF catalogue products you stock, with your supply price and how many units each warehouse holds. Only products with stock get orders routed to you."
        actions={<button className="dash-btn dash-btn-navy" onClick={() => setBrowse(true)}><Plus /> Add products</button>} />

      <Card pad={false}>
        <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-3 justify-between border-b border-navy/5">
          <Tabs value={tab} onChange={setTab} tabs={[{ value: 'all', label: 'All', count: counts.all }, { value: 'live', label: 'In stock', count: counts.live }, { value: 'out', label: 'Out of stock', count: counts.out }, { value: 'paused', label: 'Paused', count: counts.paused }]} />
          <SearchBox value={q} onChange={setQ} placeholder="Product or SKU" className="lg:w-[260px]" />
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={Package} title={offers.length ? 'Nothing matches' : 'No products yet'} body={offers.length ? 'Try another tab or search.' : 'Browse the JOLOF catalogue and add the products your warehouses hold.'}
            action={!offers.length && <button className="dash-btn dash-btn-navy" onClick={() => setBrowse(true)}><Plus /> Add products</button>} />
        ) : (
          <TableWrap>
            <table className="dash-table">
              <thead><tr><th>Product</th><th>Supply price</th><th>Stock by warehouse</th><th className="text-center">Total</th><th>Status</th><th>Updated</th><th /></tr></thead>
              <tbody>
                {rows.map(({ o, p, n }) => (
                  <tr key={o.id}>
                    <td className="min-w-[230px]"><div className="flex items-center gap-3"><Thumb p={p} size="w-10 h-10" /><div className="min-w-0"><p className="font-bold text-navy truncate max-w-[240px]">{p.name}</p><p className="text-[11.5px] text-charcoal/50 truncate max-w-[240px]">{sizeLine(p)} · {p.sku}</p></div></div></td>
                    <td className="whitespace-nowrap">{typeof o.cost === 'number' ? <b className="text-navy">{money(o.cost)}</b> : <span className="text-charcoal/45">Per order</span>}{priced(p) && <span className="block text-[11px] text-charcoal/45">Store {money(p.price)}</span>}</td>
                    <td className="min-w-[200px]">
                      <div className="flex flex-wrap gap-1.5">
                        {warehouses.map((w) => <span key={w.id} className={`pill ${(o.stock?.[w.id] || 0) > 0 ? 'bg-ivory text-navy border border-navy/10' : 'bg-[#F8E7E3] text-[#B4432F]'}`}>{w.name.split('—').pop().trim()}: {o.stock?.[w.id] || 0}</span>)}
                      </div>
                    </td>
                    <td className="text-center font-extrabold text-navy">{n}</td>
                    <td>{o.status === 'paused' ? <Pill meta={{ label: 'Paused', cls: 'bg-sand text-charcoal/60' }} /> : n > 0 ? <Pill meta={{ label: 'Receiving orders', cls: 'bg-[#E3F2EA] text-emerald' }} /> : <Pill meta={{ label: 'Out of stock', cls: 'bg-[#F8E7E3] text-[#B4432F]' }} />}</td>
                    <td className="whitespace-nowrap text-charcoal/55 text-[12.5px]">{fmtDate(o.updatedAt)}</td>
                    <td className="text-right"><div className="flex items-center justify-end gap-1">
                      <button className="dash-btn dash-btn-ghost !h-8 !px-3" onClick={() => setEdit({ product: p, offer: o })}><Pencil /> Stock</button>
                      <button className="icon-btn !w-8 !h-8 ml-1" title={o.status === 'paused' ? 'Resume' : 'Pause'} aria-label={o.status === 'paused' ? 'Resume listing' : 'Pause listing'}
                        onClick={() => { saveOffer({ productId: p.id, cost: o.cost, stock: {}, status: o.status === 'paused' ? 'active' : 'paused' }); toast({ text: `${p.name} ${o.status === 'paused' ? 'resumed' : 'paused'}` }); }}>
                        {o.status === 'paused' ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                      </button>
                      <button className="icon-btn !w-8 !h-8 text-[#B4432F]" aria-label={`Remove ${p.name}`} onClick={() => ask({ title: `Remove ${p.name}?`, body: 'It will no longer be routed to you. Orders already assigned are not affected.', confirm: 'Remove', danger: true }, () => { removeOffer(o.id); toast({ text: `${p.name} removed` }); })}><Trash2 className="w-4 h-4" /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>

      <Drawer open={browse} onClose={() => setBrowse(false)} kicker="JOLOF catalogue" title="Add products you stock" width="max-w-[640px]">
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <SearchBox value={bq} onChange={setBq} placeholder="Search the catalogue" className="flex-1" />
          <Select value={bdept} onChange={setBdept} options={[{ value: '', label: 'All departments' }, ...DEPARTMENTS.filter((d) => d !== 'Trading').map((d) => ({ value: d, label: d }))]} />
        </div>
        <ul className="divide-y divide-navy/5 -mx-2">
          {catalogue.map((p) => {
            const has = offered.has(p.id);
            return (
              <li key={p.id} className="flex items-center gap-3 px-2 py-2.5">
                <Thumb p={p} size="w-11 h-11" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-bold text-navy truncate">{p.name}</p>
                  <p className="text-[11.5px] text-charcoal/50 truncate">{catLine(p)} · {sizeLine(p)}</p>
                </div>
                {has
                  ? <span className="pill bg-[#E3F2EA] text-emerald"><Check className="w-3 h-3" />Listed</span>
                  : <button className="dash-btn dash-btn-ghost !h-8 !px-3" onClick={() => setEdit({ product: p, offer: null })}><Plus /> Add</button>}
              </li>
            );
          })}
          {!catalogue.length && <li className="py-10 text-center text-[13px] text-charcoal/55">No catalogue products match.</li>}
        </ul>
        <p className="text-[12px] text-charcoal/50 mt-4">Don&apos;t see a product you carry? Ask JOLOF TRADING to add it to the catalogue.</p>
      </Drawer>

      <OfferEditor open={!!edit} product={edit?.product} offer={edit?.offer} warehouses={warehouses} onClose={() => setEdit(null)} />
    </>
  );
}
