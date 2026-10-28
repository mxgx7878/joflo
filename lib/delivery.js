// Delivery fee rule (shared by server + admin settings preview).
// fee = max(minFee, baseFee + miles / perMiles × amount), per shipment (one warehouse = one shipment).
// freeOver > 0 → orders whose subtotal reaches it ship free.

export const DEFAULT_DELIVERY = { amount: 20, perMiles: 100, baseFee: 10, minFee: 15, freeOver: 0 };

export function deliveryFee(miles, cfg = DEFAULT_DELIVERY) {
  const c = { ...DEFAULT_DELIVERY, ...(cfg || {}) };
  if (miles == null || Number.isNaN(Number(miles))) return 0;
  const per = Number(c.perMiles) > 0 ? Number(c.perMiles) : 100;
  const raw = (Number(c.baseFee) || 0) + (Number(miles) / per) * (Number(c.amount) || 0);
  return Math.round(Math.max(Number(c.minFee) || 0, raw) * 100) / 100;
}

/** Total for an order: sum of each shipment's fee, or 0 when the free-delivery threshold is met. */
export function orderDeliveryFee(shipmentMiles, subtotal, cfg = DEFAULT_DELIVERY) {
  const c = { ...DEFAULT_DELIVERY, ...(cfg || {}) };
  if (Number(c.freeOver) > 0 && subtotal >= Number(c.freeOver)) return 0;
  return Math.round(shipmentMiles.reduce((s, mi) => s + deliveryFee(mi, c), 0) * 100) / 100;
}

/** "$25.00 per 100 miles" */
export const rateLabel = (cfg = DEFAULT_DELIVERY) => {
  const c = { ...DEFAULT_DELIVERY, ...(cfg || {}) };
  const amt = Number(c.amount) < 1 ? `${Math.round(Number(c.amount) * 100)}¢` : `$${Number(c.amount).toFixed(2)}`;
  return `${amt} per ${Number(c.perMiles)} mile${Number(c.perMiles) === 1 ? '' : 's'}`;
};
