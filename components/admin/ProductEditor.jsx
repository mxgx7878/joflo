'use client';
import { useEffect, useMemo, useState } from 'react';
import { Save, Trash2, Warehouse as WarehouseIcon } from 'lucide-react';
import { ImageInput } from '@/components/ImageInput';
import { useStore } from '@/lib/store';
import { SEED_PRODUCTS, productImg } from '@/lib/catalogue';
import { Drawer, Field } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Toggle } from '@/components/admin/common';
import { useDepartments } from '@/lib/departments';
import { SUPPLIER_STATUS } from '@/components/admin/suppliers';

const IMAGES = [...new Set(SEED_PRODUCTS.map((p) => p.img))];
const blank = { name: '', brand: '', dept: 'Food', cat: 'Spices & Seasonings', size: '', pack: '', price: '', priceMode: 'fixed', tag: '', desc: '', img: IMAGES[0], stock: 0, lowStock: 10, moq: 1, status: 'active', featured: false, bestSeller: false, newArrival: true, recommended: false };

export default function ProductEditor({ product, open, onClose, onDelete }) {
  const categories = useStore((s) => s.categories);
  const depts = useDepartments();
  const firstDept = depts.product[0] || { name: '' };
  const firstCat = categories.find((c) => c.dept === firstDept.name)?.name || '';
  const saveProduct = useStore((s) => s.saveProduct);
  const users = useStore((s) => s.users);
  const warehouses = useStore((s) => s.warehouses);
  const offers = useStore((s) => s.offers);
  const vendors = useMemo(() => users.filter((u) => u.role === 'vendor').sort((a, b) => (b.isHouse ? 1 : 0) - (a.isHouse ? 1 : 0) || (a.company || a.name).localeCompare(b.company || b.name)), [users]);
  // supplier assignment: { [vendorId]: { on, cost, stock: { warehouseId: qty } } }
  const [sup, setSup] = useState({});
  const toast = useToast();
  const [f, setF] = useState(blank);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setErr('');
    setF(product ? { ...blank, ...product, pack: product.pack || '', size: product.size || '', tag: product.tag || '', desc: product.desc || '', priceMode: typeof product.price === 'number' ? 'fixed' : 'request', price: typeof product.price === 'number' ? product.price : '' } : { ...blank, dept: firstDept.name, cat: firstCat });
    const init = {};
    if (product) offers.filter((o) => o.productId === product.id).forEach((o) => {
      init[o.vendorId] = { on: true, cost: o.cost ?? '', status: o.status, stock: { ...(o.stock || {}) }, had: Object.values(o.stock || {}).reduce((a, n) => a + (Number(n) || 0), 0) };
    });
    setSup(init);
  }, [open, product]);

  const toggleSup = (vid, on) => setSup((x) => ({ ...x, [vid]: { cost: '', stock: {}, had: 0, ...x[vid], on } }));
  const setSupField = (vid, patch) => setSup((x) => ({ ...x, [vid]: { ...x[vid], ...patch } }));
  const setSupStock = (vid, wid, qty) => setSup((x) => ({ ...x, [vid]: { ...x[vid], stock: { ...(x[vid]?.stock || {}), [wid]: qty } } }));
  const assigned = vendors.filter((v) => sup[v.id]?.on);
  const totalStock = assigned.reduce((t, v) => t + Object.values(sup[v.id].stock || {}).reduce((a, n) => a + (parseInt(n, 10) || 0), 0), 0);

  const cats = useMemo(() => categories.filter((c) => c.dept === f.dept), [categories, f.dept]);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));

  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!f.name.trim()) return setErr('Product name is required.');
    if (f.priceMode === 'fixed' && !(Number(f.price) > 0)) return setErr('Enter a price, or switch to “Price on request”.');
    const { priceMode, ...rest } = f;
    setBusy(true);
    const r = await saveProduct({
      ...rest, name: f.name.trim(), size: f.size.trim() || null, pack: f.pack.trim() || null, tag: f.tag || undefined, desc: f.desc.trim(),
      price: priceMode === 'fixed' ? Math.round(Number(f.price) * 100) / 100 : null,
      stock: 0, lowStock: Math.max(0, parseInt(f.lowStock, 10) || 0), moq: Math.max(1, parseInt(f.moq, 10) || 1),
      ...(product ? { id: product.id } : {}),
      categoryId: categories.find((c) => c.dept === f.dept && c.name === f.cat)?.id,
      suppliers: assigned.map((v) => ({
        vendorId: v.id, status: sup[v.id].status || 'active',
        cost: sup[v.id].cost === '' || sup[v.id].cost == null ? null : Math.round(Number(sup[v.id].cost) * 100) / 100,
        stock: Object.fromEntries(Object.entries(sup[v.id].stock || {}).filter(([, q]) => q !== '' && q != null).map(([w, q]) => [w, Math.max(0, parseInt(q, 10) || 0)])),
      })),
    });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    toast({ text: product ? `${f.name} updated` : `${f.name} added to the catalogue` });
    onClose();
  };

  return (
    <Drawer open={open} onClose={onClose} kicker={product ? product.sku : 'New product'} title={product ? 'Edit product' : 'Add product'} width="max-w-[620px]"
      footer={<>
        {product && <button className="dash-btn dash-btn-danger mr-auto" onClick={() => onDelete(product)}><Trash2 /> Delete</button>}
        <button className="dash-btn dash-btn-ghost" onClick={onClose}>Cancel</button>
        <button className="dash-btn dash-btn-navy" disabled={busy} onClick={submit}><Save /> {busy ? 'Saving…' : product ? 'Save changes' : 'Add product'}</button>
      </>}>
      <div className="space-y-6">
        <section className="flex gap-4">
          <img src={productImg(f)} alt="" className="w-28 h-28 rounded-2xl object-contain bg-ivory border border-navy/5 p-2 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="dash-label">Image</span>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {IMAGES.map((img) => (
                <button key={img} type="button" onClick={() => set({ img })} className={`shrink-0 w-12 h-12 rounded-lg bg-ivory p-0.5 border-2 ${f.img === img ? 'border-gold' : 'border-transparent'}`} title={img}>
                  <img src={productImg({ img })} alt="" className="w-full h-full object-contain" loading="lazy" />
                </button>
              ))}
            </div>
            <div className="mt-2">
              <ImageInput compact folder="products" value={f.img} onChange={(img) => set({ img })} placeholder="…or paste an image link" />
            </div>
          </div>
        </section>

        <section className="grid sm:grid-cols-2 gap-4">
          <Field label="Product name *" className="sm:col-span-2"><input className="dash-input" value={f.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field label="Department">
            <select className="dash-input" value={f.dept} onChange={(e) => { const dept = e.target.value; set({ dept, cat: categories.find((c) => c.dept === dept)?.name || '' }); }}>
              {depts.product.map((d) => <option key={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select className="dash-input" value={f.cat} onChange={(e) => set({ cat: e.target.value })}>
              {cats.map((c) => <option key={c.id} value={c.name}>{c.name}{c.status !== 'active' ? ` (${c.status.replace('_', ' ')})` : ''}</option>)}
            </select>
          </Field>
          <Field label="Brand" hint="optional"><input className="dash-input" value={f.brand || ''} onChange={(e) => set({ brand: e.target.value })} /></Field>
          <Field label="Size" hint="e.g. 500 g, 300MLx36"><input className="dash-input" value={f.size} onChange={(e) => set({ size: e.target.value })} /></Field>
          <Field label="Wholesale pack" hint="e.g. 48 Units"><input className="dash-input" value={f.pack} onChange={(e) => set({ pack: e.target.value })} /></Field>
        </section>

        <section>
          <span className="dash-label">Pricing</span>
          <div className="grid grid-cols-2 gap-2 p-1 bg-ivory rounded-full border border-navy/10">
            {[['fixed', 'Fixed price — add to cart'], ['request', 'Price on request — enquiry']].map(([v, l]) => (
              <button key={v} type="button" onClick={() => set({ priceMode: v })} className={`h-10 rounded-full text-[12.5px] font-bold transition ${f.priceMode === v ? 'bg-navy text-white' : 'text-navy/70'}`}>{l}</button>
            ))}
          </div>
          {f.priceMode === 'fixed' ? (
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <Field label="Price (USD) *"><input type="number" step="0.01" min="0" className="dash-input" value={f.price} onChange={(e) => set({ price: e.target.value })} /></Field>
              <Field label="Minimum order qty"><input type="number" min="1" className="dash-input" value={f.moq} onChange={(e) => set({ moq: e.target.value })} /></Field>
            </div>
          ) : <p className="mt-3 text-[12.5px] text-charcoal/60">Shoppers see “Price on request” and an Inquire button. Their inquiry lands in Inquiries, where you send a quote with final pricing.</p>}
        </section>

        <section>
          <div className="flex items-end justify-between gap-3">
            <span className="dash-label !mb-0">Suppliers</span>
            <span className="text-[12px] text-charcoal/55">{assigned.length} assigned · <b className="text-navy">{totalStock}</b> units in stock</span>
          </div>
          <p className="text-[12px] text-charcoal/55 mt-1 mb-3">Tick the suppliers that carry this product, then set their supply price and stock per warehouse. Orders are routed to these suppliers by location.</p>
          <ul className="space-y-2.5">
            {vendors.map((v) => {
              const row = sup[v.id];
              const on = !!row?.on;
              const wh = warehouses.filter((w) => w.vendorId === v.id);
              return (
                <li key={v.id} className={`rounded-2xl border transition ${on ? 'border-gold/70 bg-gold-pale/30' : 'border-navy/10'}`}>
                  <label className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-[#0B2347]" checked={on} onChange={(e) => toggleSup(v.id, e.target.checked)} />
                    <span className="flex-1 min-w-0">
                      <span className="block font-bold text-navy text-[13.5px] truncate">{v.isHouse ? 'JOLOF TRADING (own stock)' : v.company || v.name}</span>
                      <span className="block text-[11.5px] text-charcoal/55 truncate">{wh.length ? wh.map((w) => w.suburb || w.city).filter(Boolean).join(' · ') : 'No warehouse yet'}</span>
                    </span>
                    {v.status !== 'active' && <span className={`pill ${SUPPLIER_STATUS[v.status]?.cls || ''}`}>{SUPPLIER_STATUS[v.status]?.label || v.status}</span>}
                  </label>
                  {on && (
                    <div className="px-4 pb-4 pt-1 border-t border-navy/5 space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <Field label="Supply price (USD)" hint="What JOLOF pays this supplier — optional">
                          <input type="number" step="0.01" min="0" className="dash-input" value={row.cost ?? ''} onChange={(e) => setSupField(v.id, { cost: e.target.value })} />
                        </Field>
                        <Field label="Listing">
                          <select className="dash-input" value={row.status || 'active'} onChange={(e) => setSupField(v.id, { status: e.target.value })}>
                            <option value="active">Active — receives orders</option>
                            <option value="paused">Paused</option>
                          </select>
                        </Field>
                      </div>
                      {wh.length ? (
                        <div>
                          <span className="dash-label">Stock per warehouse</span>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {wh.map((w) => (
                              <label key={w.id} className="flex items-center gap-2 rounded-xl bg-white border border-navy/10 px-3 py-2">
                                <WarehouseIcon className="w-4 h-4 text-navy/40 shrink-0" />
                                <span className="flex-1 min-w-0 text-[12.5px] leading-tight"><b className="block text-navy truncate">{w.name}</b><span className="text-charcoal/55">{w.suburb}{w.active === false ? ' · inactive' : ''}</span></span>
                                <input type="number" min="0" className="dash-input !h-9 !w-24 text-right" value={row.stock?.[w.id] ?? ''} placeholder="0" onChange={(e) => setSupStock(v.id, w.id, e.target.value)} aria-label={`Stock at ${w.name}`} />
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : <p className="text-[12px] text-charcoal/55">This supplier has no warehouse yet, so they can't hold stock or receive orders until one is added.</p>}
                    </div>
                  )}
                  {!on && row?.had > 0 && <p className="px-4 pb-3 text-[12px] font-bold text-[#B4432F]">Saving will unassign this supplier and remove their {row.had} unit(s) of this product.</p>}
                </li>
              );
            })}
            {!vendors.length && <li className="text-[12.5px] text-charcoal/55">No suppliers yet — add them under Suppliers.</li>}
          </ul>
          {!assigned.length && <p className="mt-2 text-[12px] text-[#8a6417]">No supplier assigned — orders for this product will need a supplier picked by hand.</p>}
        </section>

        <section className="grid sm:grid-cols-2 gap-4">
          <Field label="Low-stock alert at"><input type="number" min="0" className="dash-input" value={f.lowStock} onChange={(e) => set({ lowStock: e.target.value })} /></Field>
          <Field label="Badge">
            <select className="dash-input" value={f.tag} onChange={(e) => set({ tag: e.target.value })}><option value="">None</option><option>New</option><option>Bulk</option></select>
          </Field>
        </section>

        <Field label="Description"><textarea rows={3} className="dash-input" value={f.desc} onChange={(e) => set({ desc: e.target.value })} /></Field>

        <section className="grid sm:grid-cols-2 gap-x-8">
          <div>
            <span className="dash-label">Visibility</span>
            <Toggle label="Visible in store" checked={f.status === 'active'} onChange={(v) => set({ status: v ? 'active' : 'hidden' })} />
          </div>
          <div>
            <span className="dash-label">Home page placement</span>
            <Toggle label="Featured (Handpicked)" checked={f.featured} onChange={(v) => set({ featured: v })} />
            <Toggle label="Popular picks" checked={f.bestSeller} onChange={(v) => set({ bestSeller: v })} />
            <Toggle label="Just landed" checked={f.newArrival} onChange={(v) => set({ newArrival: v })} />
            <Toggle label="Recommended" checked={f.recommended} onChange={(v) => set({ recommended: v })} />
          </div>
        </section>
        {err && <p className="text-[13px] font-bold text-[#B4432F]">{err}</p>}
      </div>
    </Drawer>
  );
}
