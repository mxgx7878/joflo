import { route, body, str } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { withState } from '@/lib/server/respond';
import { saveSetting } from '@/lib/server/settings';

export const PUT = route(async (req, ctx) => {
  const admin = await requireAdmin();
  const d = ['GET', 'DELETE'].includes(req.method) ? {} : await body(req);
  const id = ctx?.params ? (await ctx.params).id : undefined;
  if (d.showPricing !== undefined) await saveSetting('showPricing', !!d.showPricing);
  if (d.delivery) {
    const n = (v, min = 0) => Math.max(min, Number(v) || 0);
    const c = d.delivery;
    if (!(Number(c.perMiles) > 0)) return { ok: false, error: 'Miles must be more than 0.' };
    await saveSetting('delivery', { amount: n(c.amount), perMiles: n(c.perMiles, 1), baseFee: n(c.baseFee), minFee: n(c.minFee), freeOver: n(c.freeOver) });
  }
  if (d.routing) await saveSetting('routing', { jolofFirstMaxMiles: Math.max(0, parseInt(d.routing.jolofFirstMaxMiles, 10) || 0) });
  if (d.invoice) await saveSetting('invoice', { dueDays: Math.max(0, parseInt(d.invoice.dueDays, 10) || 0), payTo: str(d.invoice.payTo, 600), footer: str(d.invoice.footer, 300) });
  if (d.store) await saveSetting('store', { name: str(d.store.name, 80), email: str(d.store.email, 120), phone: str(d.store.phone, 40), address: str(d.store.address, 200) });
  return withState();
});
