'use client';
import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Boxes, Layers, AlertTriangle, PackageX, Minus, Plus, SlidersHorizontal, History, Warehouse, Network } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { sizeLine, stockState, STOCK_STATE, fmtDateTime, money } from '@/lib/format';
import { getLocation } from '@/lib/locations';
import { activeVendorIds } from '@/lib/fulfilment';
import { PageHeader, StatCard, Pill, Modal, Drawer, Field, Tabs, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Card, TableWrap, SearchBox, Select, Thumb, Skeleton } from '@/components/admin/common';
import { SUPPLIER_STATUS, shortName } from '@/components/admin/suppliers';

const REASONS = ['Container received', 'Damaged', 'Stock count correction', 'Returned'];

function InventoryInner() {
  const ready = useStoreReady();
  const products = useStore((s) => s.products);
  const offers = useStore((s) => s.offers);
  const warehouses = useStore((s) => s.warehouses);
  const users = useStore((s) => s.users);
  const stockLog = useStore((s) => s.stockLog);
  const adjustWarehouseStock = useStore((s) => s.adjustWarehouseStock);
  const toast = useToast();
  const sp = useSearchParams();
  const [filter, setFilter] = useState(sp.get('filter') || 'all');
  const [vendor, setVendor] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null); // product id for breakdown drawer
  const [adj, setAdj] = useState(null); // { p, warehouseId, dir, qty, reason, ref }

  const vendors = useMemo(() => users.filter((u) => u.role === 'vendor'), [users]);
  const vById = useMemo(() => Object.fromEntries(vendors.map((v) => [v.id, v])), [vendors]);
  const whById = useMemo(() => Object.fromEntries(warehouses.map((w) => [w.id, w])), [warehouses]);
  const live = useMemo(() => activeVendorIds(users), [users]);

  // product → [{ vendor, offer, total }]
  const holders = useMemo(() => {
    const m = {};
    offers.forEach((o) => {
      const total = Object.values(o.stock || {}).reduce((s, n) => s + (Number(n) || 0), 0);
      (m[o.productId] = m[o.productId] || []).push({ v: vById[o.vendorId], o, total });
    });
    Object.values(m).forEach((list) => list.sort((a, b) => b.total - a.total));
    return m;
  }, [offers, vById]);

  const stats = useMemo(() => ({
    skus: products.length,
    units: products.reduce((s, p) => s + p.stock, 0),
    low: products.filter((p) => stockState(p) === 'low').length,
    out: products.filter((p) => stockState(p) === 'out').length,
    single: products.filter((p) => (holders[p.id] || []).filter((h) => h.total > 0 && live.has(h.v?.id)).length === 1).length,
  }), [products, holders, live]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => {
      const st = stockState(p);
      const hs = holders[p.id] || [];
      return (filter === 'all' || (filter === 'attention' ? st !== 'ok' : filter === 'single' ? hs.filter((h) => h.total > 0 && live.has(h.v?.id)).length === 1 : st === filter))
        && (!vendor || hs.some((h) => h.v?.id === vendor))
        && (!t || `${p.name} ${p.sku}`.toLowerCase().includes(t));
    }).sort((a, b) => a.stock / Math.max(1, a.lowStock) - b.stock / Math.max(1, b.lowStock));
  }, [products, holders, filter, vendor, q, live]);

  const names = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p.name])), [products]);

  if (!ready) return <Skeleton />;

  const drawerP = products.find((p) => p.id === open);
  const quick = (p, w, change) => adjustWarehouseStock({ vendorId: w.vendorId, productId: p.id, warehouseId: w.id }, change, 'Quick adjustment');
  const saveAdj = () => {
    const n = parseInt(adj.qty, 10);
    const w = whById[adj.warehouseId];
    if (!(n > 0) || !w) return;
    const change = adj.dir === 'add' ? n : -n;
    adjustWarehouseStock({ vendorId: w.vendorId, productId: adj.p.id, warehouseId: w.id }, change, adj.reason + (adj.ref ? ` — ${adj.ref}` : ''));
    toast({ text: `${adj.p.name} @ ${w.name}: ${change > 0 ? '+' : ''}${change} units`, product: adj.p });
    setAdj(null);
  };
  const atWh = (p, w) => Number(offers.find((o) => o.vendorId === w.vendorId && o.productId === p.id)?.stock?.[w.id]) || 0;

  return (
    <>
      <PageHeader kicker="Stock" title="Inventory" sub="Stock is held by suppliers in their own warehouses. Totals below count active suppliers only. Orders take stock from the warehouse they are routed to and return it on cancel." />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Layers} label="Total SKUs" value={stats.skus} hint={`${stats.single} with only one supplier`} />
        <StatCard icon={Boxes} label="Units across network" value={stats.units.toLocaleString()} hint={`${warehouses.filter((w) => live.has(w.vendorId)).length} active warehouses`} tone="emerald" />
        <StatCard icon={AlertTriangle} label="Low stock" value={stats.low} tone="gold" />
        <StatCard icon={PackageX} label="Out of stock" value={stats.out} tone="ivory" />
      </div>

      <div className="mt-5 grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_340px] gap-5">
        <Card pad={false}>
          <div className="p-4 sm:p-5 flex flex-col 2xl:flex-row 2xl:items-center gap-3 justify-between border-b border-navy/5">
            <Tabs value={filter} onChange={setFilter} tabs={[{ value: 'all', label: 'All' }, { value: 'attention', label: 'Needs attention', count: stats.low + stats.out }, { value: 'low', label: 'Low', count: stats.low }, { value: 'out', label: 'Out', count: stats.out }, { value: 'single', label: 'Single supplier', count: stats.single }]} />
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={vendor} onChange={setVendor} options={[{ value: '', label: 'All suppliers' }, ...vendors.map((v) => ({ value: v.id, label: v.company }))]} />
              <SearchBox value={q} onChange={setQ} placeholder="Product or SKU" className="sm:w-[220px]" />
            </div>
          </div>
          {list.length === 0 ? <EmptyState icon={Boxes} title="Nothing here" body="All products are healthy." /> : (
            <TableWrap>
              <table className="dash-table">
                <thead><tr><th>Product</th><th>Available at</th><th>Status</th><th className="text-center">Total</th><th /></tr></thead>
                <tbody>
                  {list.map((p) => {
                    const hs = holders[p.id] || [];
                    return (
                      <tr key={p.id}>
                        <td className="min-w-[220px]"><div className="flex items-center gap-3"><Thumb p={p} size="w-10 h-10" /><div className="min-w-0"><p className="font-bold text-navy truncate max-w-[240px]">{p.name}</p><p className="text-[11.5px] text-charcoal/50 truncate max-w-[240px]">{sizeLine(p)} · {p.sku}</p></div></div></td>
                        <td className="min-w-[220px]">
                          {hs.length === 0 ? <span className="text-[12.5px] text-[#B4432F] font-semibold">No supplier carries this</span> : (
                            <div className="flex flex-wrap gap-1.5">
                              {hs.map(({ v, o, total }) => {
                                const off = !live.has(v?.id) || o.status === 'paused';
                                return (
                                  <span key={o.id} title={`${v?.company}${off ? ' (not active)' : ''}`} className={`pill ${off ? 'bg-sand text-charcoal/45 line-through' : total > 0 ? 'bg-[#E3F2EA] text-emerald' : 'bg-[#F8E7E3] text-[#B4432F]'}`}>
                                    {shortName(v)} · {total}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>
                        <td><Pill meta={STOCK_STATE[stockState(p)]} /><span className="block text-[11px] text-charcoal/45 mt-0.5">alert at {p.lowStock}</span></td>
                        <td className="text-center font-extrabold text-navy">{p.stock}</td>
                        <td className="text-right"><button className="dash-btn dash-btn-ghost !h-8 !px-3" onClick={() => setOpen(p.id)}><Network /> By warehouse</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>

        <Card title="Stock movements" action={<History className="w-4 h-4 text-gold" />}>
          <ul className="-mx-1 max-h-[640px] overflow-y-auto">
            {stockLog.slice(0, 50).map((l) => (
              <li key={l.id} className="flex gap-3 px-1 py-2.5 border-b border-navy/5 last:border-0">
                <span className={`w-12 shrink-0 text-right text-[13px] font-extrabold ${l.change > 0 ? 'text-emerald' : 'text-[#B4432F]'}`}>{l.change > 0 ? '+' : ''}{l.change}</span>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-navy truncate">{names[l.productId] || 'Deleted product'}</p>
                  <p className="text-[11.5px] text-charcoal/55 truncate">{l.reason}{l.warehouseId && whById[l.warehouseId] ? ` · ${whById[l.warehouseId].name}` : ''}</p>
                  <p className="text-[11px] text-charcoal/40">{l.by} · {fmtDateTime(l.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Drawer open={!!drawerP} onClose={() => setOpen(null)} kicker="Stock by supplier & warehouse" title={drawerP?.name || ''} width="max-w-[620px]"
        footer={drawerP && <button className="dash-btn dash-btn-navy" onClick={() => setAdj({ p: drawerP, warehouseId: '', dir: 'add', qty: '', reason: REASONS[0], ref: '' })}><SlidersHorizontal /> Adjust stock</button>}>
        {drawerP && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-ivory p-3">
              <Thumb p={drawerP} size="w-14 h-14" />
              <div className="min-w-0 flex-1"><p className="text-[12.5px] text-charcoal/55">{sizeLine(drawerP)} · {drawerP.sku}</p><p className="text-[13px] text-navy">Network total <b>{drawerP.stock}</b> · <Pill meta={STOCK_STATE[stockState(drawerP)]} /></p></div>
            </div>
            {vendors.map((v) => {
              const o = offers.find((x) => x.vendorId === v.id && x.productId === drawerP.id);
              const whs = warehouses.filter((w) => w.vendorId === v.id);
              if (!o && v.type !== 'house') return null;
              return (
                <div key={v.id} className="rounded-2xl border border-navy/10 overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 py-3 bg-ivory/60">
                    <Link href={`/admin/vendors/${v.id}`} className="font-extrabold text-navy hover:text-emerald truncate">{v.company}</Link>
                    <span className="flex items-center gap-2 shrink-0">
                      {o && typeof o.cost === 'number' && <span className="text-[12px] text-charcoal/55">supply {money(o.cost)}</span>}
                      <Pill meta={o?.status === 'paused' ? { label: 'Paused', cls: 'bg-sand text-charcoal/60' } : SUPPLIER_STATUS[v.status]} />
                    </span>
                  </div>
                  <ul className="divide-y divide-navy/5">
                    {whs.map((w) => (
                      <li key={w.id} className="flex items-center gap-3 px-4 py-2.5">
                        <Warehouse className={`w-4 h-4 shrink-0 ${w.active ? 'text-emerald' : 'text-navy/30'}`} />
                        <div className="min-w-0 flex-1"><p className="text-[13.5px] font-semibold text-navy truncate">{w.name}</p><p className="text-[11.5px] text-charcoal/50">{getLocation(w.locationId)?.city} {getLocation(w.locationId)?.state}</p></div>
                        <div className="qty bg-white">
                          <button onClick={() => quick(drawerP, w, -1)} disabled={atWh(drawerP, w) <= 0} aria-label={`Remove one at ${w.name}`}><Minus className="w-3.5 h-3.5" /></button>
                          <span className="px-1">{atWh(drawerP, w)}</span>
                          <button onClick={() => quick(drawerP, w, 1)} aria-label={`Add one at ${w.name}`}><Plus className="w-3.5 h-3.5" /></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            <p className="text-[12px] text-charcoal/50">Suppliers manage their own stock from the supplier portal; use adjustments here for corrections and container receipts.</p>
          </div>
        )}
      </Drawer>

      <Modal open={!!adj} onClose={() => setAdj(null)} kicker="Adjust stock" title={adj?.p.name || ''} size="max-w-md"
        footer={<><button className="dash-btn dash-btn-ghost" onClick={() => setAdj(null)}>Cancel</button><button className="dash-btn dash-btn-navy" disabled={!(parseInt(adj?.qty, 10) > 0) || !adj?.warehouseId} onClick={saveAdj}>Save adjustment</button></>}>
        {adj && (
          <div className="space-y-4">
            <Field label="Warehouse">
              <select className="dash-input" value={adj.warehouseId} onChange={(e) => setAdj({ ...adj, warehouseId: e.target.value })}>
                <option value="">Select warehouse…</option>
                {vendors.map((v) => (
                  <optgroup key={v.id} label={v.company}>
                    {warehouses.filter((w) => w.vendorId === v.id).map((w) => <option key={w.id} value={w.id}>{w.name} — {atWh(adj.p, w)} on hand</option>)}
                  </optgroup>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2 p-1 bg-ivory rounded-full border border-navy/10">
              {[['add', 'Add stock'], ['remove', 'Remove stock']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setAdj({ ...adj, dir: v, reason: v === 'add' ? 'Container received' : 'Damaged' })} className={`h-10 rounded-full text-[13px] font-bold ${adj.dir === v ? 'bg-navy text-white' : 'text-navy/70'}`}>{l}</button>
              ))}
            </div>
            <Field label="Quantity"><input type="number" min="1" className="dash-input" value={adj.qty} onChange={(e) => setAdj({ ...adj, qty: e.target.value })} /></Field>
            <Field label="Reason"><select className="dash-input" value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })}>{REASONS.map((r) => <option key={r}>{r}</option>)}</select></Field>
            <Field label="Reference (optional)"><input className="dash-input" value={adj.ref} onChange={(e) => setAdj({ ...adj, ref: e.target.value })} placeholder="e.g. Container JT-C15" /></Field>
            {parseInt(adj.qty, 10) > 0 && adj.warehouseId && <p className="text-[13px] text-charcoal/65">New level at this warehouse: <b className="text-navy">{Math.max(0, atWh(adj.p, whById[adj.warehouseId]) + (adj.dir === 'add' ? 1 : -1) * parseInt(adj.qty, 10))}</b></p>}
          </div>
        )}
      </Modal>
    </>
  );
}

export default function InventoryPage() {
  return <Suspense fallback={<Skeleton />}><InventoryInner /></Suspense>;
}
