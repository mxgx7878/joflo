import { prisma } from './db';
import { DEFAULT_DELIVERY } from '../delivery';

export const DEFAULT_SETTINGS = {
  showPricing: true, // false → every product is "price on request" for shoppers
  delivery: DEFAULT_DELIVERY,
  routing: { jolofFirstMaxMiles: 0 }, // 0 = JOLOF stock first regardless of distance
  invoice: {
    dueDays: 7,
    payTo: 'Bank transfer (ACH / wire) to JOLOF TRADING LLC.',
    footer: 'Thank you for trading with JOLOF TRADING.',
  },
  store: { name: 'JOLOF TRADING', email: 'sales@joloftrading.com', phone: '+1 (973) 555-1100', address: '40 Doremus Ave, Newark, NJ 07105' },
};

export async function getSettings() {
  const rows = await prisma.setting.findMany();
  const out = structuredClone(DEFAULT_SETTINGS);
  rows.forEach((r) => {
    out[r.key] = r.value && typeof r.value === 'object' && !Array.isArray(r.value) && typeof out[r.key] === 'object' ? { ...out[r.key], ...r.value } : r.value;
  });
  return out;
}

export async function saveSetting(key, value) {
  await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

/** Next sequential number for JT-/INQ-/INV- ids. */
export async function nextNumber(tx, key, start) {
  const c = await tx.counter.upsert({ where: { key }, create: { key, value: start }, update: { value: { increment: 1 } } });
  return c.value;
}
