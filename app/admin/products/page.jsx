'use client';
import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Package, Star, Flame, Sparkles, ThumbsUp, EyeOff } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { money, sizeLine, stockState, STOCK_STATE } from '@/lib/format';
import { PageHeader, Pill, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Card, TableWrap, SearchBox, Select, Thumb, Skeleton, useConfirm } from '@/components/admin/common';
import ProductEditor from '@/components/admin/ProductEditor';

const FLAGS = [['featured', Star, 'Featured'], ['bestSeller', Flame, 'Popular'], ['newArrival', Sparkles, 'Just landed'], ['recommended', ThumbsUp, 'Recommended']];

function ProductsInner() {
  const ready = useStoreReady();
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const deleteProduct = useStore((s) => s.deleteProduct);
  const toast = useToast();
  const [ask, dialog] = useConfirm();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('q') || '');
  const [dept, setDept] = useState('');
  const [cat, setCat] = useState('');
  const [stock, setStock] = useState('');
  const [ptype, setPtype] = useState('');
  const [edit, setEdit] = useState(null); // product | 'new' | null

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => (!dept || p.dept === dept) && (!cat || p.cat === cat) && (!stock || stockState(p) === stock)
      && (!ptype || (ptype === 'fixed' ? typeof p.price === 'number' : p.price === null))
      && (!t || `${p.name} ${p.sku} ${p.cat} ${p.size || ''}`.toLowerCase().includes(t)));
  }, [products, q, dept, cat, stock, ptype]);

  if (!ready) return <Skeleton />;

  const onDelete = (p) => ask({ title: `Delete ${p.name}?`, body: 'It will be removed from the store, carts and wishlists. Past orders keep their line items.', confirm: 'Delete product', danger: true }, () => { deleteProduct(p.id); setEdit(null); toast({ text: `${p.name} deleted` }); });
  const catOptions = categories.filter((c) => c.dept !== 'Trading' && (!dept || c.dept === dept));
  const onRequest = products.filter((p) => p.price === null).length;

  return (
    <>
      {dialog}
      <PageHeader kicker="Catalogue" title="Products" sub={`${products.length} products · ${products.length - onRequest} with fixed prices (cart) · ${onRequest} price on request (enquiry)`}
        actions={<button className="dash-btn dash-btn-navy" onClick={() => setEdit('new')}><Plus /> Add product</button>} />
      <Card pad={false}>
        <div className="p-4 sm:p-5 flex flex-wrap gap-2 border-b border-navy/5">
          <SearchBox value={q} onChange={setQ} placeholder="Name, SKU, category…" className="w-full md:w-[260px]" />
          <Select value={dept} onChange={(v) => { setDept(v); setCat(''); }} options={[{ value: '', label: 'All departments' }, 'Food', 'Cosmetics']} />
          <Select value={cat} onChange={setCat} options={[{ value: '', label: 'All categories' }, ...catOptions.map((c) => c.name)]} />
          <Select value={stock} onChange={setStock} options={[{ value: '', label: 'Any stock' }, { value: 'ok', label: 'In stock' }, { value: 'low', label: 'Low stock' }, { value: 'out', label: 'Out of stock' }]} />
          <Select value={ptype} onChange={setPtype} options={[{ value: '', label: 'Any pricing' }, { value: 'fixed', label: 'Fixed price' }, { value: 'request', label: 'Price on request' }]} />
          <span className="ml-auto self-center text-[12.5px] font-bold text-charcoal/50">{list.length} shown</span>
        </div>
        {list.length === 0 ? <EmptyState icon={Package} title="No products match" body="Clear a filter or add a new product." /> : (
          <TableWrap>
            <table className="dash-table">
              <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th className="text-right">Price</th><th>Stock</th><th>Home page</th><th>Status</th></tr></thead>
              <tbody>
                {list.map((p) => {
                  const st = stockState(p);
                  return (
                    <tr key={p.id} className="cursor-pointer" onClick={() => setEdit(p)}>
                      <td className="min-w-[260px]">
                        <div className="flex items-center gap-3">
                          <Thumb p={p} />
                          <div className="min-w-0">
                            <p className="font-bold text-navy truncate max-w-[280px]">{p.name}</p>
                            <p className="text-[11.5px] text-charcoal/50 truncate max-w-[280px]">{sizeLine(p) || '—'}{p.tag ? ` · ${p.tag}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-[12px] font-mono text-charcoal/60 whitespace-nowrap">{p.sku}</td>
                      <td className="whitespace-nowrap"><span className="text-navy font-semibold">{p.cat}</span><span className="block text-[11.5px] text-charcoal/50">{p.dept}</span></td>
                      <td className="text-right whitespace-nowrap">{typeof p.price === 'number' ? <b className="text-navy">{money(p.price)}</b> : <span className="text-[12px] font-bold text-emerald">On request</span>}</td>
                      <td className="whitespace-nowrap"><span className="font-bold text-navy mr-2">{p.stock}</span><Pill meta={STOCK_STATE[st]} /></td>
                      <td>
                        <div className="flex gap-1">
                          {FLAGS.map(([key, Icon, label]) => <span key={key} title={label} className={`w-7 h-7 rounded-full grid place-items-center ${p[key] ? 'bg-gold-pale text-[#8a6417]' : 'text-navy/15'}`}><Icon className="w-3.5 h-3.5" /></span>)}
                        </div>
                      </td>
                      <td>{p.status === 'active' ? <span className="pill bg-[#E3F2EA] text-emerald">Visible</span> : <span className="pill bg-sand text-charcoal/60"><EyeOff className="w-3 h-3" />Hidden</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
      <ProductEditor open={!!edit} product={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onDelete={onDelete} />
    </>
  );
}

export default function ProductsPage() {
  return <Suspense fallback={<Skeleton />}><ProductsInner /></Suspense>;
}
