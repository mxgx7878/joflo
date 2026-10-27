'use client';
import { useRouter } from 'next/navigation';
import { Download, RotateCcw, Store, Mail } from 'lucide-react';
import { useStore, useStoreReady, SHIPPING_FLAT, FREE_SHIPPING_FROM } from '@/lib/store';
import { money, fmtDate } from '@/lib/format';
import { PageHeader } from '@/components/ui';
import { Card, KV, Skeleton, useConfirm } from '@/components/admin/common';

export default function SettingsPage() {
  const ready = useStoreReady();
  const subscribers = useStore((s) => s.subscribers);
  const resetDemo = useStore((s) => s.resetDemo);
  const router = useRouter();
  const [ask, dialog] = useConfirm();

  if (!ready) return <Skeleton />;

  const exportCsv = () => {
    const csv = 'email,subscribed_at\n' + subscribers.map((s) => `${s.email},${s.at}`).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'jolof-newsletter-subscribers.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      {dialog}
      <PageHeader kicker="Settings" title="Store settings" sub="Basic store details for the demo. Payment gateway, email delivery and shipping zones connect when the backend is built." />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card title="Store details" action={<Store className="w-4 h-4 text-gold" />}>
          <KV k="Store name" v="JOLOF TRADING" />
          <KV k="Contact email" v="sales@joloftrading.com" />
          <KV k="Currency" v="USD ($)" />
          <KV k="Departments" v="Food · Cosmetics · Trading" />
          <KV k="Flat shipping" v={`${money(SHIPPING_FLAT)} · free over ${money(FREE_SHIPPING_FROM)}`} />
          <KV k="Payment methods" v="Bank transfer · Pay on delivery · Card (demo)" />
          <KV k="Retailer accounts" v="Require admin approval" />
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
            <p className="text-[13.5px] text-charcoal/65 max-w-2xl">This preview keeps everything in your browser. Reset to restore the original products, orders, inquiries and demo accounts. You will be signed out.</p>
            <button className="dash-btn dash-btn-danger shrink-0" onClick={() => ask({ title: 'Reset all demo data?', body: 'All changes (new orders, quotes, products, stock) will be lost and you will be signed out.', confirm: 'Reset demo', danger: true }, () => { resetDemo(); router.replace('/login'); })}>
              <RotateCcw /> Reset demo data
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}
