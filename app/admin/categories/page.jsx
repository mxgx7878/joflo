import { redirect } from 'next/navigation';

// Categories now live under their department.
export default function CategoriesRedirect() {
  redirect('/admin/departments');
}
