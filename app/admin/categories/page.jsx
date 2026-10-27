'use client';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Utensils, Sparkles, Wheat } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { CATEGORY_STATUS } from '@/lib/format';
import { PageHeader, Pill, Modal, Field } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Card, Skeleton, useConfirm } from '@/components/admin/common';

const DEPTS = [
  { name: 'Food', icon: Utensils, blurb: 'Spices, grains, drinks and pantry staples' },
  { name: 'Cosmetics', icon: Sparkles, blurb: 'Skin care, hair care, soaps and personal care' },
  { name: 'Trading', icon: Wheat, blurb: 'Agricultural commodities quoted per metric tonne' },
];

export default function CategoriesPage() {
  const ready = useStoreReady();
  const categories = useStore((s) => s.categories);
  const products = useStore((s) => s.products);
  const commodities = useStore((s) => s.commodities);
  const saveCategory = useStore((s) => s.saveCategory);
  const deleteCategory = useStore((s) => s.deleteCategory);
  const toast = useToast();
  const [ask, dialog] = useConfirm();
  const [form, setForm] = useState(null);
  const [err, setErr] = useState('');

  if (!ready) return <Skeleton />;

  const count = (c) => (c.dept === 'Trading' ? commodities.filter((x) => x.group === c.name).length : products.filter((p) => p.dept === c.dept && p.cat === c.name).length);
  const unit = (c) => (c.dept === 'Trading' ? 'commodit' : 'product');

  const submit = () => {
    const name = form.name.trim();
    if (!name) return setErr('Name is required.');
    if (categories.some((c) => c.dept === form.dept && c.name.toLowerCase() === name.toLowerCase() && c.id !== form.id)) return setErr('This department already has a category with that name.');
    saveCategory({ ...form, name });
    toast({ text: form.id ? 'Category updated' : `${name} added to ${form.dept}` });
    setForm(null);
  };
  const remove = (c) => {
    const n = count(c);
    if (n > 0) { toast({ text: `Move or delete the ${n} ${unit(c)}${n === 1 ? (c.dept === 'Trading' ? 'y' : '') : (c.dept === 'Trading' ? 'ies' : 's')} in “${c.name}” first.` }); return; }
    ask({ title: `Delete ${c.name}?`, body: 'This category is empty and will be removed from the store menus.', confirm: 'Delete', danger: true }, () => { deleteCategory(c.id); toast({ text: 'Category deleted' }); });
  };

  return (
    <>
      {dialog}
      <PageHeader kicker="Catalogue" title="Categories" sub="Departments and categories shown in the storefront menu. Set a category to “Coming soon” to show it without products, or hide it completely."
        actions={<button className="dash-btn dash-btn-navy" onClick={() => { setErr(''); setForm({ dept: 'Food', name: '', status: 'active' }); }}><Plus /> Add category</button>} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {DEPTS.map((d) => {
          const cats = categories.filter((c) => c.dept === d.name);
          const total = cats.reduce((s, c) => s + count(c), 0);
          return (
            <Card key={d.name} pad={false}>
              <div className="p-5 flex items-start gap-4 border-b border-navy/5">
                <span className="w-12 h-12 rounded-2xl bg-navy text-gold-soft grid place-items-center shrink-0"><d.icon className="w-5 h-5" /></span>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-xl text-navy">{d.name}</h2>
                  <p className="text-[12.5px] text-charcoal/55">{d.blurb}</p>
                  <p className="text-[11.5px] font-extrabold tracking-[.12em] uppercase text-gold mt-2">{cats.length} categories · {total} {d.name === 'Trading' ? 'commodities' : 'products'}</p>
                </div>
              </div>
              <ul className="divide-y divide-navy/5">
                {cats.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-5 py-3 group">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-navy text-[14px] truncate">{c.name}</p>
                      <p className="text-[12px] text-charcoal/50">{count(c)} {d.name === 'Trading' ? 'commodities' : 'products'}</p>
                    </div>
                    <select value={c.status} onChange={(e) => { saveCategory({ ...c, status: e.target.value }); toast({ text: `${c.name}: ${CATEGORY_STATUS[e.target.value].label}` }); }}
                      className={`pill !py-1.5 !pr-6 border-0 cursor-pointer focus:outline-none ${CATEGORY_STATUS[c.status].cls}`} aria-label={`Status of ${c.name}`}>
                      {Object.entries(CATEGORY_STATUS).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                    </select>
                    <button className="w-8 h-8 grid place-items-center rounded-full text-navy/40 hover:text-navy hover:bg-ivory" onClick={() => { setErr(''); setForm({ ...c }); }} aria-label={`Rename ${c.name}`}><Pencil className="w-4 h-4" /></button>
                    <button className="w-8 h-8 grid place-items-center rounded-full text-navy/40 hover:text-[#B4432F] hover:bg-[#F8E7E3]" onClick={() => remove(c)} aria-label={`Delete ${c.name}`}><Trash2 className="w-4 h-4" /></button>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} kicker="Category" title={form?.id ? 'Edit category' : 'New category'} size="max-w-md"
        footer={<><button className="dash-btn dash-btn-ghost" onClick={() => setForm(null)}>Cancel</button><button className="dash-btn dash-btn-navy" onClick={submit}>{form?.id ? 'Save' : 'Add category'}</button></>}>
        {form && (
          <div className="space-y-4">
            <Field label="Department">
              <select className="dash-input" value={form.dept} disabled={!!form.id} onChange={(e) => setForm({ ...form, dept: e.target.value })}>
                {DEPTS.map((d) => <option key={d.name}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Category name" hint={form.id ? 'Renaming keeps all products in this category.' : ''}><input autoFocus className="dash-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Status">
              <select className="dash-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(CATEGORY_STATUS).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
              </select>
            </Field>
            {err && <p className="text-[13px] font-bold text-[#B4432F]">{err}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
