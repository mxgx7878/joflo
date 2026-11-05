'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Save, Trash2, Wheat, ArrowRight } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { useDepartments } from '@/lib/departments';
import { money, timeAgo, INQUIRY_STATUS, qtyUnit } from '@/lib/format';
import { PageHeader, Pill, Drawer, Field, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { ImageInput } from '@/components/ImageInput';
import { Card, TableWrap, Skeleton, useConfirm, Toggle } from '@/components/admin/common';

const blank = { name: '', line: '', group: 'Grains & Cereals', origin: '', unit: 'MT', minQty: 10, indicative: '', img: '', alt: '', status: 'active' };

export default function TradingPage() {
  const depts = useDepartments();
  const ready = useStoreReady();
  const commodities = useStore((s) => s.commodities);
  const categories = useStore((s) => s.categories);
  const inquiries = useStore((s) => s.inquiries);
  const saveCommodity = useStore((s) => s.saveCommodity);
  const deleteCommodity = useStore((s) => s.deleteCommodity);
  const toast = useToast();
  const [ask, dialog] = useConfirm();
  const [f, setF] = useState(null);
  const [err, setErr] = useState('');

  const requests = useMemo(() => inquiries.filter((i) => i.type === 'commodity'), [inquiries]);
  const groups = categories.filter((c) => depts.isTrading(c.dept)).map((c) => c.name);

  if (!ready) return <Skeleton />;

  const submit = () => {
    if (!f.name.trim()) return setErr('Name is required.');
    saveCommodity({ ...f, name: f.name.trim(), minQty: Number(f.minQty) || 0, indicative: f.indicative === '' ? null : Number(f.indicative) });
    toast({ text: f.id ? `${f.name} updated` : `${f.name} added` });
    setF(null);
  };

  return (
    <>
      {dialog}
      <PageHeader kicker="Trading" title="Commodity trading" sub="Agricultural commodities shown on the storefront. Buyers request quotes per metric tonne — requests arrive below and in Inquiries."
        actions={<button className="dash-btn dash-btn-navy" onClick={() => { setErr(''); setF({ ...blank, group: groups[0] || blank.group }); }}><Plus /> Add commodity</button>} />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5">
        <Card pad={false}>
          <TableWrap>
            <table className="dash-table">
              <thead><tr><th>Commodity</th><th>Group</th><th>Origin</th><th className="text-right">Min. qty</th><th className="text-right">Indicative</th><th>Status</th></tr></thead>
              <tbody>
                {commodities.map((c) => (
                  <tr key={c.id} className="cursor-pointer" onClick={() => { setErr(''); setF({ ...blank, ...c, indicative: c.indicative ?? '' }); }}>
                    <td className="min-w-[240px]">
                      <div className="flex items-center gap-3">
                        {c.img ? <img src={c.img} alt="" className="w-12 h-10 rounded-lg object-cover shrink-0" loading="lazy" /> : <span className="w-12 h-10 rounded-lg bg-ivory grid place-items-center text-navy/40"><Wheat className="w-4 h-4" /></span>}
                        <div className="min-w-0"><p className="font-bold text-navy truncate">{c.name}</p><p className="text-[11.5px] text-charcoal/50 truncate max-w-[260px]">{c.line}</p></div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-charcoal/70">{c.group}</td>
                    <td className="whitespace-nowrap text-charcoal/70">{c.origin || '—'}</td>
                    <td className="text-right whitespace-nowrap font-semibold text-navy">{c.minQty} {c.unit}</td>
                    <td className="text-right whitespace-nowrap font-bold text-navy">{c.indicative ? `${money(c.indicative)}/${c.unit}` : 'On request'}</td>
                    <td>{c.status === 'active' ? <span className="pill bg-[#E3F2EA] text-emerald">Listed</span> : <span className="pill bg-sand text-charcoal/60">Hidden</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>

        <Card title="Quote requests" action={<Link href="/admin/inquiries?type=commodity" className="text-[12.5px] font-bold text-emerald hover:text-navy">All →</Link>}>
          {requests.length === 0 ? <EmptyState icon={Wheat} title="No requests yet" body="Commodity quote requests from the storefront appear here." /> : (
            <ul className="-mx-2">
              {requests.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/inquiries/${r.id}`} className="block px-2 py-3 rounded-xl hover:bg-ivory transition">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-navy text-[13.5px] truncate">{r.company || r.name}</p>
                      <Pill meta={INQUIRY_STATUS[r.status]} />
                    </div>
                    <p className="text-[12.5px] text-charcoal/65 mt-1">{r.items.map((i) => `${qtyUnit(i.qty, i.unit)} ${i.name}`).join(', ') || r.message.slice(0, 60)}</p>
                    <p className="text-[11.5px] text-charcoal/45 mt-0.5 flex items-center gap-1">{r.trade?.incoterm && `${r.trade.incoterm} ${r.trade.port} · `}{timeAgo(r.createdAt)} <ArrowRight className="w-3 h-3 ml-auto" /></p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Drawer open={!!f} onClose={() => setF(null)} kicker="Commodity" title={f?.id ? 'Edit commodity' : 'Add commodity'}
        footer={<>
          {f?.id && <button className="dash-btn dash-btn-danger mr-auto" onClick={() => ask({ title: `Delete ${f.name}?`, body: 'It will be removed from the Trading section of the store.', confirm: 'Delete', danger: true }, () => { deleteCommodity(f.id); setF(null); toast({ text: 'Commodity deleted' }); })}><Trash2 /> Delete</button>}
          <button className="dash-btn dash-btn-ghost" onClick={() => setF(null)}>Cancel</button>
          <button className="dash-btn dash-btn-navy" onClick={submit}><Save /> Save</button>
        </>}>
        {f && (
          <div className="space-y-4">
            {f.img && <img src={f.img} alt="" className="w-full h-44 rounded-2xl object-cover" />}
            <Field label="Name *"><input className="dash-input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Short description"><input className="dash-input" value={f.line} onChange={(e) => setF({ ...f, line: e.target.value })} /></Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Group"><select className="dash-input" value={f.group} onChange={(e) => setF({ ...f, group: e.target.value })}>{groups.map((g) => <option key={g}>{g}</option>)}</select></Field>
              <Field label="Origin"><input className="dash-input" value={f.origin} onChange={(e) => setF({ ...f, origin: e.target.value })} placeholder="e.g. Senegal" /></Field>
              <Field label="Minimum quantity"><input type="number" min="0" className="dash-input" value={f.minQty} onChange={(e) => setF({ ...f, minQty: e.target.value })} /></Field>
              <Field label="Unit"><input className="dash-input" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></Field>
              <Field label="Indicative price (USD per unit)" hint="Internal guide — prefilled when you quote" className="sm:col-span-2"><input type="number" min="0" className="dash-input" value={f.indicative} onChange={(e) => setF({ ...f, indicative: e.target.value })} /></Field>
            </div>
            <Field label="Image" className="sm:col-span-2"><ImageInput compact folder="commodities" value={f.img} onChange={(img) => setF((x) => ({ ...x, img }))} /></Field>
            <Toggle label="Listed on storefront" checked={f.status === 'active'} onChange={(v) => setF({ ...f, status: v ? 'active' : 'hidden' })} />
            {err && <p className="text-[13px] font-bold text-[#B4432F]">{err}</p>}
          </div>
        )}
      </Drawer>
    </>
  );
}
