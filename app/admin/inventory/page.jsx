'use client';
import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Boxes, Layers, AlertTriangle, PackageX, Minus, Plus, SlidersHorizontal, History } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { sizeLine, stockState, STOCK_STATE, fmtDateTime } from '@/lib/format';
import { PageHeader, StatCard, Pill, Modal, Field, Tabs, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Card, TableWrap, SearchBox, Thumb, Skeleton } from '@/components/admin/common';

const REASONS = ['Container received', 'Damaged', 'Stock count correction', 'Returned'];

function InventoryInner() {
  const ready = useStoreReady();
  const products = useStore((s) => s.products);
  const stockLog = useStore((s) => s.stockLog);
  const adjustStock = useStore((s) => s.adjustStock);
  const toast = useToast();
  const sp = useSearchParams();
  const [filter, setFilter] = useState(sp.get('filter') || 'all');
  const [q, setQ] = useState('');
  const [adj, setAdj] = useState(null); // { p, dir, qty, reason }

  const stats = useMemo(() => ({
    skus: products.length,
    units: products.reduce((s, p) => s + p.stock, 0),
    low: products.filter((p) => stockState(p) === 'low').length,
    out: products.filter((p) => stockState(p) === 'out').length,
  }), [products]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => {
      const st = stockState(p);
      return (filter === 'all' || (filter === 'attention' ? st !== 'ok' : st === filter)) && (!t || `${p.name} ${p.sku}`.toLowerCase().includes(t));
    }).sort((a, b) => a.stock / Math.max(1, a.lowStock) - b.stock / Math.max(1, b.lowStock));
  }, [products, filter, q]);

  const names = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p.name])), [products]);

  if (!ready) return <Skeleton />;

  const quick = (p, change) => { adjustStock(p.id, change, 'Quick adjustment'); };
  const saveAdj = () => {
    const n = parseInt(adj.qty, 10);
    if (!(n > 0)) return;
    const change = adj.dir === 'add' ? n : -n;
    adjustStock(adj.p.id, change, adj.reason + (adj.ref ? ` — ${adj.ref}` : ''));
    toast({ text: `${adj.p.name}: ${change > 0 ? '+' : ''}${change} units`, product: adj.p });
    setAdj(null);
  };

  return (
    <>
      <PageHeader kicker="Stock" title="Inventory" sub="Stock goes down automatically when orders are placed and comes back when an order is cancelled. Record deliveries and corrections here." />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Layers} label="Total SKUs" value={stats.skus} />
        <StatCard icon={Boxes} label="Units on hand" value={stats.units.toLocaleString()} tone="emerald" />
        <StatCard icon={AlertTriangle} label="Low stock" value={stats.low} tone="gold" />
        <StatCard icon={PackageX} label="Out of stock" value={stats.out} tone="ivory" />
      </div>

      <div className="mt-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
        <Card pad={false}>
          <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-3 justify-between border-b border-navy/5">
            <Tabs value={filter} onChange={setFilter} tabs={[{ value: 'all', label: 'All' }, { value: 'attention', label: 'Needs attention', count: stats.low + stats.out }, { value: 'low', label: 'Low', count: stats.low }, { value: 'out', label: 'Out', count: stats.out }]} />
            <SearchBox value={q} onChange={setQ} placeholder="Product or SKU" className="md:w-[240px]" />
          </div>
          {list.length === 0 ? <EmptyState icon={Boxes} title="Nothing here" body="All products are healthy." /> : (
            <TableWrap>
              <table className="dash-table">
                <thead><tr><th>Product</th><th>SKU</th><th>Alert at</th><th>Status</th><th className="text-center">On hand</th><th /></tr></thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id}>
                      <td className="min-w-[220px]"><div className="flex items-center gap-3"><Thumb p={p} size="w-10 h-10" /><div className="min-w-0"><p className="font-bold text-navy truncate max-w-[240px]">{p.name}</p><p className="text-[11.5px] text-charcoal/50 truncate max-w-[240px]">{sizeLine(p)}</p></div></div></td>
                      <td className="text-[12px] font-mono text-charcoal/60 whitespace-nowrap">{p.sku}</td>
                      <td className="text-charcoal/60">{p.lowStock}</td>
                      <td><Pill meta={STOCK_STATE[stockState(p)]} /></td>
                      <td>
                        <div className="qty mx-auto bg-white">
                          <button onClick={() => quick(p, -1)} disabled={p.stock <= 0} aria-label={`Remove one ${p.name}`}><Minus className="w-3.5 h-3.5" /></button>
                          <span className="px-1">{p.stock}</span>
                          <button onClick={() => quick(p, 1)} aria-label={`Add one ${p.name}`}><Plus className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                      <td className="text-right"><button className="dash-btn dash-btn-ghost !h-8 !px-3" onClick={() => setAdj({ p, dir: 'add', qty: '', reason: REASONS[0], ref: '' })}><SlidersHorizontal /> Adjust</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>

        <Card title="Stock movements" action={<History className="w-4 h-4 text-gold" />}>
          <ul className="-mx-1 max-h-[640px] overflow-y-auto">
            {stockLog.slice(0, 40).map((l) => (
              <li key={l.id} className="flex gap-3 px-1 py-2.5 border-b border-navy/5 last:border-0">
                <span className={`w-12 shrink-0 text-right text-[13px] font-extrabold ${l.change > 0 ? 'text-emerald' : 'text-[#B4432F]'}`}>{l.change > 0 ? '+' : ''}{l.change}</span>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-navy truncate">{names[l.productId] || 'Deleted product'}</p>
                  <p className="text-[11.5px] text-charcoal/55 truncate">{l.reason}</p>
                  <p className="text-[11px] text-charcoal/40">{l.by} · {fmtDateTime(l.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Modal open={!!adj} onClose={() => setAdj(null)} kicker="Adjust stock" title={adj?.p.name || ''} size="max-w-md"
        footer={<><button className="dash-btn dash-btn-ghost" onClick={() => setAdj(null)}>Cancel</button><button className="dash-btn dash-btn-navy" disabled={!(parseInt(adj?.qty, 10) > 0)} onClick={saveAdj}>Save adjustment</button></>}>
        {adj && (
          <div className="space-y-4">
            <p className="text-[13.5px] text-charcoal/65">Currently <b className="text-navy">{adj.p.stock}</b> on hand.</p>
            <div className="grid grid-cols-2 gap-2 p-1 bg-ivory rounded-full border border-navy/10">
              {[['add', 'Add stock'], ['remove', 'Remove stock']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setAdj({ ...adj, dir: v, reason: v === 'add' ? 'Container received' : 'Damaged' })} className={`h-10 rounded-full text-[13px] font-bold ${adj.dir === v ? 'bg-navy text-white' : 'text-navy/70'}`}>{l}</button>
              ))}
            </div>
            <Field label="Quantity"><input autoFocus type="number" min="1" className="dash-input" value={adj.qty} onChange={(e) => setAdj({ ...adj, qty: e.target.value })} /></Field>
            <Field label="Reason"><select className="dash-input" value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })}>{REASONS.map((r) => <option key={r}>{r}</option>)}</select></Field>
            <Field label="Reference (optional)"><input className="dash-input" value={adj.ref} onChange={(e) => setAdj({ ...adj, ref: e.target.value })} placeholder="e.g. Container JT-C15" /></Field>
            {parseInt(adj.qty, 10) > 0 && <p className="text-[13px] text-charcoal/65">New stock level: <b className="text-navy">{Math.max(0, adj.p.stock + (adj.dir === 'add' ? 1 : -1) * parseInt(adj.qty, 10))}</b></p>}
          </div>
        )}
      </Modal>
    </>
  );
}

export default function InventoryPage() {
  return <Suspense fallback={<Skeleton />}><InventoryInner /></Suspense>;
}
