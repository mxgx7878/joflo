import AdminShell from '@/components/admin/AdminShell';

export const metadata = { title: 'Admin | JOLOF TRADING' };

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
