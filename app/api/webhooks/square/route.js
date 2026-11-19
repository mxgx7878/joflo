import { WebhooksHelper } from 'square';
import { syncOrderPayment } from '@/lib/server/orders';

/**
 * Square webhook → keeps card payments in step when something changes outside the website
 * (a refund made in Square Dashboard, a refund finishing, an old hold expiring).
 *
 * Register in Square Developer Console > Webhooks > Subscriptions:
 *   URL:    the exact value of SQUARE_WEBHOOK_URL (e.g. https://joloftradescenter.com/api/webhooks/square)
 *   Events: payment.created, payment.updated, refund.created, refund.updated
 * Then put the subscription's signature key in SQUARE_WEBHOOK_SIGNATURE_KEY.
 */
export async function POST(req) {
  const raw = await req.text();
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const url = process.env.SQUARE_WEBHOOK_URL;
  if (!key || !url) return new Response('Webhook not configured', { status: 503 });

  const ok = await WebhooksHelper.verifySignature({
    requestBody: raw,
    signatureHeader: req.headers.get('x-square-hmacsha256-signature') || '',
    signatureKey: key,
    notificationUrl: url,
  }).catch(() => false);
  if (!ok) return new Response('Invalid signature', { status: 403 });

  let event;
  try { event = JSON.parse(raw); } catch { return new Response('Bad JSON', { status: 400 }); }

  const obj = event?.data?.object || {};
  const paymentId = obj.payment?.id || obj.refund?.payment_id || null;
  if (paymentId && /^(payment|refund)\./.test(event.type || '')) {
    try {
      await syncOrderPayment(paymentId, 'Square');
    } catch (e) {
      console.error('[square webhook]', event.type, paymentId, e);
      return new Response('Retry later', { status: 500 }); // Square retries failed deliveries
    }
  }
  return new Response('ok', { status: 200 });
}
