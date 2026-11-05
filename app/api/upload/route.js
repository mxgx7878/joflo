// POST /api/upload — multipart form: file=<image>, folder=products|departments|commodities|product-requests
// Admins and suppliers only. Returns { ok, url }.
import { route, fail } from '@/lib/server/http';
import { requireUser, actorName } from '@/lib/server/auth';
import { uploadImage } from '@/lib/server/storage';

export const runtime = 'nodejs';

export const POST = route(async (req) => {
  const user = await requireUser('admin', 'vendor');
  let form;
  try { form = await req.formData(); } catch { fail(400, 'Send the image as multipart form data.'); }
  const folder = String(form.get('folder') || 'products');
  // suppliers can only upload pictures for their own product requests
  if (user.role === 'vendor' && folder !== 'product-requests') fail(403, 'You do not have access to this.');
  const { url } = await uploadImage(form.get('file'), folder, actorName(user));
  return { url };
});
