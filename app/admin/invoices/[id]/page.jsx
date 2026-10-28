'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { EmptyState } from '@/components/ui';
import { Skeleton } from '@/components/admin/common';
import InvoiceView from '@/components/InvoiceView';

export default function AdminInvoice() {
  const { id } = useParams();
  const ready = useStoreReady();
  const invoice = useStore((s) => s.invoices.find((v) => v.id === id));
  if (!ready) return <Skeleton />;
  if (!invoice) return <EmptyState icon={FileText} title="Invoice not found" body={`We couldn't find ${id}.`} action={<Link href="/admin/orders" className="dash-btn dash-btn-navy">Back to orders</Link>} />;
  return <InvoiceView invoice={invoice} back={<Link href={`/admin/orders/${invoice.orderId}`} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-charcoal/60 hover:text-navy"><ArrowLeft className="w-4 h-4" /> Order {invoice.orderId}</Link>} />;
}
