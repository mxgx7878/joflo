'use client';
import { useEffect, useMemo, useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { SEED_PRODUCTS, productImg } from '@/lib/catalogue';
import { Drawer, Field } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Toggle } from '@/components/admin/common';

const IMAGES = [...new Set(SEED_PRODUCTS.map((p) => p.img))];
const blank = { name: '', dept: 'Food', cat: 'Spices & Seasonings', size: '', pack: '', price: '', priceMode: 'fixed', tag: '', desc: '', img: IMAGES[0], stock: 0, lowStock: 10, moq: 1, status: 'active', featured: false, bestSeller: false, newArrival: true, recommended: false };

export default function ProductEditor({ product, open, onClose, onDelete }) {
  const categories = useStore((s) => s.categories);
  const saveProduct = useStore((s) => s.saveProduct);
  const toast = useToast();
  const [f, setF] = useState(blank);
  const [err, setErr] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!open) return;
    setErr(''); setUrl('');
    setF(product ? { ...blank, ...product, pack: product.pack || '', size: product.size || '', tag: product.tag || '', desc: product.desc || '', priceMode: typeof product.price === 'number' ? 'fixed' : 'request', price: typeof product.price === 'number' ? product.price : '' } : blank);
  }, [open, product]);

  const cats = useMemo(() => categories.filter((c) => c.dept === f.dept), [categories, f.dept]);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));

  const submit = () => {
    if (!f.name.trim()) return setErr('Product name is required.');
    if (f.priceMode === 'fixed' && !(Number(f.price) > 0)) return setErr('Enter a price, or switch to “Price on request”.');
    const { priceMode, ...rest } = f;
    saveProduct({
      ...rest, name: f.name.trim(), size: f.size.trim() || null, pack: f.pack.trim() || null, tag: f.tag || undefined, desc: f.desc.trim(),
      price: priceMode === 'fixed' ? Math.round(Number(f.price) * 100) / 100 : null,
      stock: Math.max(0, parseInt(f.stock, 10) || 0), lowStock: Math.max(0, parseInt(f.lowStock, 10) || 0), moq: Math.max(1, parseInt(f.moq, 10) || 1),
      ...(product ? { id: product.id } : {}),
    });
    toast({ text: product ? `${f.name} updated` : `${f.name} added to the catalogue` });
    onClose();
  };

  return (
    <Drawer open={open} onClose={onClose} kicker={product ? product.sku : 'New product'} title={product ? 'Edit product' : 'Add product'} width="max-w-[620px]"
      footer={<>
        {product && <button className="dash-btn dash-btn-danger mr-auto" onClick={() => onDelete(product)}><Trash2 /> Delete</button>}
        <button className="dash-btn dash-btn-ghost" onClick={onClose}>Cancel</button>
        <button className="dash-btn dash-btn-navy" onClick={submit}><Save /> {product ? 'Save changes' : 'Add product'}</button>
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
            <div className="flex gap-2 mt-2">
              <input className="dash-input !py-1.5 !text-[13px]" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="…or paste an image URL" />
              <button type="button" className="dash-btn dash-btn-ghost !h-9 shrink-0" onClick={() => url.trim() && set({ img: url.trim() })}>Use</button>
            </div>
          </div>
        </section>

        <section className="grid sm:grid-cols-2 gap-4">
          <Field label="Product name *" className="sm:col-span-2"><input className="dash-input" value={f.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field label="Department">
            <select className="dash-input" value={f.dept} onChange={(e) => { const dept = e.target.value; set({ dept, cat: categories.find((c) => c.dept === dept)?.name || '' }); }}>
              <option>Food</option><option>Cosmetics</option>
            </select>
          </Field>
          <Field label="Category">
            <select className="dash-input" value={f.cat} onChange={(e) => set({ cat: e.target.value })}>
              {cats.map((c) => <option key={c.id} value={c.name}>{c.name}{c.status !== 'active' ? ` (${c.status.replace('_', ' ')})` : ''}</option>)}
            </select>
          </Field>
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
          ) : <p className="mt-3 text-[12.5px] text-charcoal/60">Shoppers see “Price on request” and an Enquire button. Their enquiry lands in Inquiries, where you send a quote.</p>}
        </section>

        <section className="grid sm:grid-cols-3 gap-4">
          {f.id
            ? <Field label="Stock on hand" hint="Held by suppliers — change it in Inventory."><input className="dash-input" value={f.stock} disabled /></Field>
            : <Field label="Opening stock" hint="Added to JOLOF's own warehouse."><input type="number" min="0" className="dash-input" value={f.stock} onChange={(e) => set({ stock: e.target.value })} /></Field>}
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
