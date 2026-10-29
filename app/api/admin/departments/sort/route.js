import { route, body, fail } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { withState } from '@/lib/server/respond';
import { sortDepartments } from '@/lib/server/catalogue';

/** Body: { ids: [departmentId, …] } in display order. */
export const POST = route(async (req) => {
  await requireAdmin();
  const { ids } = await body(req);
  if (!Array.isArray(ids) || !ids.length) fail(400, 'Nothing to sort.');
  await sortDepartments(ids.map(String));
  return withState();
});
