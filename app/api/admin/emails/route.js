import { route, str } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { prisma } from '@/lib/server/db';
import { smtpConfigured } from '@/lib/server/mail';

/** Email log for admins. ?orderId= / ?inquiryId= / ?status= filter, ?take= (max 300). */
export const GET = route(async (req) => {
  await requireAdmin();
  const q = new URL(req.url).searchParams;
  const where = {};
  if (q.get('orderId')) where.orderId = str(q.get('orderId'), 40);
  if (q.get('inquiryId')) where.inquiryId = str(q.get('inquiryId'), 40);
  if (q.get('status')) where.status = str(q.get('status'), 20);
  const rows = await prisma.emailLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: Math.min(300, Math.max(1, parseInt(q.get('take'), 10) || 100)), select: { id: true, to: true, subject: true, template: true, status: true, error: true, orderId: true, inquiryId: true, createdAt: true, sentAt: true } });
  return { smtp: smtpConfigured(), emails: rows };
});
