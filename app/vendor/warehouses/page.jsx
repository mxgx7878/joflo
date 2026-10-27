'use client';
import { useState } from 'react';
import { Warehouse, Plus, Pencil, MapPin, Power } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { getLocation, locationLabel } from '@/lib/locations';
import { PageHeader, Modal, EmptyState, Pill } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Skeleton } from '@/components/admin/common';
import { useVendor, OPEN_JOB } from '@/components/vendor/hooks';
import WarehouseForm from '@/components/vendor/WarehouseForm';

export default function VendorWarehouses() {
  const ready = useStoreReady();
  const { me, warehouses, offers, jobs } = useVendor();
  const saveWarehouse = useStore((s) => s.saveWarehouse);
  const toast = useToast();
  const [edit, setEdit] = useState(null);

  if (!ready || !me) return <Skeleton />;

  const save = (w) => { saveWarehouse({ ...w, vendorId: me.id }); toast({ text: `${w.name} saved` }); setEdit(null); };

  return (
    <>
      <PageHeader kicker="Locations" title="Warehouses" sub="Each warehouse has its own stock. A customer order goes to the warehouse closest to the delivery location that can fill it."
        actions={<button className="dash-btn dash-btn-navy" onClick={() => setEdit({})}><Plus /> Add warehouse</button>} />

      {warehouses.length === 0 ? (
        <div className="dash-card"><EmptyState icon={Warehouse} title="No warehouses yet" body="Add the warehouse you ship from. You can add as many as you have." action={<button className="dash-btn dash-btn-navy" onClick={() => setEdit({})}><Plus /> Add warehouse</button>} /></div>
      ) : (
        <div className="grid sm:grid-cols-2 2xl:grid-cols-3 gap-4">
          {warehouses.map((w) => {
            const units = offers.reduce((s, o) => s + (Number(o.stock?.[w.id]) || 0), 0);
            const skus = offers.filter((o) => (o.stock?.[w.id] || 0) > 0).length;
            const open = jobs.filter((j) => j.warehouseId === w.id && OPEN_JOB.includes(j.status)).length;
            const loc = getLocation(w.locationId);
            return (
              <div key={w.id} className="dash-card p-5 flex flex-col">
                <div className="flex items-start gap-3">
                  <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${w.active ? 'bg-emerald text-white' : 'bg-navy/10 text-navy/40'}`}><Warehouse className="w-5 h-5" strokeWidth={1.8} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-navy text-[15px] truncate">{w.name}</p>
                    <p className="text-[12.5px] text-charcoal/60">{w.line1}{w.suburb ? `, ${w.suburb}` : ''} {w.postcode}</p>
                    <p className="text-[12px] text-emerald font-bold mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Serves {locationLabel(loc)} area</p>
                  </div>
                  {!w.active && <Pill meta={{ label: 'Inactive', cls: 'bg-sand text-charcoal/60' }} />}
                </div>
                <dl className="grid grid-cols-3 gap-2 mt-4 text-center">
                  {[['Units', units.toLocaleString()], ['SKUs', skus], ['Open orders', open]].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-ivory py-2.5"><dt className="text-[10px] font-extrabold uppercase tracking-[.14em] text-charcoal/50">{k}</dt><dd className="text-[16px] font-extrabold text-navy mt-0.5">{v}</dd></div>
                  ))}
                </dl>
                <div className="flex gap-2 mt-4 pt-4 border-t border-navy/5">
                  <button className="dash-btn dash-btn-ghost flex-1" onClick={() => setEdit(w)}><Pencil /> Edit</button>
                  <button className="dash-btn dash-btn-ghost flex-1" onClick={() => { saveWarehouse({ id: w.id, active: !w.active }); toast({ text: `${w.name} ${w.active ? 'paused — no new orders' : 'receiving orders again'}` }); }}><Power /> {w.active ? 'Pause' : 'Activate'}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} kicker={edit?.id ? 'Edit warehouse' : 'New warehouse'} title={edit?.id ? edit.name : 'Add a warehouse'} size="max-w-lg">
        {edit && <WarehouseForm initial={edit} onSave={save} onCancel={() => setEdit(null)} />}
      </Modal>
    </>
  );
}
