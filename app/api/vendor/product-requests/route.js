import { route, body } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { createProductRequest } from '@/lib/server/catalogue';
import { withState } from '@/lib/server/respond';

/** Supplier proposes a new product → admin approval → master catalogue. */
export const POST = route(async (req) => {
  const u = await requireUser('vendor');
  const id = await createProductRequest(await body(req), u);
  return withState({ id });
});
