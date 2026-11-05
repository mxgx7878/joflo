'use client';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Store, Wheat, ArrowUp, ArrowDown, FolderPlus } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { CATEGORY_STATUS } from '@/lib/format';
import { PageHeader, Pill, Modal, Field } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { ImageInput } from '@/components/ImageInput';
import { Card, Skeleton, useConfirm } from '@/components/admin/common';

const KIND = {
  products: { label: 'Products', icon: Store, hint: 'Shop products — priced (cart) or price on request (inquiry).' },
  trading: { label: 'Trading', icon: Wheat, hint: 'Commodities quoted on request. Its categories group commodities (Admin → Trading).' },
};
const blankDept = { name: '', kind: 'products', tagline: '', description: '', image: '', status: 'active' };

export default function DepartmentsPage() {
  const ready = useStoreReady();
  const departments = useStore((s) => s.departments);
  const categories = useStore((s) => s.categories);
  const products = useStore((s) => s.products);
  const commodities = useStore((s) => s.commodities);
  const { saveDepartment, deleteDepartment, sortDepartments, saveCategory, deleteCategory } = useStore.getState();
  const toast = useToast();
  const [ask, dialog] = useConfirm();
  const [dept, setDept] = useState(null); // department form
  const [cat, setCat] = useState(null); // category form
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (!ready) return <Skeleton />;

  const kindOf = (name) => departments.find((d) => d.name === name)?.kind;
  const count = (c) => (kindOf(c.dept) === 'trading' ? commodities.filter((x) => x.group === c.name).length : products.filter((p) => p.categoryId === c.id).length);
  const unitWord = (d, n) => (d.kind === 'trading' ? (n === 1 ? 'commodity' : 'commodities') : (n === 1 ? 'product' : 'products'));

  const run = async (fn, ok) => {
    setBusy(true); setErr('');
    const r = await fn();
    setBusy(false);
    if (!r.ok) { setErr(r.error || 'Could not save.'); return false; }
    toast({ text: ok });
    return true;
  };
  const submitDept = async () => {
    if (dept.name.trim().length < 2) return setErr('Department name is required.');
    if (await run(() => saveDepartment(dept), dept.id ? `${dept.name} updated` : `${dept.name} department added`)) setDept(null);
  };
  const submitCat = async () => {
    if (!cat.name.trim()) return setErr('Category name is required.');
    const d = departments.find((x) => x.id === cat.departmentId);
    if (await run(() => saveCategory({ ...cat, name: cat.name.trim() }), cat.id ? 'Category updated' : `${cat.name.trim()} added to ${d?.name}`)) setCat(null);
  };
  const removeDept = (d) => {
    const n = categories.filter((c) => c.departmentId === d.id).length;
    if (n) { toast({ text: `Move or delete the ${n} categor${n === 1 ? 'y' : 'ies'} in ${d.name} first.` }); return; }
    ask({ title: `Delete ${d.name}?`, body: 'This department is empty and will be removed from the store menus.', confirm: 'Delete', danger: true }, async () => { const r = await deleteDepartment(d.id); if (r.ok) toast({ text: `${d.name} deleted` }); });
  };
  const removeCat = (c, d) => {
    const n = count(c);
    if (n) { toast({ text: `Move or delete the ${n} ${unitWord(d, n)} in “${c.name}” first.` }); return; }
    ask({ title: `Delete ${c.name}?`, body: 'This category is empty and will be removed from the store menus.', confirm: 'Delete', danger: true }, async () => { const r = await deleteCategory(c.id); if (r.ok) toast({ text: 'Category deleted' }); });
  };
  const move = (i, dir) => {
    const ids = departments.map((d) => d.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    sortDepartments(ids);
  };

  return (
    <>
      {dialog}
      <PageHeader kicker="Catalogue" title="Departments & categories"
        sub="Departments are the top level of the store (menu, home page cards). Each category belongs to one department. Set either to “Coming soon” to show it without items, or hide it."
        actions={<>
          <button className="dash-btn dash-btn-ghost" onClick={() => { setErr(''); setCat({ departmentId: departments[0]?.id || '', name: '', status: 'active' }); }} disabled={!departments.length}><FolderPlus /> Add category</button>
          <button className="dash-btn dash-btn-navy" onClick={() => { setErr(''); setDept({ ...blankDept }); }}><Plus /> Add department</button>
        </>} />

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-5">
        {departments.map((d, i) => {
          const cats = categories.filter((c) => c.departmentId === d.id);
          const total = cats.reduce((s, c) => s + count(c), 0);
          const Icon = KIND[d.kind]?.icon || Store;
          return (
            <Card key={d.id} pad={false}>
              <div className="p-5 flex items-start gap-4 border-b border-navy/5">
                {d.image ? <img src={d.image} alt="" className="w-14 h-14 rounded-2xl object-cover shrink-0" /> : <span className="w-14 h-14 rounded-2xl bg-navy text-gold-soft grid place-items-center shrink-0"><Icon className="w-5 h-5" /></span>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-xl text-navy">{d.name}</h2>
                    <span className="pill bg-ivory text-navy border border-navy/10"><Icon className="w-3 h-3" />{KIND[d.kind]?.label}</span>
                    {d.status !== 'active' && <Pill meta={CATEGORY_STATUS[d.status]} />}
                  </div>
                  {d.tagline && <p className="text-[12.5px] text-charcoal/55 mt-0.5 line-clamp-2">{d.tagline}</p>}
                  <p className="text-[11.5px] font-extrabold tracking-[.12em] uppercase text-gold mt-2">{cats.length} categor{cats.length === 1 ? 'y' : 'ies'} · {total} {unitWord(d, total)}</p>
                </div>
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <button className="w-7 h-7 grid place-items-center rounded-full text-navy/40 hover:text-navy hover:bg-ivory disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${d.name} up`}><ArrowUp className="w-4 h-4" /></button>
                  <button className="w-7 h-7 grid place-items-center rounded-full text-navy/40 hover:text-navy hover:bg-ivory disabled:opacity-30" disabled={i === departments.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${d.name} down`}><ArrowDown className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="px-5 py-2.5 flex items-center gap-2 border-b border-navy/5 bg-ivory/40">
                <button className="dash-btn dash-btn-ghost !h-8 !px-3" onClick={() => { setErr(''); setDept({ ...blankDept, ...d }); }}><Pencil /> Edit</button>
                <button className="dash-btn dash-btn-ghost !h-8 !px-3" onClick={() => { setErr(''); setCat({ departmentId: d.id, name: '', status: 'active' }); }}><Plus /> Category</button>
                <button className="ml-auto w-8 h-8 grid place-items-center rounded-full text-navy/40 hover:text-[#B4432F] hover:bg-[#F8E7E3]" onClick={() => removeDept(d)} aria-label={`Delete ${d.name}`}><Trash2 className="w-4 h-4" /></button>
              </div>
              <ul className="divide-y divide-navy/5">
                {cats.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-navy text-[14px] truncate">{c.name}</p>
                      <p className="text-[12px] text-charcoal/50">{count(c)} {unitWord(d, count(c))}</p>
                    </div>
                    <select value={c.status} onChange={async (e) => { const v = e.target.value; const r = await saveCategory({ ...c, status: v }); toast({ text: r.ok ? `${c.name}: ${CATEGORY_STATUS[v].label}` : r.error }); }}
                      className={`pill !py-1.5 !pr-6 border-0 cursor-pointer focus:outline-none ${CATEGORY_STATUS[c.status].cls}`} aria-label={`Status of ${c.name}`}>
                      {Object.entries(CATEGORY_STATUS).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                    </select>
                    <button className="w-8 h-8 grid place-items-center rounded-full text-navy/40 hover:text-navy hover:bg-ivory" onClick={() => { setErr(''); setCat({ ...c }); }} aria-label={`Edit ${c.name}`}><Pencil className="w-4 h-4" /></button>
                    <button className="w-8 h-8 grid place-items-center rounded-full text-navy/40 hover:text-[#B4432F] hover:bg-[#F8E7E3]" onClick={() => removeCat(c, d)} aria-label={`Delete ${c.name}`}><Trash2 className="w-4 h-4" /></button>
                  </li>
                ))}
                {!cats.length && <li className="px-5 py-6 text-center text-[13px] text-charcoal/50">No categories yet.</li>}
              </ul>
            </Card>
          );
        })}
      </div>

      <Modal open={!!dept} onClose={() => setDept(null)} kicker="Department" title={dept?.id ? `Edit ${dept.name}` : 'New department'} size="max-w-xl"
        footer={<><button className="dash-btn dash-btn-ghost" onClick={() => setDept(null)}>Cancel</button><button className="dash-btn dash-btn-navy" disabled={busy} onClick={submitDept}>{dept?.id ? 'Save' : 'Add department'}</button></>}>
        {dept && (
          <div className="space-y-4">
            <Field label="Name *"><input autoFocus className="dash-input" value={dept.name} onChange={(e) => setDept({ ...dept, name: e.target.value })} placeholder="e.g. Household" /></Field>
            <Field label="Type" hint={KIND[dept.kind].hint}>
              <div className="grid grid-cols-2 gap-2 p-1 bg-ivory rounded-full border border-navy/10">
                {Object.entries(KIND).map(([v, k]) => (
                  <button key={v} type="button" onClick={() => setDept({ ...dept, kind: v })} className={`h-10 rounded-full text-[12.5px] font-bold transition ${dept.kind === v ? 'bg-navy text-white' : 'text-navy/70'}`}>{k.label}</button>
                ))}
              </div>
            </Field>
            <Field label="Tagline" hint="One line shown on the home page card and menus."><input className="dash-input" value={dept.tagline} onChange={(e) => setDept({ ...dept, tagline: e.target.value })} /></Field>
            <Field label="Card image" hint="Shown on the home page “Shop by Department” card."><ImageInput folder="departments" value={dept.image} onChange={(image) => setDept((x) => ({ ...x, image }))} /></Field>
            <Field label="Status">
              <select className="dash-input" value={dept.status} onChange={(e) => setDept({ ...dept, status: e.target.value })}>
                {Object.entries(CATEGORY_STATUS).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
              </select>
            </Field>
            {err && <p className="text-[13px] font-bold text-[#B4432F]">{err}</p>}
          </div>
        )}
      </Modal>

      <Modal open={!!cat} onClose={() => setCat(null)} kicker="Category" title={cat?.id ? 'Edit category' : 'New category'} size="max-w-md"
        footer={<><button className="dash-btn dash-btn-ghost" onClick={() => setCat(null)}>Cancel</button><button className="dash-btn dash-btn-navy" disabled={busy} onClick={submitCat}>{cat?.id ? 'Save' : 'Add category'}</button></>}>
        {cat && (
          <div className="space-y-4">
            <Field label="Department" hint={cat.id ? 'Moving a category moves all its products with it.' : ''}>
              <select className="dash-input" value={cat.departmentId} onChange={(e) => setCat({ ...cat, departmentId: e.target.value })}>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name} · {KIND[d.kind]?.label}</option>)}
              </select>
            </Field>
            <Field label="Category name" hint={cat.id ? 'Renaming keeps all items in this category.' : ''}><input autoFocus className="dash-input" value={cat.name} onChange={(e) => setCat({ ...cat, name: e.target.value })} /></Field>
            <Field label="Status">
              <select className="dash-input" value={cat.status} onChange={(e) => setCat({ ...cat, status: e.target.value })}>
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
