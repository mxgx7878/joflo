import { route, body } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { withState } from '@/lib/server/respond';
import { saveDepartment } from '@/lib/server/catalogue';

/** Create or update a department (send id to update). */
export const POST = route(async (req) => {
  await requireAdmin();
  const id = await saveDepartment(await body(req));
  return withState({ id });
});
