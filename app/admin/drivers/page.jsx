'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Truck, Plus, Pencil, Trash2, Phone, Save, PackageCheck } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { DRIVER_STATUS, ORDER_STATUS } from '@/lib/format';
import { LOCATIONS, getLocation } from '@/lib/locations';
import { PageHeader, StatCard, Pill, Drawer, Field, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Card, TableWrap, SearchBox, Initials, Skeleton, useConfirm } from '@/components/admin/common';

const blank = { name: '', phone: '', email: '', vehicle: '', plate: '', homeBase: 'newark', status: 'active', notes: '' };
const OPEN = ['confirmed', 'packed', 'shipped'];

function DriverEditor({ open, driver, onClose }) {
  const saveDriver = useStore((s) => s.saveDriver);
  const toast = useToast();
  const [f, setF] = useState(blank);
  const [err, setErr] = useState('');
  const [key, setKey] = useState(null);
  if (open && key !== (driver?.id || 'new')) { setKey(driver?.id || 'new'); setF(driver ? { ...blank, ...driver, homeBase: driver.homeBase || '' } : blank); setErr(''); }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    const r = await saveDriver(f);
    if (!r.ok) { setErr(r.error); return; }
    toast({ text: `${f.name} ${driver ? 'updated' : 'added'}` });
    setKey(null); onClose();
  };
  return (
    <Drawer open={open} onClose={() => { setKey(null); onClose(); }} kicker="Delivery team" title={driver ? 'Edit driver' : 'Add driver'}
      footer={<><button className="dash-btn dash-btn-ghost" onClick={() => { setKey(null); onClose(); }}>Cancel</button><button className="dash-btn dash-btn-navy" onClick={save}><Save /> Save driver</button></>}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full name *" className="sm:col-span-2"><input className="dash-input" value={f.name} onChange={set('name')} /></Field>
        <Field label="Phone"><input className="dash-input" value={f.phone} onChange={set('phone')} placeholder="+1 (973) 555-0100" /></Field>
        <Field label="Email"><input className="dash-input" value={f.email} onChange={set('email')} /></Field>
        <Field label="Vehicle"><input className="dash-input" value={f.vehicle} onChange={set('vehicle')} placeholder="e.g. Ford Transit 350" /></Field>
        <Field label="Plate"><input className="dash-input" value={f.plate} onChange={set('plate')} /></Field>
        <Field label="Home base" hint="Used to suggest drivers near each delivery.">
          <select className="dash-input" value={f.homeBase || ''} onChange={set('homeBase')}>
            <option value="">—</option>{LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.city}, {l.state}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className="dash-input" value={f.status} onChange={set('status')}>{Object.entries(DRIVER_STATUS).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}</select>
        </Field>
        <Field label="Notes" className="sm:col-span-2"><textarea rows={3} className="dash-input" value={f.notes} onChange={set('notes')} /></Field>
      </div>
      {err && <p className="mt-4 text-[13px] font-bold text-[#B4432F]">{err}</p>}
    </Drawer>
  );
}

export default function DriversPage() {
  const ready = useStoreReady();
  const drivers = useStore((s) => s.drivers);
  const orders = useStore((s) => s.orders);
  const deleteDriver = useStore((s) => s.deleteDriver);
  const toast = useToast();
  const [ask, dialog] = useConfirm();
  const [edit, setEdit] = useState(null); // driver | 'new' | null
  const [q, setQ] = useState('');

  const jobs = useMemo(() => {
    const m = {};
    orders.forEach((o) => { if (o.driverId) (m[o.driverId] = m[o.driverId] || []).push(o); });
    return m;
  }, [orders]);
  const unassigned = orders.filter((o) => ['confirmed', 'packed'].includes(o.status) && !o.driverId);
  const list = drivers.filter((d) => !q.trim() || `${d.name} ${d.phone} ${d.vehicle} ${d.plate} ${getLocation(d.homeBase)?.city || ''}`.toLowerCase().includes(q.trim().toLowerCase()));

  if (!ready) return <Skeleton />;

  return (
    <>
      {dialog}
      <PageHeader kicker="Delivery" title="Drivers" sub="JOLOF's delivery team. Assign a driver on each order — customers see their driver once the order is out for delivery."
        actions={<button className="dash-btn dash-btn-navy" onClick={() => setEdit('new')}><Plus /> Add driver</button>} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Truck} label="Active drivers" value={drivers.filter((d) => d.status === 'active').length} hint={`${drivers.length} in total`} />
        <StatCard icon={PackageCheck} label="Open deliveries" value={orders.filter((o) => o.driverId && OPEN.includes(o.status)).length} tone="emerald" />
        <StatCard icon={Truck} label="Need a driver" value={unassigned.length} tone="gold" />
        <StatCard icon={Truck} label="Delivered (all time)" value={orders.filter((o) => o.driverId && o.status === 'delivered').length} tone="ivory" />
      </div>

      {unassigned.length > 0 && (
        <Card title="Confirmed orders without a driver" className="mt-5">
          <div className="flex flex-wrap gap-2">
            {unassigned.map((o) => <Link key={o.id} href={`/admin/orders/${o.id}`} className="pill bg-gold-pale text-[#8a6417] hover:bg-gold-soft">{o.id} · {o.location?.city || '—'} · <span className="opacity-70">{ORDER_STATUS[o.status].label}</span></Link>)}
          </div>
        </Card>
      )}

      <Card pad={false} className="mt-5">
        <div className="p-4 sm:p-5 flex justify-end border-b border-navy/5"><SearchBox value={q} onChange={setQ} placeholder="Name, phone, vehicle or city" className="lg:w-[300px]" /></div>
        {list.length === 0 ? <EmptyState icon={Truck} title="No drivers yet" body="Add your delivery team to assign them to orders." action={<button className="dash-btn dash-btn-navy" onClick={() => setEdit('new')}><Plus /> Add driver</button>} /> : (
          <TableWrap>
            <table className="dash-table">
              <thead><tr><th>Driver</th><th>Contact</th><th>Vehicle</th><th>Home base</th><th className="text-center">Open</th><th className="text-center">Delivered</th><th>Status</th><th /></tr></thead>
              <tbody>
                {list.map((d) => {
                  const mine = jobs[d.id] || [];
                  const open = mine.filter((o) => OPEN.includes(o.status));
                  return (
                    <tr key={d.id}>
                      <td className="min-w-[200px]"><div className="flex items-center gap-3"><Initials name={d.name} /><span className="font-bold text-navy">{d.name}</span></div></td>
                      <td className="whitespace-nowrap text-[13px]">{d.phone ? <a href={`tel:${d.phone}`} className="text-navy font-semibold inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-navy/40" />{d.phone}</a> : '—'}<span className="block text-[11.5px] text-charcoal/50">{d.email}</span></td>
                      <td className="text-[13px] text-charcoal/75">{d.vehicle || '—'}<span className="block text-[11.5px] text-charcoal/50">{d.plate}</span></td>
                      <td className="whitespace-nowrap text-charcoal/70">{getLocation(d.homeBase) ? `${getLocation(d.homeBase).city}, ${getLocation(d.homeBase).state}` : '—'}</td>
                      <td className="text-center">{open.length ? <span className="font-bold text-navy" title={open.map((o) => o.id).join(', ')}>{open.length}</span> : <span className="text-charcoal/40">0</span>}</td>
                      <td className="text-center text-charcoal/70">{mine.filter((o) => o.status === 'delivered').length}</td>
                      <td><Pill meta={DRIVER_STATUS[d.status]} /></td>
                      <td className="text-right whitespace-nowrap">
                        <button className="dash-btn dash-btn-ghost !h-8 !px-3" onClick={() => setEdit(d)}><Pencil /> Edit</button>
                        <button className="icon-btn !w-8 !h-8 ml-1 text-[#B4432F]" aria-label={`Remove ${d.name}`} onClick={() => ask({ title: `Remove ${d.name}?`, body: 'Past deliveries keep their history. Drivers with open deliveries can’t be removed — mark them inactive instead.', confirm: 'Remove', danger: true }, async () => { const r = await deleteDriver(d.id); if (r.ok) toast({ text: `${d.name} removed` }); })}><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
      <DriverEditor open={!!edit} driver={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />
    </>
  );
}
