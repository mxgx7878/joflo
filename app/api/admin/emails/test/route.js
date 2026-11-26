import { route, body, str, EMAIL, fail } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { getSettings } from '@/lib/server/settings';
import { deliver, verifySmtp, smtpConfigured } from '@/lib/server/mail';
import { layout, toText, p, box } from '@/lib/server/emails';
import { appUrl } from '@/lib/server/payments';

/** GET → SMTP status (checks the login) · POST { to } → send a test email now. */
export const GET = route(async () => {
  await requireAdmin();
  const check = await verifySmtp();
  return { configured: smtpConfigured(), connected: check.ok, error: check.error || '', from: process.env.MAIL_FROM || process.env.SMTP_USER || '', adminTo: process.env.ADMIN_NOTIFY_EMAIL || '', appUrl: appUrl() };
});

export const POST = route(async (req) => {
  const admin = await requireAdmin();
  const to = str((await body(req)).to, 160) || admin.email;
  if (!EMAIL.test(to)) fail(400, 'Enter a valid email address.');
  if (!smtpConfigured()) fail(400, 'SMTP is not configured yet — add SMTP_HOST, SMTP_USER and SMTP_PASS to .env.');
  const settings = await getSettings();
  const html = layout({ title: 'Test email from your store', body: p('If you can read this, emails from the website are working.') + box('Order, quote and payment emails will be sent from this address.', 'success'), store: settings.store, appUrl: appUrl() });
  const [r] = await deliver({ to, subject: 'JOLOF TRADE CENTER — test email', html, text: toText(html), template: 'test' });
  if (r?.status !== 'sent') fail(502, `Could not send: ${r?.error || 'unknown error'}`);
  return { to };
});
