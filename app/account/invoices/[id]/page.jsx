'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '@/lib/store';
import { EmptyState } from '@/components/ui';
import InvoiceView from '@/components/InvoiceView';

export default function CustomerInvoice() {
  const { id } = useParams();
  const invoice = useStore((s) => s.invoices.find((v) => v.id === id));
  if (!invoice) return <div className="dash-card"><EmptyState title="Invoice not found" body="It may not be issued yet — invoices appear once JOLOF TRADING confirms your order." action={<Link href="/account/orders" className="dash-btn dash-btn-navy">My orders</Link>} /></div>;
  return <InvoiceView invoice={invoice} back={<Link href={`/account/orders/${invoice.orderId}`} className="inline-flex items-center gap-2 text-[13px] font-bold text-navy hover:text-emerald"><ArrowLeft className="w-4 h-4" />Order {invoice.orderId}</Link>} />;
}
