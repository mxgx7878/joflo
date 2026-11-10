'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { useStore, useStoreReady } from '@/lib/store';
import { EmptyState } from '@/components/ui';
import { Skeleton } from '@/components/admin/common';
import DriverSlip from '@/components/admin/DriverSlip';

export default function AdminDriverSlip() {
  const { id } = useParams();
  const ready = useStoreReady();
  const order = useStore((s) => s.orders.find((o) => o.id === id));
  if (!ready) return <Skeleton />;
  if (!order) return <EmptyState icon={FileText} title="Order not found" body={`We couldn't find ${id}.`} action={<Link href="/admin/orders" className="dash-btn dash-btn-navy">Back to orders</Link>} />;
  return <DriverSlip order={order} back={<Link href={`/admin/orders/${order.id}`} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-charcoal/60 hover:text-navy"><ArrowLeft className="w-4 h-4" /> Order {order.id}</Link>} />;
}
