'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Warehouse, Package, Truck, DollarSign, Mail, Phone, Building2, Plus, Pencil, MapPin, Check, Ban, RotateCcw } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { money, fmtDate, sizeLine } from '@/lib/format';
import { getLocation, locationLabel, fmtKm } from '@/lib/locations';
import { FUL_STATUS, FUL_SHORT } from '@/lib/fulfilment';
import { StatCard, Pill, Modal, Tabs, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Card, TableWrap, KV, Thumb, Initials, Skeleton, useConfirm } from '@/components/admin/common';
import { useSuppliers, SUPPLIER_STATUS } from '@/components/admin/suppliers';
import WarehouseForm from '@/components/vendor/WarehouseForm';

export default function VendorDetail() {
  const { id } = useParams();
  const ready = useStoreReady();
  const all = useSuppliers();
  const products = useStore((s) => s.products);
  const setUserStatus = useStore((s) => s.setUserStatus);
  const saveWarehouse = useStore((s) => s.saveWarehouse);
  const toast = useToast();
  const [ask, dialog] = useConfirm();
  const [tab, setTab] = useState('products');
  const [whEdit, setWhEdit] = useState(null);
  const row = all.find((r) => r.v.id === id);
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  if (!ready) return <Skeleton />;
  if (!row) return <EmptyState icon={Warehouse} title="Supplier not found" action={<Link href="/admin/vendors" className="dash-btn dash-btn-navy">Back to suppliers</Link>} />;
  const { v, warehouses, offers, jobs, units, open, value } = row;
  const house = v.type === 'house';

  const status = (st, msg) => { setUserStatus(v.id, st); toast({ text: msg }); };

  return (
    <>
      {dialog}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <Link href="/admin/vendors" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-charcoal/60 hover:text-navy"><ArrowLeft className="w-4 h-4" /> Suppliers</Link>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <h1 className="h-display text-navy text-[2rem]">{v.company}</h1>
            <Pill meta={SUPPLIER_STATUS[v.status]} />
          </div>
          <p className="text-[13px] text-charcoal/55 mt-1">{house ? 'JOLOF TRADING’s own warehouse stock' : `${v.businessType} · joined ${fmtDate(v.createdAt)}`}</p>
        </div>
        {!house && (
          <div className="flex flex-wrap gap-2">
            {v.status === 'pending' && <button className="dash-btn dash-btn-navy" onClick={() => status('active', `${v.company} approved — orders will now route to them`)}><Check /> Approve supplier</button>}
            {v.status === 'active' && <button className="dash-btn dash-btn-danger" onClick={() => ask({ title: `Suspend ${v.company}?`, body: 'New orders stop routing to their warehouses and their stock is hidden from the storefront. Shipments already assigned stay with them.', confirm: 'Suspend', danger: true }, () => status('suspended', `${v.company} suspended`))}><Ban /> Suspend</button>}
            {v.status === 'suspended' && <button className="dash-btn dash-btn-navy" onClick={() => status('active', `${v.company} reactivated`)}><RotateCcw /> Reactivate</button>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Warehouse} label="Warehouses" value={warehouses.length} hint={row.cities.join(', ') || 'None yet'} />
        <StatCard icon={Package} label="Products listed" value={offers.length} hint={`${units.toLocaleString()} units on hand`} tone="emerald" />
        <StatCard icon={Truck} label="Open shipments" value={open} hint={`${jobs.length} routed in total`} tone="gold" />
        <StatCard icon={DollarSign} label="Supply value" value={money(value)} hint="All routed orders, excl. cancelled" tone="ivory" />
      </div>

      <div className="mt-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5">
        <Card pad={false}>
          <div className="p-4 sm:p-5 border-b border-navy/5">
            <Tabs value={tab} onChange={setTab} tabs={[{ value: 'products', label: 'Products', count: offers.length }, { value: 'orders', label: 'Routed orders', count: jobs.length }]} />
          </div>
          {tab === 'products' ? (offers.length === 0 ? <EmptyState icon={Package} title="No products listed" body="The supplier adds catalogue products from their portal." /> : (
            <TableWrap>
              <table className="dash-table">
                <thead><tr><th>Product</th><th>Supply price</th><th>Stock by warehouse</th><th className="text-center">Total</th></tr></thead>
                <tbody>
                  {offers.map((o) => { const p = byId[o.productId]; if (!p) return null; const n = Object.values(o.stock || {}).reduce((s, x) => s + (Number(x) || 0), 0); return (
                    <tr key={o.id}>
                      <td className="min-w-[220px]"><div className="flex items-center gap-3"><Thumb p={p} size="w-9 h-9" /><div className="min-w-0"><p className="font-bold text-navy truncate max-w-[220px]">{p.name}</p><p className="text-[11.5px] text-charcoal/50 truncate">{sizeLine(p)}</p></div></div></td>
                      <td className="whitespace-nowrap">{typeof o.cost === 'number' ? <b className="text-navy">{money(o.cost)}</b> : <span className="text-charcoal/45">Per order</span>}{typeof p.price === 'number' && typeof o.cost === 'number' && <span className="block text-[11px] text-emerald font-bold">{Math.round((1 - o.cost / p.price) * 100)}% margin</span>}</td>
                      <td><div className="flex flex-wrap gap-1.5">{warehouses.map((w) => <span key={w.id} className={`pill ${(o.stock?.[w.id] || 0) > 0 ? 'bg-ivory text-navy border border-navy/10' : 'bg-[#F8E7E3] text-[#B4432F]'}`}>{getLocation(w.locationId)?.city}: {o.stock?.[w.id] || 0}</span>)}</div>{o.status === 'paused' && <span className="text-[11px] font-bold text-charcoal/50">Paused by supplier</span>}</td>
                      <td className="text-center font-extrabold text-navy">{n}</td>
                    </tr>
                  ); })}
                </tbody>
              </table>
            </TableWrap>
          )) : (jobs.length === 0 ? <EmptyState icon={Truck} title="No orders routed yet" /> : (
            <TableWrap>
              <table className="dash-table">
                <thead><tr><th>Order</th><th>Date</th><th>From → to</th><th>Units</th><th>Status</th><th className="text-right">Supply value</th></tr></thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.order.id + j.key}>
                      <td><Link href={`/admin/orders/${j.order.id}`} className="font-bold text-navy hover:text-emerald">{j.order.id}</Link></td>
                      <td className="whitespace-nowrap text-charcoal/70">{fmtDate(j.order.createdAt)}</td>
                      <td className="whitespace-nowrap text-charcoal/70">{getLocation(warehouses.find((w) => w.id === j.warehouseId)?.locationId)?.city} → {j.order.location?.city || '—'} <span className="text-charcoal/45">({fmtKm(j.distanceKm)})</span></td>
                      <td className="text-charcoal/70">{j.units}</td>
                      <td><Pill meta={FUL_STATUS[j.status]}>{FUL_SHORT[j.status]}</Pill></td>
                      <td className="text-right font-bold text-navy">{money(j.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          ))}
        </Card>

        <div className="space-y-5">
          <Card title="Contact">
            <div className="flex items-center gap-3 mb-3"><Initials name={v.name} className="w-11 h-11 text-[13px]" /><div><p className="font-bold text-navy">{v.name}</p><p className="text-[12px] text-charcoal/55">{v.businessType}</p></div></div>
            <div className="space-y-1.5 text-[13px] text-charcoal/75">
              <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-navy/40" />{v.email}</p>
              {v.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-navy/40" />{v.phone}</p>}
              {v.abn && v.abn !== '—' && <p className="flex items-center gap-2"><Building2 className="w-4 h-4 text-navy/40" />EIN {v.abn}</p>}
            </div>
          </Card>
          <Card title="Warehouses" action={<button className="dash-btn dash-btn-ghost !h-8 !px-3" onClick={() => setWhEdit({})}><Plus /> Add</button>}>
            {warehouses.length === 0 ? <p className="text-[13px] text-charcoal/55">No warehouses yet.</p> : (
              <ul className="space-y-2.5">
                {warehouses.map((w) => (
                  <li key={w.id} className="rounded-xl bg-ivory px-3 py-2.5 flex items-start gap-3">
                    <Warehouse className={`w-4 h-4 mt-1 shrink-0 ${w.active ? 'text-emerald' : 'text-navy/30'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-bold text-navy truncate">{w.name}</p>
                      <p className="text-[11.5px] text-charcoal/55">{w.line1}{w.suburb ? `, ${w.suburb}` : ''} {w.postcode}</p>
                      <p className="text-[11.5px] text-emerald font-bold flex items-center gap-1"><MapPin className="w-3 h-3" />{locationLabel(getLocation(w.locationId))}{!w.active && <span className="text-charcoal/45"> · paused</span>}</p>
                    </div>
                    <button className="icon-btn !w-8 !h-8" aria-label={`Edit ${w.name}`} onClick={() => setWhEdit(w)}><Pencil className="w-4 h-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Routing">
            <KV k="Receives orders" v={v.status === 'active' ? 'Yes' : 'No'} />
            <p className="text-[12px] text-charcoal/55 mt-2">An order goes to the nearest active warehouse that can fill all of it. If nobody can, each item goes to the nearest warehouse holding it.</p>
          </Card>
        </div>
      </div>

      <Modal open={!!whEdit} onClose={() => setWhEdit(null)} kicker={v.company} title={whEdit?.id ? 'Edit warehouse' : 'Add warehouse'} size="max-w-lg">
        {whEdit && <WarehouseForm initial={whEdit} onCancel={() => setWhEdit(null)} onSave={(w) => { saveWarehouse({ ...w, vendorId: v.id }); toast({ text: `${w.name} saved` }); setWhEdit(null); }} />}
      </Modal>
    </>
  );
}
