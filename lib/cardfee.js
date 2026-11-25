// Card processing fee passed on to the customer (Square charges 2.6% + $0.15 per card payment).
// Shared by the browser (checkout / pay page preview) and the server (the amount actually charged).
//
// The fee is "grossed up" so that after Square takes its cut JOLOF still receives the full order
// amount:  charged = (amount + fixed) / (1 − percent)  →  fee = charged − amount.
// e.g. a $100.00 order is charged $102.82; Square keeps 2.6% × 102.82 + 0.15 = $2.82.

export const DEFAULT_CARD_FEE = { pass: true, percent: 2.6, fixed: 0.15 };

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Normalise the stored setting (settings.payments.cardFee). */
export function cardFeeConfig(cfg) {
  const c = { ...DEFAULT_CARD_FEE, ...(cfg || {}) };
  const percent = Math.min(20, Math.max(0, Number(c.percent) || 0));
  const fixed = Math.min(50, Math.max(0, Number(c.fixed) || 0));
  return { pass: c.pass !== false && (percent > 0 || fixed > 0), percent, fixed };
}

/** Fee to add on top of `amount` when it is paid by card. 0 when passing the fee on is switched off. */
export function cardFeeFor(amount, cfg) {
  const c = cardFeeConfig(cfg);
  const base = r2(amount);
  if (!c.pass || !(base > 0)) return 0;
  return r2((base + c.fixed) / (1 - c.percent / 100) - base);
}

/** "2.6% + $0.15" */
export function cardFeeLabel(cfg) {
  const c = cardFeeConfig(cfg);
  const parts = [];
  if (c.percent) parts.push(`${c.percent}%`);
  if (c.fixed) parts.push(`$${c.fixed.toFixed(2)}`);
  return parts.join(' + ');
}
