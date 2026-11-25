import { prisma } from './db';
import { DEFAULT_DELIVERY } from '../delivery';
import { DEFAULT_CARD_FEE } from '../cardfee';

export const DEFAULT_SETTINGS = {
  showPricing: true, // false → every product is "price on request" for shoppers
  delivery: DEFAULT_DELIVERY,
  routing: { jolofFirstMaxMiles: 0 }, // 0 = JOLOF stock first regardless of distance
  // checkout options (card also needs the Square keys in .env). 'cod' = cash / check on delivery (one option);
  // 'check' is only kept for older orders. cardFee = Square's fee passed on to card payers (lib/cardfee.js).
  payments: { card: true, cod: true, cardFee: DEFAULT_CARD_FEE },
  invoice: {
    dueDays: 7,
    payTo: 'Cash / check on delivery — please have the full amount ready for our driver when your order arrives, in cash or as a check made payable to JOLOF TRADING.',
    checkNote: 'Check on delivery — please have a check for the full amount, made payable to JOLOF TRADING, ready for our driver when your order arrives.',
    footer: 'Thank you for trading with JOLOF TRADING.',
  },
  store: { name: 'JOLOF TRADING', email: 'sales@joloftrading.com', phone: '+1 (347) 840-3858', address: '1186 Randall Ave, Bronx, NY 10474' },
};

const OLD_PAY_TO = ['Cash on delivery — please have the full amount ready in cash for our driver when your order arrives.'];

export async function getSettings() {
  const rows = await prisma.setting.findMany();
  const out = structuredClone(DEFAULT_SETTINGS);
  rows.forEach((r) => {
    out[r.key] = r.value && typeof r.value === 'object' && !Array.isArray(r.value) && typeof out[r.key] === 'object' ? { ...out[r.key], ...r.value } : r.value;
  });
  // cash and check are one checkout option now ("Cash / check on delivery") — upgrade the old cash-only wording
  if (!out.invoice?.payTo || OLD_PAY_TO.includes(String(out.invoice.payTo).trim())) out.invoice = { ...out.invoice, payTo: DEFAULT_SETTINGS.invoice.payTo };
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
