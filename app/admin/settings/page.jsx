'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, RotateCcw, Store, Mail, Tag, Route, FileText, MapPinned, Save } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { money, fmtDate } from '@/lib/format';
import { deliveryFee, rateLabel } from '@/lib/delivery';
import { PageHeader, Field } from '@/components/ui';
import { useToast } from '@/components/Providers';
import { Card, Skeleton, Toggle, useConfirm } from '@/components/admin/common';

const EXAMPLES = [25, 100, 250, 500, 1000];

export default function SettingsPage() {
  const ready = useStoreReady();
  const settings = useStore((s) => s.settings);
  const subscribers = useStore((s) => s.subscribers);
  const saveSettings = useStore((s) => s.saveSettings);
  const resetDemo = useStore((s) => s.resetDemo);
  const router = useRouter();
  const toast = useToast();
  const [ask, dialog] = useConfirm();
  const [d, setD] = useState(null);
  const [routing, setRouting] = useState({ jolofFirstMaxMiles: 0 });
  const [inv, setInv] = useState({ dueDays: 7, payTo: '', footer: '' });
  const [store, setStore] = useState({ name: '', email: '', phone: '', address: '' });

  useEffect(() => {
    if (!ready) return;
    setD({ ...settings.delivery });
    setRouting({ jolofFirstMaxMiles: settings.routing?.jolofFirstMaxMiles || 0 });
    setInv({ dueDays: 7, payTo: '', footer: '', ...settings.invoice });
    setStore({ name: '', email: '', phone: '', address: '', ...settings.store });
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready || !d) return <Skeleton />;

  const exportCsv = () => {
    const csv = 'email,subscribed_at\n' + subscribers.map((s) => `${s.email},${s.at}`).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'jolof-newsletter-subscribers.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const save = async (patch, msg) => { const r = await saveSettings(patch); if (r.ok) toast({ text: msg }); };
  const num = (k) => (e) => setD({ ...d, [k]: e.target.value });

  return (
    <>
      {dialog}
      <PageHeader kicker="Settings" title="Store settings" sub="Pricing visibility, delivery charges by distance, order routing and invoice details." />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card title="Storefront pricing" action={<Tag className="w-4 h-4 text-gold" />}>
          <Toggle label="Show prices on the website" checked={settings.showPricing !== false} onChange={(v) => save({ showPricing: v }, v ? 'Prices are now visible — priced products can be ordered online' : 'Prices hidden — every product now goes through inquiry')} />
          <p className="text-[12.5px] text-charcoal/60 mt-2 leading-relaxed">
            <b className="text-navy">On:</b> products with a price show it and can be added to cart → order request (no payment) → you confirm and the invoice is issued. Products without a price stay “Inquire now”.<br />
            <b className="text-navy">Off:</b> no prices anywhere on the site; everything goes to Inquiries. Customers see pricing only in the quote you send them, and the invoice after they accept.
          </p>
        </Card>

        <Card title="Delivery charges" action={<Route className="w-4 h-4 text-gold" />}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Charge ($)" hint="Use 0.50 for 50¢"><input type="number" min="0" step="0.01" className="dash-input" value={d.amount} onChange={num('amount')} /></Field>
            <Field label="Per how many miles"><input type="number" min="1" step="1" className="dash-input" value={d.perMiles} onChange={num('perMiles')} /></Field>
            <Field label="Base fee per shipment ($)"><input type="number" min="0" step="0.01" className="dash-input" value={d.baseFee} onChange={num('baseFee')} /></Field>
            <Field label="Minimum per shipment ($)"><input type="number" min="0" step="0.01" className="dash-input" value={d.minFee} onChange={num('minFee')} /></Field>
            <Field label="Free delivery from ($ subtotal)" hint="0 = never free" className="col-span-2"><input type="number" min="0" step="1" className="dash-input" value={d.freeOver} onChange={num('freeOver')} /></Field>
          </div>
          <div className="mt-4 rounded-xl bg-ivory p-3.5">
            <p className="text-[12px] font-bold text-navy mb-2">{rateLabel(d)}{Number(d.baseFee) ? ` + ${money(Number(d.baseFee))} base` : ''} — examples per shipment</p>
            <div className="grid grid-cols-5 gap-2 text-center">
              {EXAMPLES.map((mi) => <div key={mi} className="rounded-lg bg-white border border-navy/5 py-2"><p className="text-[11px] text-charcoal/55">{mi} mi</p><p className="text-[13px] font-extrabold text-navy">{money(deliveryFee(mi, d))}</p></div>)}
            </div>
          </div>
          <p className="text-[12px] text-charcoal/55 mt-3">Miles are road distance from the shipping warehouse to the customer&apos;s address (Google Maps). Split orders are charged per shipment.</p>
          <button className="dash-btn dash-btn-navy w-full mt-4" onClick={() => save({ delivery: d }, 'Delivery charges saved — new orders and estimates use them')}><Save /> Save delivery charges</button>
        </Card>

        <Card title="Order routing" action={<MapPinned className="w-4 h-4 text-gold" />}>
          <ol className="text-[13px] text-charcoal/70 space-y-1.5 list-decimal pl-5">
            <li>Anything JOLOF&apos;s own warehouses hold goes to JOLOF first.</li>
            <li>The rest goes to the nearest approved supplier warehouse with enough stock.</li>
            <li>Lines nobody can fill are flagged “Needs a supplier” for you to assign.</li>
          </ol>
          <Field label="Limit “JOLOF first” to JOLOF warehouses within (miles)" hint="0 = JOLOF first regardless of distance. Example: 600 → a far-away JOLOF warehouse loses to a nearby supplier." className="mt-4">
            <input type="number" min="0" step="10" className="dash-input" value={routing.jolofFirstMaxMiles} onChange={(e) => setRouting({ jolofFirstMaxMiles: e.target.value })} />
          </Field>
          <button className="dash-btn dash-btn-ghost w-full mt-3" onClick={() => save({ routing }, 'Routing rule saved')}><Save /> Save routing rule</button>
          <p className={`mt-4 text-[12.5px] rounded-xl px-3.5 py-2.5 ${settings.mapsEnabled ? 'bg-[#E3F2EA] text-emerald' : 'bg-gold-pale text-[#6d4f12]'}`}>
            {settings.mapsEnabled ? 'Google Maps is connected — addresses are geocoded and distances are road miles.' : 'Google Maps key not set — distances are estimated (straight line × 1.2). Add GOOGLE_MAPS_API_KEY on the server.'}
          </p>
        </Card>

        <Card title="Invoices" action={<FileText className="w-4 h-4 text-gold" />}>
          <Field label="Payment due (days after issue)"><input type="number" min="0" className="dash-input" value={inv.dueDays} onChange={(e) => setInv({ ...inv, dueDays: e.target.value })} /></Field>
          <Field label="Payment instructions (printed on every invoice)" className="mt-4"><textarea rows={3} className="dash-input" value={inv.payTo} onChange={(e) => setInv({ ...inv, payTo: e.target.value })} placeholder="Bank name, routing and account number…" /></Field>
          <Field label="Footer" className="mt-4"><input className="dash-input" value={inv.footer} onChange={(e) => setInv({ ...inv, footer: e.target.value })} /></Field>
          <button className="dash-btn dash-btn-ghost w-full mt-4" onClick={() => save({ invoice: inv }, 'Invoice details saved')}><Save /> Save invoice details</button>
        </Card>

        <Card title="Store details" action={<Store className="w-4 h-4 text-gold" />}>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Store name"><input className="dash-input" value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} /></Field>
            <Field label="Contact email"><input className="dash-input" value={store.email} onChange={(e) => setStore({ ...store, email: e.target.value })} /></Field>
            <Field label="Phone"><input className="dash-input" value={store.phone} onChange={(e) => setStore({ ...store, phone: e.target.value })} /></Field>
            <Field label="Address (on invoices)"><input className="dash-input" value={store.address} onChange={(e) => setStore({ ...store, address: e.target.value })} /></Field>
          </div>
          <button className="dash-btn dash-btn-ghost w-full mt-4" onClick={() => save({ store }, 'Store details saved')}><Save /> Save store details</button>
        </Card>

        <Card title={`Newsletter subscribers (${subscribers.length})`} action={<button className="dash-btn dash-btn-ghost !h-8" onClick={exportCsv} disabled={!subscribers.length}><Download /> Export CSV</button>}>
          <ul className="max-h-[260px] overflow-y-auto -mx-1">
            {subscribers.map((s) => (
              <li key={s.email} className="flex items-center gap-3 px-1 py-2 border-b border-navy/5 last:border-0 text-[13.5px]">
                <Mail className="w-4 h-4 text-navy/35" /><span className="flex-1 text-navy font-semibold truncate">{s.email}</span><span className="text-[12px] text-charcoal/50">{fmtDate(s.at)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Demo data" className="xl:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <p className="text-[13.5px] text-charcoal/65 max-w-2xl">Reload the database with the starter catalogue, demo suppliers, warehouses, drivers, orders and inquiries. Everything else is deleted. (Disabled in production unless ALLOW_DEMO_RESET=true.)</p>
            <button className="dash-btn dash-btn-danger shrink-0" onClick={() => ask({ title: 'Reset all data?', body: 'All orders, quotes, products, stock and accounts are replaced with the demo data.', confirm: 'Reset data', danger: true }, async () => { const r = await resetDemo(); if (r.ok) { toast({ text: 'Demo data restored' }); router.replace('/admin'); } })}>
              <RotateCcw /> Reset demo data
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}
