import { route } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { withState } from '@/lib/server/respond';
import { deleteDepartment } from '@/lib/server/catalogue';

export const DELETE = route(async (_req, { params }) => {
  await requireAdmin();
  await deleteDepartment((await params).id);
  return withState();
});
