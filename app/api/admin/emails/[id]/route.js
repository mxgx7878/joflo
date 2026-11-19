import { route, fail } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { prisma } from '@/lib/server/db';
import { resendEmail } from '@/lib/server/mail';

/** GET the full email (to preview it) · POST to send it again. */
export const GET = route(async (_req, { params }) => {
  await requireAdmin();
  const e = await prisma.emailLog.findUnique({ where: { id: (await params).id } });
  if (!e) fail(404, 'Email not found.');
  return { email: e };
});

export const POST = route(async (_req, { params }) => {
  await requireAdmin();
  await resendEmail((await params).id);
  return {};
});
